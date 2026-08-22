"""
Telegram Approval Gate & State Machine (Phase 4)
Dispatches interactive Telegram messages with inline buttons for destructive remediation commands.
Processes approval/rejection callback queries and tracks operator identities in the audit log.
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import psycopg2
from psycopg2.extras import Json
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


class TelegramApprovalGate:
    def __init__(
        self,
        bot_token: Optional[str] = None,
        chat_id: Optional[str] = None,
    ):
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else None

    def get_connection(self):
        """Establish connection to PostgreSQL."""
        if DATABASE_URL:
            if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sslmode=" not in DATABASE_URL:
                separator = "&" if "?" in DATABASE_URL else "?"
                conn_url = f"{DATABASE_URL}{separator}sslmode=require"
            else:
                conn_url = DATABASE_URL
            return psycopg2.connect(conn_url)
        else:
            sslmode = "require" if POSTGRES_HOST not in ("localhost", "127.0.0.1") else "prefer"
            return psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                sslmode=sslmode,
            )

    def send_approval_request(
        self,
        incident_id: str,
        action_id: str,
        title: str,
        command: str,
        risk_level: str = "High",
        reason: str = "",
        target_chat_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an interactive Telegram message with inline [Approve] and [Reject] buttons.
        """
        recipient_chat = target_chat_id or self.chat_id
        if not self.bot_token or not recipient_chat:
            print("[!] Telegram credentials missing; operating in simulation mode.")
            return {"simulated": True, "action_id": action_id, "status": "pending"}

        message_text = (
            f"🚨 <b>REMEDIATION APPROVAL REQUIRED</b>\n\n"
            f"<b>Incident:</b> {title}\n"
            f"<b>Incident ID:</b> <code>{incident_id}</code>\n"
            f"<b>Risk Level:</b> ⚠️ <b>{risk_level.upper()}</b>\n"
            f"<b>Policy Reason:</b> {reason}\n\n"
            f"<b>Proposed Command:</b>\n"
            f"<code>{command}</code>\n\n"
            f"<i>Please review carefully before confirming execution.</i>"
        )

        inline_keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ Approve & Execute", "callback_data": f"approve:{action_id}"},
                    {"text": "❌ Reject & Abort", "callback_data": f"reject:{action_id}"},
                ]
            ]
        }

        endpoint = f"{self.api_url}/sendMessage"
        payload = {
            "chat_id": recipient_chat,
            "text": message_text,
            "parse_mode": "HTML",
            "reply_markup": json.dumps(inline_keyboard),
        }

        try:
            resp = requests.post(endpoint, json=payload, timeout=15)
            resp_json = resp.json()
            if resp.status_code == 200:
                print(f"[OK] Telegram approval request sent to chat {recipient_chat} (Action ID: {action_id}).")
                return {"sent": True, "message_id": resp_json.get("result", {}).get("message_id")}
            else:
                print(f"[!] Telegram API error: {resp_json}")
                return {"sent": False, "error": resp_json}
        except Exception as e:
            print(f"[ERROR] Failed to send Telegram message: {e}")
            return {"sent": False, "error": str(e)}

    def handle_callback(
        self,
        callback_data: str,
        user_id: str,
        user_name: str,
        message_id: Optional[int] = None,
        chat_id: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Handle inline button callback from Telegram.
        callback_data format: "approve:<action_id>" or "reject:<action_id>"
        Returns: (success, status_msg, action_id)
        """
        if ":" not in callback_data:
            return False, "Invalid callback format", None

        decision, action_id = callback_data.split(":", 1)
        is_approved = decision.lower() == "approve"
        new_status = "approved" if is_approved else "rejected"
        operator = f"telegram:{user_name} (ID: {user_id})"

        conn = self.get_connection()
        cur = conn.cursor()

        # Check action in database
        cur.execute(
            """
            SELECT a.id::text, a.incident_id::text, a.command, a.approval_status, i.title
            FROM actions a
            JOIN incidents i ON a.incident_id = i.id
            WHERE a.id = %s;
            """,
            (action_id,),
        )
        action_row = cur.fetchone()

        if not action_row:
            cur.close()
            conn.close()
            return False, "Action not found in database", None

        current_status = action_row[3]
        if current_status in ["approved", "rejected", "auto_approved"]:
            cur.close()
            conn.close()
            return False, f"Action is already {current_status}", action_id

        incident_id = action_row[1]
        command = action_row[2]
        incident_title = action_row[4]

        # Update action status
        cur.execute(
            """
            UPDATE actions 
            SET approval_status = %s, approved_by = %s
            WHERE id = %s;
            """,
            (new_status, operator, action_id),
        )

        # Append to timeline
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, %s, %s, %s, %s);
            """,
            (
                incident_id,
                f"remediation_{new_status}",
                f"Remediation command '{command}' was {new_status.upper()} by {operator}.",
                operator,
                Json({"action_id": action_id, "decision": new_status, "command": command}),
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

        # Update original Telegram message and REMOVE the inline keyboard
        if self.api_url and message_id and (chat_id or self.chat_id):
            icon = "✅" if is_approved else "❌"
            update_text = (
                f"{icon} <b>REMEDIATION {new_status.upper()}</b>\n\n"
                f"<b>Incident:</b> {incident_title}\n"
                f"<b>Command:</b> <code>{command}</code>\n"
                f"<b>Decision:</b> {new_status.capitalize()} by @{user_name}\n"
                f"<b>Timestamp:</b> {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}"
            )
            try:
                requests.post(
                    f"{self.api_url}/editMessageText",
                    json={
                        "chat_id": chat_id or self.chat_id,
                        "message_id": message_id,
                        "text": update_text,
                        "parse_mode": "HTML",
                        "reply_markup": json.dumps({"inline_keyboard": []}),
                    },
                    timeout=5,
                )
            except Exception as e:
                print(f"[!] Could not update Telegram message: {e}")

        return True, f"Action {action_id} successfully marked as {new_status}", action_id

    def expire_approval_request(
        self,
        action_id: str,
        reason: str = "Approval window expired (5 min timeout)",
        message_id: Optional[int] = None,
        chat_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Mark a pending approval request as EXPIRED after timeout and route to secondary escalation.
        """
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT a.id::text, a.incident_id::text, a.command, a.approval_status, i.title
            FROM actions a
            JOIN incidents i ON a.incident_id = i.id
            WHERE a.id = %s;
            """,
            (action_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return False, "Action not found"

        current_status = row[3]
        if current_status != "pending":
            cur.close()
            conn.close()
            return False, f"Action is already {current_status}"

        incident_id = row[1]
        command = row[2]
        title = row[4]

        # Update action to expired
        cur.execute("UPDATE actions SET approval_status = 'expired' WHERE id = %s;", (action_id,))
        
        # Update incident to escalated
        cur.execute("UPDATE incidents SET status = 'escalated', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (incident_id,))

        # Record timeline event
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, 'approval_timeout_expired', %s, 'telegram-gate-timer', %s);
            """,
            (
                incident_id,
                f"Remediation approval for '{command}' EXPIRED without operator response. Escalated to secondary on-call.",
                Json({"action_id": action_id, "reason": reason, "command": command}),
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

        # Update Telegram message if message_id is provided
        if self.api_url and message_id and (chat_id or self.chat_id):
            expired_text = (
                f"⏰ <b>APPROVAL TIMEOUT EXPIRED</b>\n\n"
                f"<b>Incident:</b> {title}\n"
                f"<b>Command:</b> <code>{command}</code>\n"
                f"<b>Status:</b> ⚠️ <b>EXPIRED & ESCALATED</b>\n"
                f"<b>Reason:</b> {reason}\n"
                f"<i>Action execution was aborted. Incident routed to secondary escalation channel.</i>"
            )
            try:
                requests.post(
                    f"{self.api_url}/editMessageText",
                    json={
                        "chat_id": chat_id or self.chat_id,
                        "message_id": message_id,
                        "text": expired_text,
                        "parse_mode": "HTML",
                        "reply_markup": json.dumps({"inline_keyboard": []}),
                    },
                    timeout=5,
                )
            except Exception:
                pass

        return True, f"Action {action_id} successfully marked as EXPIRED"

    def send_execution_receipt(
        self,
        incident_id: str,
        command: str,
        exit_code: int,
        stdout: str,
        stderr: str,
        duration_ms: int,
        target_chat_id: Optional[str] = None,
    ):
        """Send command execution output / terminal receipt back to Telegram."""
        recipient_chat = target_chat_id or self.chat_id
        if not self.bot_token or not recipient_chat:
            return

        status_emoji = "✅ SUCCESS" if exit_code == 0 else "❌ FAILED"
        output_snippet = (stdout or stderr or "No output returned").strip()[:1000]

        receipt_text = (
            f"📋 <b>EXECUTION RECEIPT ({status_emoji})</b>\n\n"
            f"<b>Incident ID:</b> <code>{incident_id}</code>\n"
            f"<b>Command:</b> <code>{command}</code>\n"
            f"<b>Exit Code:</b> {exit_code} (Duration: {duration_ms} ms)\n\n"
            f"<b>Terminal Output:</b>\n"
            f"<pre>{output_snippet}</pre>"
        )

        try:
            requests.post(
                f"{self.api_url}/sendMessage",
                json={
                    "chat_id": recipient_chat,
                    "text": receipt_text,
                    "parse_mode": "HTML",
                },
                timeout=10,
            )
        except Exception as e:
            print(f"[!] Could not send execution receipt to Telegram: {e}")
