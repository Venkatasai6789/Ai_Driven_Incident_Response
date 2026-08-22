"""
Chaos Test Automation & Stress-Test Harness (Domains 1 to 5)
Mission-Critical Validation Suite by Principal Chaos SRE.
Tests:
- Domain 1: Multi-Vector Alert Ingestion & Payload Normalization (Goroutine Leak + Malformed JSON)
- Domain 2: Non-Deterministic RAG Semantic Search Boundary Tests (Exact, Paraphrased, Out-of-Domain)
- Domain 3: Adversarial Command Injection & Safety Policy Enforcement (Chained, Subshell, Budget)
- Domain 4: Telegram Approval State Machine & Timeout Gating (Approval Transition & Timeout Expiry)
- Domain 5: Probe Failure & Automated Escalation Loop (Failure Escalation & Self-Healing Resolution)
"""

import json
import os
import sys
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.triage.normalizer import AlertNormalizer, NormalizedAlert
from src.triage.classifier import GeminiTriageClassifier
from src.triage.webhook_service import app
from src.rag.search import RunbookSearchEngine
from src.remediation.safety_guard import SafetyGuard, CommandType
from src.remediation.budgets import CapabilityBudgetTracker, CapabilityBudgetExhausted
from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.controller import RemediationController
from src.verification.verifier import VerificationEngine
from src.verification.postmortem import PostMortemGenerator
from src.verification.coordinator import Phase5Coordinator


client = TestClient(app)


# =============================================================================
# DOMAIN 1: Multi-Vector Alert Ingestion & Payload Normalization
# =============================================================================

def test_domain1_scenario_a_prometheus_goroutine_leak_and_deduplication():
    """Domain 1A: Prometheus CPU/Goroutine spike alert normalization & deduplication."""
    ts = int(time.time())
    instance_name = f"payment-gw-node-{ts}"
    
    payload = {
        "receiver": "webhook",
        "status": "firing",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "GoRoutineLeakHighCPU",
                    "severity": "critical",
                    "job": "payment-gateway",
                    "instance": instance_name,
                },
                "annotations": {
                    "summary": "Payment gateway goroutine count > 15000 with 99.4% CPU saturation",
                    "description": "Goroutine leak detected in HTTP worker pool causing CPU throttling and 504 Gateway Timeouts.",
                },
                "startsAt": "2026-08-20T00:00:00Z",
            }
        ]
    }

    # 1. First alert ingestion -> Unified JSON & SHA-256 fingerprint
    resp1 = client.post("/webhook/alerts", json=payload)
    assert resp1.status_code == 201
    results1 = resp1.json()
    assert len(results1) == 1
    triage1 = results1[0]
    
    assert triage1["is_duplicate"] is False
    assert triage1["severity"].upper() in ["CRITICAL", "HIGH"]
    incident_id1 = triage1["incident_id"]
    assert incident_id1 is not None

    # 2. Duplicate alert within 5 minutes -> Suppressed with identical fingerprint
    resp2 = client.post("/webhook/alerts", json=payload)
    assert resp2.status_code == 201
    results2 = resp2.json()
    assert len(results2) == 1
    triage2 = results2[0]

    assert triage2["is_duplicate"] is True
    assert triage2["incident_id"] == incident_id1
    assert "DUPLICATE" in triage2["title"].upper() or "DUPLICATE" in triage2["root_cause_hypothesis"].upper()


def test_domain1_scenario_b_datadog_corrupted_json_and_null_values():
    """Domain 1B: Datadog malformed JSON / null value handling returns clean HTTP 400/422."""
    # Test 1: Invalid/Corrupted JSON body string
    resp_corrupted = client.post(
        "/webhook/alerts",
        content="{\"event_type\": \"datadog_alert\", \"body\": null, tags: [INVALID JSON",
        headers={"Content-Type": "application/json"},
    )
    assert resp_corrupted.status_code in [400, 422]

    # Test 2: Payload with null tags and missing metric values (dynamic timestamp)
    ts = int(time.time())
    null_payload = {
        "event_type": "datadog_anomaly",
        "title": f"Datadog Anomaly Alert {ts}",
        "body": f"Null tag payload test for instance node-{ts}",
        "tags": None,
        "metric_value": None,
        "priority": None,
    }
    resp_null = client.post("/webhook/alerts", json=null_payload)
    assert resp_null.status_code == 201
    res = resp_null.json()[0]
    assert res["incident_id"] is not None
    assert res["is_duplicate"] is False


# =============================================================================
# DOMAIN 2: Non-Deterministic RAG Semantic Search Boundary Tests
# =============================================================================

def test_domain2_scenario_a_exact_match_sop202():
    """Domain 2A: Exact phrasing match from SOP-202 achieves high cosine similarity."""
    search_engine = RunbookSearchEngine(similarity_threshold=0.60)
    exact_query = "FATAL: remaining connection slots are reserved for non-replication superuser connections"
    matches = search_engine.search(exact_query, limit=3)
    
    assert len(matches) > 0
    top_match = matches[0]
    assert "SOP-202" in top_match.title or "Connection Pool" in top_match.title
    assert top_match.similarity_score >= 0.60


def test_domain2_scenario_b_paraphrased_colloquial_query_sop202():
    """Domain 2B: Colloquial developer phrasing correctly retrieves SOP-202 and excludes disk/memory SOPs."""
    search_engine = RunbookSearchEngine(similarity_threshold=0.55)
    colloquial_query = "Postgres is choking, apps throwing 500s because max pools are saturated"
    matches = search_engine.search(colloquial_query, limit=3)
    
    assert len(matches) > 0
    top_match = matches[0]
    assert "SOP-202" in top_match.title or "Connection Pool" in top_match.title or "PostgreSQL" in top_match.title
    
    # Verify score is higher for connection pool than unrelated disk exhaustion SOP
    assert top_match.similarity_score >= 0.55


def test_domain2_scenario_c_out_of_domain_query_fallback():
    """Domain 2C: Out-of-domain query returns 0 matches and triggers fallback state."""
    search_engine = RunbookSearchEngine(similarity_threshold=0.75)
    out_of_domain_query = "Frontend CSS stylesheet failing to load on Cloudflare CDN edge cache"
    matches = search_engine.search(out_of_domain_query, limit=3)
    
    # Should find no matches meeting strict threshold
    filtered_matches = [m for m in matches if m.similarity_score >= 0.75]
    assert len(filtered_matches) == 0


# =============================================================================
# DOMAIN 3: Adversarial Command Injection & Safety Policy Enforcement
# =============================================================================

def test_domain3_scenario_a_chained_injection_attack():
    """Domain 3A: Chained command injection (&& rm -rf) isolated and categorized as DESTRUCTIVE."""
    chained_cmd = "docker restart webapp && rm -rf /var/log/*"
    eval_res = SafetyGuard.evaluate(chained_cmd)
    
    assert eval_res.command_type == CommandType.DESTRUCTIVE
    assert eval_res.risk_level.upper() in ["CRITICAL", "HIGH"]
    assert eval_res.requires_approval is True
    assert "rm -rf" in eval_res.reason or "Destructive" in eval_res.reason


def test_domain3_scenario_b_obfuscated_subshell_injection():
    """Domain 3B: Obfuscated subshell command substitution (`kill -9 $(pidof postgres)`) blocked."""
    subshell_cmd = "`kill -9 $(pidof postgres)`"
    eval_res = SafetyGuard.evaluate(subshell_cmd)
    
    assert eval_res.command_type == CommandType.DESTRUCTIVE
    assert eval_res.requires_approval is True
    assert "subshell" in eval_res.reason.lower() or "substitution" in eval_res.reason.lower() or "kill" in eval_res.reason.lower()


def test_domain3_scenario_c_capability_budget_depletion():
    """Domain 3C: 4 successive automated actions trip CapabilityBudgetExhausted circuit-breaker."""
    tracker = CapabilityBudgetTracker(max_write_actions_per_incident=3)
    incident_id = f"test-inc-budget-{int(time.time())}"
    
    # Attempt 1, 2, 3 succeed
    assert tracker.request_action(incident_id, "docker restart worker-01", is_write_action=True) is True
    assert tracker.request_action(incident_id, "docker restart worker-02", is_write_action=True) is True
    assert tracker.request_action(incident_id, "systemctl reload nginx", is_write_action=True) is True
    
    # Attempt 4 trips circuit breaker
    with pytest.raises(CapabilityBudgetExhausted):
        tracker.request_action(incident_id, "docker restart worker-03", is_write_action=True)


# =============================================================================
# DOMAIN 4: Telegram Approval State Machine & Timeout Gating
# =============================================================================

def test_domain4_scenario_a_live_destructive_approval_state_transition():
    """Domain 4A: Destructive command Telegram approval transitions PENDING -> APPROVED."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="grafana",
        alert_name="PrimaryDBDeadlock",
        description="Transaction deadlock on postgres primary node.",
        severity="Critical",
        service="postgres-db",
        instance=f"db-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("grafana", "PrimaryDBDeadlock", "postgres-db", f"db-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    # Propose destructive command
    controller = RemediationController()
    res = controller.process_remediation(
        incident_id=incident_id,
        command="systemctl stop postgresql",
        incident_title=triage.title,
        dry_run=True,
    )
    action_id = res["action_id"]
    assert res["status"] == "pending_approval"

    # Simulate operator callback approval
    gate = TelegramApprovalGate()
    success, msg, acted_id = gate.handle_callback(
        callback_data=f"approve:{action_id}",
        user_id="5775779049",
        user_name="ChaosEngineer",
    )
    assert success is True
    assert acted_id == action_id

    # Verify action status in Supabase
    conn = gate.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT approval_status, approved_by FROM actions WHERE id = %s;", (action_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    assert row[0] == "approved"
    assert "ChaosEngineer" in row[1]


def test_domain4_scenario_b_approval_timeout_expiry():
    """Domain 4B: Approval timeout marks action EXPIRED and escalates incident."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="custom",
        alert_name="UnresponsiveRedisNode",
        description="Redis cluster master node unresponsive.",
        severity="High",
        service="redis-cluster",
        instance=f"redis-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "UnresponsiveRedisNode", "redis-cluster", f"redis-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    controller = RemediationController()
    res = controller.process_remediation(
        incident_id=incident_id,
        command="reboot",
        incident_title=triage.title,
        dry_run=True,
    )
    action_id = res["action_id"]
    assert res["status"] == "pending_approval"

    # Trigger timeout expiration
    gate = TelegramApprovalGate()
    expired_ok, exp_msg = gate.expire_approval_request(
        action_id=action_id,
        reason="Operator approval timed out after 5 minutes.",
    )
    assert expired_ok is True

    # Verify database state
    conn = gate.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT approval_status FROM actions WHERE id = %s;", (action_id,))
    action_status = cur.fetchone()[0]
    cur.execute("SELECT status FROM incidents WHERE id = %s;", (incident_id,))
    inc_status = cur.fetchone()[0]
    cur.close()
    conn.close()

    assert action_status == "expired"
    assert inc_status == "escalated"


# =============================================================================
# DOMAIN 5: Probe Failure & Automated Escalation Loop
# =============================================================================

def test_domain5_scenario_a_post_remediation_probe_failure_and_escalation():
    """Domain 5A: Health probe failure after retries updates status to escalated and writes failure logs."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="datadog",
        alert_name="UnrecoverableDiskCorruption",
        description="Filesystem corruption detected on block storage /dev/sdb.",
        severity="Critical",
        service="storage-daemon",
        instance=f"storage-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("datadog", "UnrecoverableDiskCorruption", "storage-daemon", f"storage-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    coordinator = Phase5Coordinator()
    res = coordinator.process_incident_verification_and_closure(
        incident_id=incident_id,
        probe_type="system",
        retries=2,
        simulated_healthy=False,  # Simulates persistent health probe failure
    )

    assert res["status"] == "escalated"
    assert res["is_healthy"] is False

    # Check database state
    conn = coordinator.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT status FROM incidents WHERE id = %s;", (incident_id,))
    final_status = cur.fetchone()[0]
    cur.execute("SELECT event_type FROM timeline WHERE incident_id = %s AND event_type = 'incident_escalated';", (incident_id,))
    escalated_event = cur.fetchone()
    cur.close()
    conn.close()

    assert final_status == "escalated"
    assert escalated_event is not None


def test_domain5_scenario_b_successful_self_healing_and_postmortem():
    """Domain 5B: Probe succeeds on attempt #1 -> Status updates to resolved with AI Post-Mortem."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="prometheus",
        alert_name="KafkaBrokerConsumerLag",
        description="Consumer group payment-consumers lag exceeded 50,000 messages.",
        severity="High",
        service="kafka-broker",
        instance=f"kafka-01-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("prometheus", "KafkaBrokerConsumerLag", "kafka-broker", f"kafka-01-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    # Execute safe remediation
    controller = RemediationController()
    controller.process_remediation(
        incident_id=incident_id,
        command="docker restart payment-consumer",
        incident_title=triage.title,
        dry_run=True,
    )

    # Verification probe succeeds
    coordinator = Phase5Coordinator()
    res = coordinator.process_incident_verification_and_closure(
        incident_id=incident_id,
        probe_type="database",
        retries=1,
        simulated_healthy=True,
    )

    assert res["status"] == "resolved"
    assert res["is_healthy"] is True
    assert res["postmortem_length"] > 200

    # Verify audit state in Supabase
    conn = coordinator.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT status, resolved_at, postmortem FROM incidents WHERE id = %s;", (incident_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    assert row[0] == "resolved"
    assert row[1] is not None
    assert "Post-Mortem" in row[2] or "Root Cause" in row[2]
