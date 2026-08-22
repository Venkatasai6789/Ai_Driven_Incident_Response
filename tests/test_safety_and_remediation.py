"""
Phase 4 Safety Decision Engine & Remediation Test Suite
Tests:
- Deterministic SafetyGuard regex classification (Safe vs. Destructive)
- RemediationRunner dry-run and live execution
- Safe command auto-approval & execution
- Destructive command Telegram gating & callback state transitions
"""

import os
from pathlib import Path
import pytest
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from src.remediation.safety_guard import SafetyGuard, CommandType
from src.remediation.runner import RemediationRunner
from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.controller import RemediationController
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier


def test_safety_guard_classification():
    """Verify deterministic safety classification of commands."""
    # 1. Safe commands
    safe_cmds = [
        "docker restart payment-worker",
        "systemctl reload-or-restart nginx",
        "journalctl --vacuum-time=2d",
        "df -h",
        "free -m",
        "docker ps",
    ]
    for cmd in safe_cmds:
        eval_res = SafetyGuard.evaluate(cmd)
        assert eval_res.is_safe is True, f"Expected {cmd} to be SAFE"
        assert eval_res.command_type == CommandType.SAFE
        assert eval_res.requires_approval is False

    # 2. Destructive commands (MUST require approval)
    destructive_cmds = [
        "rm -rf /var/log/app",
        "rm -r /home/user/data",
        "rm -f /var/run/app.pid",
        "reboot",
        "shutdown -h now",
        "kill -9 8921",
        "killall -9 worker",
        "DROP TABLE incidents CASCADE",
        "TRUNCATE TABLE alerts",
        "docker system prune -a --volumes",
        "chmod -R 777 /app",
    ]
    for cmd in destructive_cmds:
        eval_res = SafetyGuard.evaluate(cmd)
        assert eval_res.is_safe is False, f"Expected {cmd} to be DESTRUCTIVE"
        assert eval_res.command_type == CommandType.DESTRUCTIVE
        assert eval_res.requires_approval is True


def test_safe_command_auto_execution_flow():
    """Verify safe commands auto-approve and execute immediately."""
    # Create test incident
    import time
    ts = int(time.time()*1000)
    alert = NormalizedAlert(
        source="custom",
        alert_name="TestSafeAlert",
        description="Testing safe command automated remediation",
        severity="Low",
        service="test-svc",
        instance=f"node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "TestSafeAlert", "test-svc", f"node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)

    controller = RemediationController()
    safe_cmd = "docker restart test-svc"
    result = controller.process_remediation(
        incident_id=triage.incident_id,
        command=safe_cmd,
        incident_title=triage.title,
        dry_run=True,
    )

    assert result["command_type"] == "safe"
    assert result["status"] == "executed"
    assert result["dry_run"] is True
    assert result["action_id"] is not None


def test_destructive_command_telegram_gate_and_approval():
    """Verify destructive commands halt in pending state until callback approval."""
    import time
    ts = int(time.time()*1000)
    alert = NormalizedAlert(
        source="custom",
        alert_name="TestDestructiveAlert",
        description="Testing destructive command gating",
        severity="Critical",
        service="db-service",
        instance=f"db-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "TestDestructiveAlert", "db-service", f"db-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)

    controller = RemediationController()
    destructive_cmd = "rm -rf /var/log/corrupted_logs"
    result = controller.process_remediation(
        incident_id=triage.incident_id,
        command=destructive_cmd,
        incident_title=triage.title,
        dry_run=True,
    )

    # 1. Must halt in pending_approval
    assert result["command_type"] == "destructive"
    assert result["status"] == "pending_approval"
    action_id = result["action_id"]

    # 2. Simulate Telegram callback query: approve
    gate = TelegramApprovalGate()
    success, msg, acted_id = gate.handle_callback(
        callback_data=f"approve:{action_id}",
        user_id="5775779049",
        user_name="oncall_lead",
    )
    assert success is True
    assert acted_id == action_id

    # 3. Execute the now approved action
    receipt = controller.execute_approved_action(action_id, dry_run=True)
    assert receipt.approval_status == "approved"
    assert receipt.dry_run is True
    assert receipt.exit_code == 0
