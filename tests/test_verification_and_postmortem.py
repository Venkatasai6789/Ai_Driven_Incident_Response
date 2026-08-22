"""
Phase 5 Automated Test Suite: Verification Probes, Post-Mortem & Escalation
Tests:
- Verification probe execution (HTTP, DB, System)
- Gemini 2.5 Flash Post-Mortem generation and Supabase resolution
- Escalation branch execution on probe failure
"""

import os
import time
from pathlib import Path
import pytest
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from src.verification.verifier import VerificationEngine
from src.verification.postmortem import PostMortemGenerator
from src.verification.coordinator import Phase5Coordinator
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier
from src.remediation.controller import RemediationController


def test_verification_engine_probes():
    """Verify health verification probes execute and record metrics."""
    verifier = VerificationEngine(default_retries=2, backoff_seconds=1)
    
    # 1. Test Database probe
    is_healthy, status_code, latency_ms, details = verifier.probe_database("SELECT 1;")
    assert is_healthy is True
    assert status_code == 200
    assert latency_ms >= 0

    # 2. Test System probe
    is_healthy, status_code, latency_ms, details = verifier.probe_system(simulated_healthy=True)
    assert is_healthy is True
    assert status_code == 200


def test_gemini_postmortem_generation_and_resolution():
    """Verify Gemini 2.5 Flash generates comprehensive post-mortem and resolves incident in Supabase."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="grafana",
        alert_name="DatabaseConnectionPoolStarvation",
        description="FATAL: remaining connection slots are reserved for non-replication superuser connections. Transactions queuing.",
        severity="Critical",
        service="postgres-master",
        instance=f"db-cluster-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("grafana", "DatabaseConnectionPoolStarvation", "postgres-master", f"db-cluster-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    # Execute a safe remediation action
    controller = RemediationController()
    controller.process_remediation(
        incident_id=incident_id,
        command="docker restart pgbouncer",
        incident_title=triage.title,
        dry_run=True,
    )

    # Run Phase 5 Coordinator to verify and generate post-mortem
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

    # Verify directly from Supabase
    conn = coordinator.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT status, resolved_at, postmortem FROM incidents WHERE id = %s;", (incident_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    assert row[0] == "resolved"
    assert row[1] is not None
    assert "Post-Mortem" in row[2] or "Root Cause" in row[2]


def test_phase5_escalation_on_probe_failure():
    """Verify incident escalates to on-call when verification probes fail."""
    ts = int(time.time())
    alert = NormalizedAlert(
        source="custom",
        alert_name="UnrecoverableStorageFault",
        description="Persistent I/O errors on NVMe block storage.",
        severity="Critical",
        service="storage-pool",
        instance=f"storage-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "UnrecoverableStorageFault", "storage-pool", f"storage-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    # Trigger failure branch
    coordinator = Phase5Coordinator()
    res = coordinator.process_incident_verification_and_closure(
        incident_id=incident_id,
        probe_type="system",
        retries=1,
        simulated_healthy=False,  # Simulates persistent failure
    )

    assert res["status"] == "escalated"
    assert res["is_healthy"] is False

    # Verify status in database
    conn = coordinator.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT status FROM incidents WHERE id = %s;", (incident_id,))
    status = cur.fetchone()[0]
    cur.close()
    conn.close()

    assert status == "escalated"
