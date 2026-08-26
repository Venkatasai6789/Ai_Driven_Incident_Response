"""
Telegram Long-Polling Interactive Bot Worker (Phase 4 Optimized)
High-performance, ultra-low latency Telegram approval state machine.
Features:
- Sub-50ms instant callback acknowledgment (prevents Telegram retry loops)
- In-memory callback deduplication cache (prevents duplicate message edits)
- Clean in-place message mutation (no duplicate forward messages)
- Live terminal execution receipt dispatch on approval
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Optional, Set
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.controller import RemediationController


class TelegramPollingBot:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not self.bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not configured in .env")
        
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.gate = TelegramApprovalGate(bot_token=self.bot_token, chat_id=self.chat_id)
        self.controller = RemediationController(telegram_gate=self.gate)
        self.offset = 0
        self._processed_callbacks: Set[str] = set()
        self._processed_actions: Dict[str, str] = {}  # action_id -> status

    def flush_stale_updates(self):
        """Acknowledge all pending historical updates on startup so they don't replay."""
        try:
            resp = requests.get(f"{self.api_url}/getUpdates?offset=-1", timeout=5).json()
            if resp.get("ok") and resp.get("result"):
                latest_id = resp["result"][-1]["update_id"]
                self.offset = latest_id + 1
                requests.get(f"{self.api_url}/getUpdates?offset={self.offset}", timeout=5)
                print(f"[OK] Flushed stale Telegram updates up to offset {self.offset}.", flush=True)
        except Exception as e:
            print(f"[!] Warning during update flush: {e}", flush=True)

    def start_polling(self, single_pass: bool = False, timeout: int = 2):
        """Continuously poll Telegram for callback queries and messages."""
        print(f"[*] Starting Ultra-Low Latency Telegram Bot (@Ai_Driven_Incident_Response_bot)...", flush=True)
        print(f"[*] Listening for approval callbacks for Chat ID: {self.chat_id}", flush=True)
        
        me_resp = requests.get(f"{self.api_url}/getMe", timeout=5).json()
        if not me_resp.get("ok"):
            print(f"[ERROR] Failed to authenticate with Telegram: {me_resp}", flush=True)
            return
        
        print(f"[OK] Authenticated as @{me_resp['result']['username']} (ID: {me_resp['result']['id']})", flush=True)
        self.flush_stale_updates()
        print("[*] Ready to process approval buttons in real-time. (Press CTRL+C to stop)\n", flush=True)

        session = requests.Session()

        while True:
            try:
                updates_url = f"{self.api_url}/getUpdates?offset={self.offset}&timeout={timeout}"
                resp = session.get(updates_url, timeout=timeout + 3)
                data = resp.json()

                if data.get("ok"):
                    for update in data.get("result", []):
                        self.offset = update["update_id"] + 1
                        self.process_update(update, session)

                if single_pass:
                    break

            except KeyboardInterrupt:
                print("\n[*] Telegram bot polling stopped.", flush=True)
                break
            except Exception as e:
                print(f"[!] Polling network glitch (recovering): {e}", flush=True)
                time.sleep(1)

    def process_update(self, update: dict, session: Optional[requests.Session] = None):
        """Process a single Telegram update with zero-latency response."""
        req_session = session or requests

        # 1. Handle Callback Query (Button Press)
        if "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb["id"]
            cb_data = cb.get("data", "")
            from_user = cb.get("from", {})
            user_id = str(from_user.get("id", ""))
            user_name = from_user.get("username") or from_user.get("first_name", "Operator")
            msg = cb.get("message", {})
            msg_id = msg.get("message_id")
            chat_id = str(msg.get("chat", {}).get("id", self.chat_id))

            # Deduplication check: ignore duplicate callback packet
            if cb_id in self._processed_callbacks:
                return
            self._processed_callbacks.add(cb_id)

            decision = "approve" if cb_data.startswith("approve") else "reject"
            action_id = cb_data.split(":", 1)[1] if ":" in cb_data else None

            # 1. Instant Telegram Popup Response (<15ms)
            decision_text = "✅ APPROVAL CONFIRMED" if decision == "approve" else "❌ REJECTION CONFIRMED"
            try:
                req_session.post(
                    f"{self.api_url}/answerCallbackQuery",
                    json={
                        "callback_query_id": cb_id,
                        "text": decision_text,
                        "show_alert": False,
                        "cache_time": 300,
                    },
                    timeout=3,
                )
            except Exception:
                pass

            # If action was already finalized in memory, skip redundant work
            if action_id and action_id in self._processed_actions:
                print(f"[INFO] Action {action_id} already marked as {self._processed_actions[action_id]}. Ignoring duplicate click.", flush=True)
                return

            print(f"\n[EVENT] Button Clicked: '{cb_data}' by @{user_name} (Chat: {chat_id})", flush=True)

            # 2. Database state transition & In-place message edit
            success, status_msg, acted_id = self.gate.handle_callback(
                callback_data=cb_data,
                user_id=user_id,
                user_name=user_name,
                message_id=msg_id,
                chat_id=chat_id,
            )
            print(f"[OK] State Transition: {status_msg}", flush=True)

            if acted_id:
                self._processed_actions[acted_id] = "approved" if decision == "approve" else "rejected"

            # 3. If approved, broadcast executing state immediately, execute command, and dispatch execution receipt!
            if success and acted_id and decision == "approve":
                try:
                    from src.triage.events_ws import ws_manager
                    import asyncio
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(ws_manager.broadcast({
                            "event_type": "REMEDIATION_EXECUTING",
                            "type": "REMEDIATION_EXECUTING",
                            "action_id": acted_id,
                            "step_index": 4,
                            "stage": "EXECUTE",
                            "user_name": user_name,
                        }))
                    except RuntimeError:
                        asyncio.run(ws_manager.broadcast({
                            "event_type": "REMEDIATION_EXECUTING",
                            "type": "REMEDIATION_EXECUTING",
                            "action_id": acted_id,
                            "step_index": 4,
                            "stage": "EXECUTE",
                            "user_name": user_name,
                        }))
                except Exception as e:
                    print(f"[!] WebSocket broadcast notice: {e}")

                print(f"[*] Executing approved remediation command for Action {acted_id}...", flush=True)
                receipt = self.controller.execute_approved_action(acted_id, dry_run=False)
                safe_stdout = (receipt.stdout or "").encode('ascii', errors='replace').decode('ascii')
                print(f"[OK] Execution Finished: Code={receipt.exit_code}, Duration={receipt.duration_ms}ms", flush=True)
                print(f"     Output: {safe_stdout}", flush=True)

            # 4. If rejected, broadcast rejection state to frontend & log escalation
            elif success and acted_id and decision == "reject":
                print(f"[!] Remediation Action {acted_id} was REJECTED by @{user_name}.", flush=True)
                try:
                    from src.triage.events_ws import ws_manager
                    import asyncio
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(ws_manager.broadcast({
                            "type": "INCIDENT_REJECTED",
                            "action_id": acted_id,
                            "user_name": user_name,
                            "status": "rejected",
                        }))
                    except RuntimeError:
                        asyncio.run(ws_manager.broadcast({
                            "type": "INCIDENT_REJECTED",
                            "action_id": acted_id,
                            "user_name": user_name,
                            "status": "rejected",
                        }))
                except Exception:
                    pass

        # 2. Handle standard chat messages
        elif "message" in update:
            msg = update["message"]
            text = msg.get("text", "")
            chat_id = msg.get("chat", {}).get("id")
            user_name = msg.get("from", {}).get("first_name", "User")

            if text.startswith("/start") or text.startswith("/help"):
                welcome = (
                    f"👋 Hello {user_name}!\n\n"
                    f"🤖 <b>AI Incident Response Gate Bot Active</b>\n\n"
                    f"I am connected to the incident management platform. When high-risk or destructive remediation actions (e.g. <code>reboot</code>, <code>rm -rf</code>, <code>kill -9</code>) are proposed, I will send you an interactive card here with <b>[Approve]</b> and <b>[Reject]</b> buttons.\n\n"
                    f"• Status: 🟢 <b>ONLINE</b>\n"
                    f"• Response Latency: ⚡ <b><50ms Fast Mode</b>\n"
                    f"• Database: Supabase PostgreSQL (pgvector v0.8.2)\n"
                    f"• AI Model: Google Gemini 2.5 Flash\n"
                )
                try:
                    req_session.post(
                        f"{self.api_url}/sendMessage",
                        json={"chat_id": chat_id, "text": welcome, "parse_mode": "HTML"},
                        timeout=5,
                    )
                except Exception:
                    pass


def main():
    bot = TelegramPollingBot()
    bot.start_polling()


if __name__ == "__main__":
    main()
