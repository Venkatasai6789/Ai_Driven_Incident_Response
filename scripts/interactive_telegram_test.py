"""
Interactive Telegram Approval Live Test Runner (Phase 4)
Dispatches a live destructive remediation approval request to the user's Telegram chat
and then runs the polling bot to wait for the user to click [Approve] or [Reject].
"""

import os
import sys
import time
from pathlib import Path
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.remediation.safety_guard import SafetyGuard
from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.telegram_bot import TelegramPollingBot
from src.remediation.controller import RemediationController
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier


def main():
    print("=" * 70, flush=True)
    print("  AI-Driven Incident Response: Interactive Telegram Live Test", flush=True)
    print("=" * 70, flush=True)

    ts = int(time.time())
    
    # 1. Ingest an alert requiring high-risk remediation
    print("\n[Step 1] Ingesting Live Incident (Database Transaction Log Saturation)...", flush=True)
    alert = NormalizedAlert(
        source="grafana",
        alert_name="PostgresWALDiskExhaustion",
        description="Production PostgreSQL WAL archive directory is 97% full. WAL archiving is failing, threatening primary database shutdown.",
        severity="Critical",
        service="postgres-primary",
        instance=f"db-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("grafana", "PostgresWALDiskExhaustion", "postgres-primary", f"db-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id
    print(f"[OK] Incident Created: {incident_id}", flush=True)
    print(f"     Title: {triage.title}", flush=True)

    # 2. Propose Destructive Remediation Command
    destructive_cmd = "rm -rf /var/lib/postgresql/data/pg_wal/archive_temp/*"
    print(f"\n[Step 2] Proposing Remediation Command: `{destructive_cmd}`", flush=True)
    eval_res = SafetyGuard.evaluate(destructive_cmd)
    print(f"[!] SafetyGuard Evaluation: {eval_res.command_type.value.upper()} (Risk: {eval_res.risk_level})", flush=True)
    print(f"    Reason: {eval_res.reason}", flush=True)

    # 3. Process via Controller (Inserts action in DB and sends Telegram card)
    controller = RemediationController()
    result = controller.process_remediation(
        incident_id=incident_id,
        command=destructive_cmd,
        incident_title=triage.title,
        dry_run=True,
    )
    action_id = result["action_id"]
    print(f"\n[Step 3] Dispatched Interactive Card to Telegram!", flush=True)
    print(f"     * Action ID: {action_id}", flush=True)
    print(f"     * Status:    PENDING APPROVAL", flush=True)
    print(f"     * Target:    Chat ID {os.getenv('TELEGRAM_CHAT_ID')}", flush=True)
    print("\n" + "-" * 70, flush=True)
    print("  >>> PLEASE CHECK YOUR TELEGRAM APP & TAP [APPROVE] OR [REJECT] <<<", flush=True)
    print("-" * 70 + "\n", flush=True)

    # 4. Start polling bot to wait for user's click
    bot = TelegramPollingBot()
    print("[*] Poller active. Waiting for button callback from Telegram...", flush=True)
    
    # Poll until this action is processed
    session = requests.Session()
    bot.flush_stale_updates()
    
    while action_id not in bot._processed_actions:
        try:
            updates_url = f"{bot.api_url}/getUpdates?offset={bot.offset}&timeout=2"
            resp = session.get(updates_url, timeout=5)
            data = resp.json()
            if data.get("ok"):
                for update in data.get("result", []):
                    bot.offset = update["update_id"] + 1
                    bot.process_update(update, session)
        except KeyboardInterrupt:
            break
        except Exception as e:
            time.sleep(1)

    decision_final = bot._processed_actions.get(action_id, "unknown")
    print("\n" + "=" * 70, flush=True)
    print(f"  [COMPLETED] Action {action_id} was finalized as: {decision_final.upper()}", flush=True)
    print("=" * 70 + "\n", flush=True)


if __name__ == "__main__":
    main()
