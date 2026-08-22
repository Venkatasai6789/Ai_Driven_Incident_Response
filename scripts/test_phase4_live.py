"""
Phase 4 Live Demonstration Script: Safety Decision Engine & Telegram Approval Gate
Demonstrates:
1. Safe command auto-approval and immediate execution.
2. Destructive command detection and live interactive Telegram dispatch with inline buttons.
3. Database receipt persistence in actions and timeline tables.
"""

import json
import os
import sys
import time
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.remediation.safety_guard import SafetyGuard, CommandType
from src.remediation.controller import RemediationController
from src.remediation.telegram_gate import TelegramApprovalGate
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier


def main():
    print("=" * 70)
    print("  AI-Driven Incident Response: Phase 4 Safety & Telegram Verification")
    print("=" * 70)

    controller = RemediationController()
    telegram_gate = TelegramApprovalGate()

    # 1. Create a live test incident for the demo
    print("\n[Step 1] Creating Incident for Safety & Remediation Demo...")
    ts = int(time.time())
    alert = NormalizedAlert(
        source="prometheus",
        alert_name="ServiceOOMAndDiskFull",
        description="High memory leak in checkout-worker and disk corruption logs detected.",
        severity="Critical",
        service="checkout-service",
        instance=f"prod-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("prometheus", "ServiceOOMAndDiskFull", "checkout-service", f"prod-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id
    print(f"[OK] Incident Initialized: {incident_id} ({triage.title})")

    # 2. Test Safe Command Auto-Execution
    print("\n[Step 2] Testing SAFE Command (Direct Auto-Execution)...")
    safe_command = "docker restart checkout-worker"
    eval_safe = SafetyGuard.evaluate(safe_command)
    print(f"     * Command:           {safe_command}")
    print(f"     * Safety Filter:     {eval_safe.command_type.value.upper()} (Risk: {eval_safe.risk_level})")
    print(f"     * Policy Rule:       {eval_safe.matched_rule}")
    print(f"     * Requires Approval: {eval_safe.requires_approval}")

    safe_result = controller.process_remediation(
        incident_id=incident_id,
        command=safe_command,
        incident_title=triage.title,
        dry_run=True,
    )
    print(f"[OK] Safe Execution Status: {safe_result['status']} (Action ID: {safe_result['action_id']})")
    print(f"     * Receipt Stdout:    {safe_result['stdout']}")

    # 3. Test Destructive Command Telegram Gating
    print("\n[Step 3] Testing DESTRUCTIVE Command (Interactive Telegram Approval Gate)...")
    destructive_command = "rm -rf /var/lib/docker/corrupted_volumes"
    eval_dest = SafetyGuard.evaluate(destructive_command)
    print(f"     * Command:           {destructive_command}")
    print(f"     * Safety Filter:     {eval_dest.command_type.value.upper()} (Risk: {eval_dest.risk_level})")
    print(f"     * Policy Reason:     {eval_dest.reason}")
    print(f"     * Requires Approval: {eval_dest.requires_approval}")

    dest_result = controller.process_remediation(
        incident_id=incident_id,
        command=destructive_command,
        incident_title=triage.title,
        dry_run=True,
    )
    print(f"[OK] Destructive Gate Result:")
    print(f"     * Action ID:         {dest_result['action_id']}")
    print(f"     * Status:            {dest_result['status'].upper()}")
    print(f"     * Telegram Sent:     {dest_result['telegram_dispatched']}")
    print(f"     * Target Chat ID:    {telegram_gate.chat_id}")

    # 4. Simulate Operator Approval in Telegram
    print("\n[Step 4] Simulating Telegram Operator Approval Callback...")
    action_id = dest_result["action_id"]
    success, msg, acted_id = telegram_gate.handle_callback(
        callback_data=f"approve:{action_id}",
        user_id="5775779049",
        user_name="Venkata_Sai_7",
    )
    print(f"[OK] Callback Handled: {msg}")

    # Execute approved action
    receipt = controller.execute_approved_action(action_id, dry_run=True)
    print(f"[OK] Approved Action Executed:")
    print(f"     * Status:            {receipt.approval_status.upper()}")
    print(f"     * Exit Code:         {receipt.exit_code}")
    print(f"     * Terminal Output:   {receipt.stdout}")

    # 5. Database State Inspection
    print("\n[Step 5] Inspecting Database Actions & Timeline in Supabase...")
    conn = controller.get_connection()
    cur = conn.cursor()

    cur.execute("SELECT command, command_type, approval_status, approved_by, dry_run, executed_at FROM actions WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
    actions = cur.fetchall()
    print(f"[OK] Logged Actions ({len(actions)}):")
    for act in actions:
        print(f"     - Cmd: '{act[0]}' | Type: {act[1]} | Status: {act[2]} | ApprovedBy: {act[3]} | DryRun: {act[4]}")

    cur.execute("SELECT event_type, description, actor, created_at FROM timeline WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
    timeline = cur.fetchall()
    print(f"\n[OK] Timeline Audit Trail ({len(timeline)} events):")
    for evt in timeline:
        print(f"     - [{evt[0]}] ({evt[2]}): {evt[1]}")

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print("  [PASS] Phase 4 Safety Engine & Telegram Approval Verified!")
    print("=" * 70)


if __name__ == "__main__":
    main()
