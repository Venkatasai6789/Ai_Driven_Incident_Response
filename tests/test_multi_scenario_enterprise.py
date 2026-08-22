"""
Enterprise Multi-Scenario Test Suite (Phase 4 Enhanced)
Validates:
1. Scenario 1: Dynamic AI Planning for Kubernetes CrashLoopBackOff
2. Scenario 2: Dynamic AI Planning for Redis Cache Saturation
3. Scenario 3: Adversarial Command Injection & Chaining Attack Defense
4. Scenario 4: Capability Budget & Quota Rate Limiting Defense
5. Scenario 5: Destructive Command Telegram State Machine with DB Receipts
"""

import os
import sys
import time
from pathlib import Path
import pytest
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from src.remediation.safety_guard import SafetyGuard, CommandType
from src.remediation.planner import RemediationPlanner, ChangePlan
from src.remediation.budgets import BudgetTracker, CapabilityBudget, PolicyViolationError
from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.controller import RemediationController
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier


def test_scenario_k8s_crashloop_dynamic_planning():
    """Scenario 1: Dynamic AI planning for Kubernetes CrashLoopBackOff."""
    planner = RemediationPlanner()
    ts = int(time.time())
    
    plan = planner.plan(
        incident_id=f"INC-K8S-{ts}",
        alert_name="KubePodCrashLooping",
        service="payment-processor",
        instance="k8s-node-prod-02",
        description="Pod payment-processor-7b649d84f-8m9xz in namespace payments is crashing repeatedly with exit code 137 (OOMKilled).",
        severity="High",
    )

    assert plan.plan_id.startswith("plan-")
    assert len(plan.actions) >= 1
    assert plan.risk_level in ["Low", "Medium", "High", "Critical"]
    assert plan.rollback_strategy != ""
    print(f"\n[OK] K8s Dynamic Plan Generated: {plan.summary}")
    for act in plan.actions:
        print(f"     * Step: '{act.title}' -> Command: `{act.command}` (Safe: {act.is_safe})")


def test_scenario_redis_cache_saturation():
    """Scenario 2: Dynamic AI planning for Redis Cache Memory Saturation."""
    planner = RemediationPlanner()
    ts = int(time.time())
    
    plan = planner.plan(
        incident_id=f"INC-REDIS-{ts}",
        alert_name="RedisMemoryExhaustion",
        service="redis-session-store",
        instance="cache-cluster-01",
        description="Redis memory usage exceeded 96% with high keyspace eviction rate causing session token misses.",
        severity="High",
    )

    assert len(plan.actions) >= 1
    assert plan.summary != ""
    print(f"\n[OK] Redis Dynamic Plan Generated: {plan.summary}")


def test_adversarial_command_injection_defense():
    """Scenario 3: Verify adversarial injection attacks are blocked."""
    attacks = [
        ("docker restart payment && rm -rf /var/lib/docker", "Chained destructive deletion"),
        ("docker restart $(reboot)", "Command substitution"),
        ("docker restart `reboot`", "Backtick command substitution"),
        ("bash -c 'rm -rf /'", "Shell execution wrapper"),
        ("cat /dev/null | rm -rf /var/log/*", "Piped destructive deletion"),
        ("echo ok; sudo su; shutdown -h now", "Privilege escalation and shutdown"),
        ("DROP TABLE incidents; --", "SQL injection drop statement"),
    ]

    for attack_cmd, label in attacks:
        eval_res = SafetyGuard.evaluate(attack_cmd)
        assert eval_res.is_safe is False, f"Failed to block attack: {label} (`{attack_cmd}`)"
        assert eval_res.command_type == CommandType.DESTRUCTIVE
        assert eval_res.requires_approval is True
        print(f"[BLOCKED] Attack successfully intercepted: {label} -> Reason: {eval_res.reason}")


def test_capability_budget_exhaustion_defense():
    """Scenario 4: Verify write action rate limits prevent runaway automation."""
    budget = CapabilityBudget(max_write_actions=2)
    tracker = BudgetTracker(budget)

    # First write action: Allowed
    tracker.consume_action(is_write=True, risk_level="medium")
    assert tracker.write_count == 1

    # Second write action: Allowed
    tracker.consume_action(is_write=True, risk_level="medium")
    assert tracker.write_count == 2

    # Third write action: Must raise PolicyViolationError
    with pytest.raises(PolicyViolationError) as exc_info:
        tracker.consume_action(is_write=True, risk_level="medium")
    assert "budget exceeded" in str(exc_info.value).lower()
    print(f"[OK] Capability budget limit successfully enforced: {exc_info.value}")


def test_end_to_end_destructive_telegram_workflow():
    """Scenario 5: Complete lifecycle for destructive command with Supabase receipt."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="custom",
        alert_name="CorruptedWALSegment",
        description="PostgreSQL engine failure due to corrupted WAL segment in /var/lib/postgresql/wal",
        severity="Critical",
        service="postgres-engine",
        instance=f"db-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "CorruptedWALSegment", "postgres-engine", f"db-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)

    controller = RemediationController()
    destructive_cmd = "rm -rf /var/lib/postgresql/wal/corrupted_001"
    
    # 1. Dispatch remediation -> Must halt in pending state
    res = controller.process_remediation(
        incident_id=triage.incident_id,
        command=destructive_cmd,
        incident_title=triage.title,
        dry_run=True,
    )
    assert res["status"] == "pending_approval"
    assert res["command_type"] == "destructive"
    action_id = res["action_id"]

    # 2. Simulate Telegram callback approval
    gate = TelegramApprovalGate()
    success, msg, _ = gate.handle_callback(
        callback_data=f"approve:{action_id}",
        user_id="5775779049",
        user_name="oncall_lead",
    )
    assert success is True

    # 3. Execute approved action
    receipt = controller.execute_approved_action(action_id, dry_run=True)
    assert receipt.approval_status == "approved"
    assert receipt.exit_code == 0
    assert receipt.dry_run is True
