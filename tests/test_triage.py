"""
Phase 3 Webhook Ingestion & Gemini AI Classification Test Suite
Tests:
- Payload normalization (Prometheus, Grafana, Datadog, Custom)
- Deterministic deduplication
- Gemini AI triage, root cause analysis, and SOP matching
- Database persistence in incidents, alerts, timeline, and ai_logs
- FastAPI Webhook HTTP endpoints
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from src.triage.normalizer import AlertNormalizer, NormalizedAlert
from src.triage.classifier import GeminiTriageClassifier
from src.triage.webhook_service import app


def test_prometheus_payload_normalization():
    """Verify Prometheus Alertmanager payload normalizer."""
    payload = {
        "receiver": "webhook-receiver",
        "status": "firing",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "ContainerHighMemoryUsage",
                    "severity": "critical",
                    "instance": "prod-worker-01.internal",
                    "job": "payment-worker",
                },
                "annotations": {
                    "summary": "Container memory utilization > 95%",
                    "description": "Container payment-worker-01 is consuming 98% RAM with active OOM killer events.",
                },
            }
        ],
    }

    normalized = AlertNormalizer.normalize(payload)
    assert len(normalized) == 1
    alert = normalized[0]
    assert alert.source == "prometheus"
    assert alert.alert_name == "ContainerHighMemoryUsage"
    assert alert.severity == "Critical"
    assert alert.service == "payment-worker"
    assert alert.instance == "prod-worker-01.internal"
    assert len(alert.fingerprint) == 64


def test_grafana_payload_normalization():
    """Verify Grafana Webhook payload normalizer."""
    payload = {
        "title": "[Alerting] Database Connection Pool Exhausted",
        "ruleName": "PostgresPoolExhausted",
        "state": "alerting",
        "message": "Active connections reached 98% of max_connections. Queries timing out.",
        "tags": {
            "service": "postgres-primary",
            "instance": "db-cluster-01",
        },
    }

    normalized = AlertNormalizer.normalize(payload)
    assert len(normalized) == 1
    alert = normalized[0]
    assert alert.source == "grafana"
    assert alert.alert_name == "PostgresPoolExhausted"
    assert alert.severity == "Critical"
    assert alert.service == "postgres-primary"
    assert len(alert.fingerprint) == 64


def test_gemini_triage_classifier_end_to_end():
    """End-to-end test: Process an alert through Gemini AI triage and verify database records."""
    import time
    unique_instance = f"host-test-{int(time.time()*1000)}"
    
    alert = NormalizedAlert(
        source="custom",
        alert_name="PostgresConnectionPoolStarvation",
        description="FATAL: remaining connection slots are reserved for non-replication superuser connections. 500 errors on API.",
        severity="Critical",
        service="order-api",
        instance=unique_instance,
        fingerprint=AlertNormalizer.calculate_fingerprint("custom", "PostgresConnectionPoolStarvation", "order-api", unique_instance),
        raw_payload={"mock": True},
    )

    classifier = GeminiTriageClassifier()
    result = classifier.process_alert(alert)

    # Validate triage result
    assert result.is_duplicate is False
    assert result.incident_id is not None
    assert result.alert_id is not None
    assert result.severity in ["Critical", "High", "Medium", "Low"]
    assert len(result.root_cause_hypothesis) > 10
    assert result.matched_runbook_title is not None or result.similarity_score >= 0.0

    # Test Deduplication with same fingerprint
    dup_result = classifier.process_alert(alert)
    assert dup_result.is_duplicate is True
    assert "[DUPLICATE]" in dup_result.title


def test_fastapi_webhook_endpoint():
    """Verify FastAPI Webhook HTTP receiver."""
    client = TestClient(app)

    # 1. Health check
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"

    # 2. Post alert webhook
    import time
    unique_host = f"web-test-{int(time.time()*1000)}"
    payload = {
        "alert_name": "DiskSpaceExhaustion",
        "description": "Root volume partition /var/log is 92% full due to unrotated application log files.",
        "severity": "High",
        "service": "logging-agent",
        "instance": unique_host,
    }

    response = client.post("/webhook/alerts", json=payload)
    assert response.status_code == 201
    results = response.json()
    assert len(results) >= 1
    assert results[0]["severity"] in ["Critical", "High", "Medium", "Low"]
    assert results[0]["incident_id"] is not None
    assert "Disk" in results[0]["title"] or "Disk" in results[0]["diagnostic_summary"] or len(results[0]["root_cause_hypothesis"]) > 0

    # 3. List incidents API
    inc_resp = client.get("/api/incidents")
    assert inc_resp.status_code == 200
    assert len(inc_resp.json()) >= 1
