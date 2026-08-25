"""
Comprehensive Dynamic API V1 & n8n Topology Test Suite.
Verifies all 10 dynamic endpoints work with real DB state, chaos injections, and remediation flows.
"""

import pytest
from fastapi.testclient import TestClient
from src.triage.webhook_service import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert "model" in json_data


def test_system_overview_dynamic():
    """Verify GET /api/v1/system/overview returns dynamic health & incident counts."""
    response = client.get("/api/v1/system/overview")
    assert response.status_code == 200
    data = response.json()
    assert "cluster_health" in data
    assert "active_incidents" in data
    assert "inference_engine" in data
    assert "vector_index" in data
    assert data["vector_index"]["engine"] == "pgvector"


def test_topology_mesh_dynamic():
    """Verify GET /api/v1/topology/mesh returns n8n workflow nodes."""
    response = client.get("/api/v1/topology/mesh")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    node_ids = [n["id"] for n in data["nodes"]]
    assert "alert-webhook" in node_ids
    assert "normalizer" in node_ids
    assert "rag-ai-agent" in node_ids
    assert "fastapi-dispatcher" in node_ids
    assert "telegram-notifier" in node_ids
    assert "supabase-db" in node_ids


def test_chaos_injection_dynamic_flow():
    """End-to-end test of synthetic chaos injection and lifecycle state updates."""
    # 1. Inject Chaos
    inject_resp = client.post("/api/v1/chaos/inject", json={
        "experiment_id": "exp-oom",
        "target_service": "rag-ai-agent",
        "dry_run": True,
    })
    assert inject_resp.status_code == 200
    inject_data = inject_resp.json()
    assert inject_data["success"] is True
    incident_id = inject_data["incident_id"]
    assert incident_id is not None

    # 2. Check Active Spotlight Incident
    active_resp = client.get("/api/v1/incidents/active")
    assert active_resp.status_code == 200
    active_data = active_resp.json()
    assert active_data["incident_id"] == incident_id

    # 3. Check Dynamic Topology update
    topo_resp = client.get("/api/v1/topology/mesh")
    assert topo_resp.status_code == 200
    nodes = topo_resp.json()["nodes"]
    rag_node = next(n for n in nodes if n["id"] == "rag-ai-agent")
    assert rag_node["status"] in ("CRITICAL", "HIGH", "DEGRADED")
    assert rag_node["active_incident_id"] == incident_id

    # 4. Fetch Triage Details
    triage_resp = client.get(f"/api/v1/incidents/{incident_id}/triage")
    assert triage_resp.status_code == 200
    triage_data = triage_resp.json()
    assert triage_data["incident_id"] == incident_id
    assert "root_cause" in triage_data
    assert "sop_runbook" in triage_data

    # 5. Fetch Pipeline Progression
    pipe_resp = client.get(f"/api/v1/incidents/{incident_id}/pipeline")
    assert pipe_resp.status_code == 200
    pipe_data = pipe_resp.json()
    assert pipe_data["incident_id"] == incident_id
    assert len(pipe_data["steps"]) == 6

    # 6. Execute Remediation Override
    exec_resp = client.post(f"/api/v1/incidents/{incident_id}/execute", json={
        "override_approval": True,
        "operator_id": "test_operator@sre.com",
    })
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["success"] is True

    # 7. Fetch Post-Mortem Dossier
    pm_resp = client.get(f"/api/v1/incidents/{incident_id}/postmortem")
    assert pm_resp.status_code == 200
    pm_data = pm_resp.json()
    assert pm_data["incident_id"] == incident_id
    assert "executive_summary" in pm_data
    assert "terminal_output" in pm_data
    assert len(pm_data["timeline"]) > 0


def test_alerts_stream():
    """Verify GET /api/v1/alerts returns ingested alert stream."""
    response = client.get("/api/v1/alerts?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_slo_metrics_dynamic():
    """Verify GET /api/v1/metrics/slo returns dynamic SLO KPIs & timeseries."""
    response = client.get("/api/v1/metrics/slo?range=1h")
    assert response.status_code == 200
    data = response.json()
    assert "mttr_avg_seconds" in data
    assert "auto_resolve_pct" in data
    assert "timeseries" in data
    assert len(data["timeseries"]) > 0
