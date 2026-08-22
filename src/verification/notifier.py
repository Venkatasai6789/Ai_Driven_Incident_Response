"""
Incident Resolution & Escalation Notifier (Phase 5)
Dispatches final incident resolution reports or P1 on-call escalation alerts
to Telegram and Email (SMTP).
"""

import os
import sys
import time
from pathlib import Path
from typing import Optional
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")


class IncidentNotifier:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else None

    def send_resolution_notification(
        self,
        incident_id: str,
        title: str,
        severity: str,
        verification_details: str,
        target_chat_id: Optional[str] = None,
    ) -> bool:
        """Send a formatted green resolution notification to Telegram."""
        recipient = target_chat_id or self.chat_id
        if not self.bot_token or not recipient:
            return False

        message = (
            f"🟢 <b>INCIDENT RESOLVED & ARCHIVED</b>\n\n"
            f"<b>Incident:</b> {title}\n"
            f"<b>Incident ID:</b> <code>{incident_id}</code>\n"
            f"<b>Severity:</b> {severity}\n"
            f"<b>Status:</b> ✅ <b>RESOLVED</b>\n"
            f"<b>Verification:</b> {verification_details}\n\n"
            f"<i>AI Root Cause Post-Mortem generated and persisted in Supabase audit store.</i>"
        )

        try:
            resp = requests.post(
                f"{self.api_url}/sendMessage",
                json={"chat_id": recipient, "text": message, "parse_mode": "HTML"},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[!] Could not send resolution notice to Telegram: {e}", flush=True)
            return False

    def send_escalation_alert(
        self,
        incident_id: str,
        title: str,
        reason: str,
        failure_details: str,
        target_chat_id: Optional[str] = None,
    ) -> bool:
        """Send an urgent red P1 on-call escalation alert to Telegram."""
        recipient = target_chat_id or self.chat_id
        if not self.bot_token or not recipient:
            return False

        message = (
            f"🔥 <b>CRITICAL P1 ON-CALL ESCALATION</b> 🔥\n\n"
            f"<b>Incident:</b> {title}\n"
            f"<b>Incident ID:</b> <code>{incident_id}</code>\n"
            f"<b>Status:</b> ⚠️ <b>ESCALATED TO HUMAN SRE</b>\n"
            f"<b>Escalation Reason:</b> {reason}\n"
            f"<b>Failure Details:</b> {failure_details}\n\n"
            f"<b>Action Required:</b> Immediate manual intervention required by primary on-call engineer."
        )

        try:
            resp = requests.post(
                f"{self.api_url}/sendMessage",
                json={"chat_id": recipient, "text": message, "parse_mode": "HTML"},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"[!] Could not send escalation alert to Telegram: {e}", flush=True)
            return False
