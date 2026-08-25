"""
Comprehensive Edge-Case & Stress Engineering Test Suite for API V1 & WebSockets.
Tests ALL 10 dynamic API endpoints and the WebSocket endpoint under diverse boundary conditions,
invalid inputs, edge cases, and state transitions.
"""

import json
import pytest
from fastapi.testclient import TestClient
from src.triage.webhook_service import app

client = TestClient(app)


# =============================================================================
# 1. GET /api/v1/system/overview under varying DB state & boundary conditions
# =============================================================================
def test_system_overview_boundary_and_schema():
    """Verify GET /api/v1/system/overview returns accurate cluster health and engine metrics."""
    response = client.get("/api/v1/system/overview")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    # Required top-level keys
    assert "cluster_health" in data
    assert "slo_uptime_pct" in data
    assert "active_incidents" in data
    assert "inference_engine" in data
    assert "vector_index" in data

    # Cluster health enum check
    assert data["cluster_health"] in ("OPERATIONAL", "DEGRADED", "CRITICAL")
    assert isinstance(data["slo_uptime_pct"], (int, float))

    # Active incidents metrics dictionary check
    inc_data = data["active_incidents"]
    for key in ("critical", "high", "degraded", "total_unresolved"):
        assert key in inc_data
        assert isinstance(inc_data[key], int)
        assert inc_data[key] >= 0

    assert inc_data["total_unresolved"] == inc_data["critical"] + inc_data["high"] + inc_data["degraded"]

    # Inference engine telemetry check
    inf_data = data["inference_engine"]
    assert "model" in inf_data
    assert inf_data["status"] == "ACTIVE"
    assert isinstance(inf_data["p99_latency_ms"], int)

    # Vector index telemetry check
    vec_data = data["vector_index"]
    assert vec_data["engine"] == "pgvector"
    assert vec_data["index_type"] == "HNSW"
    assert isinstance(vec_data["total_runbooks"], int)
    assert isinstance(vec_data["average_match_rate"], (int, float))


# =============================================================================
# 2. GET /api/v1/topology/mesh node verification & health state transitions
# =============================================================================
def test_topology_mesh_nodes_and_health_transitions():
    """Verify topology mesh contains all 6 n8n workflow nodes and health state transitions."""
    # 1. Initial topology fetch
    response = client.get("/api/v1/topology/mesh")
    assert response.status_code == 200
    data = response.json()

    assert "nodes" in data
    assert "edges" in data

    expected_node_ids = {
        "alert-webhook",
        "normalizer",
        "rag-ai-agent",
        "fastapi-dispatcher",
        "telegram-notifier",
        "supabase-db",
    }
    actual_node_ids = {n["id"] for n in data["nodes"]}
    assert expected_node_ids == actual_node_ids, f"Mismatch in node IDs: {actual_node_ids}"

    # Verify node structure
    for node in data["nodes"]:
        assert "id" in node
        assert "name" in node
        assert "status" in node
        assert node["status"] in ("NOMINAL", "DEGRADED", "HIGH", "CRITICAL")
        assert "latency_ms" in node
        assert isinstance(node["latency_ms"], int)
        assert "active_incident_id" in node

    # Verify edge structure
    for edge in data["edges"]:
        assert "from" in edge
        assert "to" in edge
        assert "status" in edge
        assert edge["status"] in ("HEALTHY", "DEGRADED")
        assert "p99_ms" in edge

    # 2. Inject a chaos incident to trigger state transition in topology mesh
    chaos_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-oom"})
    assert chaos_resp.status_code == 200
    inc_id = chaos_resp.json()["incident_id"]

    # 3. Verify state transition in topology mesh after incident injection
    post_topo_resp = client.get("/api/v1/topology/mesh")
    assert post_topo_resp.status_code == 200
    post_nodes = post_topo_resp.json()["nodes"]

    rag_node = next(n for n in post_nodes if n["id"] == "rag-ai-agent")
    assert rag_node["status"] in ("CRITICAL", "HIGH", "DEGRADED")
    assert rag_node["active_incident_id"] == inc_id


# =============================================================================
# 3. POST /api/v1/chaos/inject for all 5 scenarios & invalid experiment IDs
# =============================================================================
@pytest.mark.parametrize("exp_id,expected_scenario", [
    ("exp-oom", "V8 Heap Exhaustion"),
    ("exp-db", "DB Connection Pool Saturation"),
    ("exp-disk", "Disk Volume Threshold Spike"),
    ("exp-security", "Adversarial Ingress / SQLi"),
    ("exp-rag", "Low-Similarity Anomaly"),
])
def test_chaos_inject_all_valid_scenarios(exp_id, expected_scenario):
    """Test chaos injection for all 5 supported scenarios."""
    payload = {
        "experiment_id": exp_id,
        "dry_run": True,
    }
    response = client.post("/api/v1/chaos/inject", json=payload)
    assert response.status_code == 200, f"Failed for scenario {exp_id}: {response.text}"
    data = response.json()

    assert data["success"] is True
    assert data["scenario"] == expected_scenario
    assert data["status"] == "TRIAGING"
    assert "incident_id" in data
    assert isinstance(data["incident_id"], str)
    assert len(data["incident_id"]) > 0
    assert "spawned_at" in data


def test_chaos_inject_custom_target_and_dry_run_flag():
    """Test chaos injection with explicit target_service override and dry_run=False."""
    payload = {
        "experiment_id": "exp-db",
        "target_service": "custom-db-cluster-01",
        "dry_run": False,
    }
    response = client.post("/api/v1/chaos/inject", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "incident_id" in data


@pytest.mark.parametrize("invalid_exp_id", [
    "exp-nonexistent",
    "exp-unknown",
    "",
    "EXP-OOM",
    "invalid_scenario_123",
])
def test_chaos_inject_invalid_experiment_ids(invalid_exp_id):
    """Verify POST /api/v1/chaos/inject returns HTTP 400 for unknown experiment IDs."""
    payload = {
        "experiment_id": invalid_exp_id,
        "dry_run": True,
    }
    response = client.post("/api/v1/chaos/inject", json=payload)
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "Unknown experiment_id" in response.json()["detail"]


def test_chaos_inject_missing_payload_fields():
    """Verify POST /api/v1/chaos/inject returns HTTP 422 for missing required fields."""
    response = client.post("/api/v1/chaos/inject", json={})
    assert response.status_code == 422


# =============================================================================
# 4. GET /api/v1/alerts stream filters and limit boundary conditions
# =============================================================================
@pytest.mark.parametrize("status_filter,limit", [
    ("active", 5),
    ("all", 1),
    ("firing", 10),
    ("resolved", 50),
    ("unknown_status", 5),
])
def test_alerts_stream_filters_and_limits(status_filter, limit):
    """Test GET /api/v1/alerts stream with various status filters and limit boundaries."""
    response = client.get(f"/api/v1/alerts?status_filter={status_filter}&limit={limit}")
    assert response.status_code == 200, f"Failed for filter={status_filter}, limit={limit}: {response.text}"
    data = response.json()

    assert isinstance(data, list)
    assert len(data) <= limit

    for alert in data:
        assert "id" in alert
        assert "incident_id" in alert
        assert "severity" in alert
        assert "title" in alert
        assert "service" in alert
        assert "metric" in alert
        assert "source" in alert
        assert "created_at" in alert


def test_alerts_stream_boundary_limit_zero():
    """Test GET /api/v1/alerts with limit=0 boundary."""
    response = client.get("/api/v1/alerts?limit=0")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


# =============================================================================
# 5. GET /api/v1/incidents/{id}/triage valid vs non-existent UUIDs
# =============================================================================
def test_incident_triage_valid_id():
    """Test GET /api/v1/incidents/{id}/triage with valid incident ID."""
    # Create incident via chaos injection
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-oom"})
    assert inject_resp.status_code == 200
    incident_id = inject_resp.json()["incident_id"]

    response = client.get(f"/api/v1/incidents/{incident_id}/triage")
    assert response.status_code == 200
    data = response.json()

    assert data["incident_id"] == incident_id
    assert "root_cause" in data
    assert "confidence_score" in data
    assert isinstance(data["confidence_score"], (int, float))

    # Check SOP runbook structure
    assert "sop_runbook" in data
    sop = data["sop_runbook"]
    assert "id" in sop
    assert "title" in sop
    assert "cosine_similarity" in sop

    # Check Guardrail structure
    assert "guardrail" in data
    guard = data["guardrail"]
    assert "action_classification" in guard
    assert "requires_telegram_approval" in guard
    assert "risk_level" in guard
    assert "blast_radius" in guard

    # Check evidence sources
    assert "evidence_sources" in data
    assert isinstance(data["evidence_sources"], list)


@pytest.mark.parametrize("invalid_id", [
    "00000000-0000-0000-0000-000000000000",
    "non-existent-uuid-12345",
    "invalid-id",
])
def test_incident_triage_nonexistent_id(invalid_id):
    """Test GET /api/v1/incidents/{id}/triage returns HTTP 404 for non-existent incident UUID."""
    response = client.get(f"/api/v1/incidents/{invalid_id}/triage")
    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"


# =============================================================================
# 6. GET /api/v1/incidents/active spotlight verification
# =============================================================================
def test_active_spotlight_incident():
    """Verify GET /api/v1/incidents/active handles active spotlight state."""
    # 1. Inject an incident to ensure an active incident is present
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-security"})
    assert inject_resp.status_code == 200
    injected_id = inject_resp.json()["incident_id"]

    # 2. Fetch active spotlight incident
    response = client.get("/api/v1/incidents/active")
    assert response.status_code == 200
    data = response.json()

    assert "incident_id" in data
    assert "title" in data
    assert "service" in data
    assert "severity" in data
    assert "description" in data
    assert "confidence" in data
    assert "sop_matched" in data
    assert "status" in data

    # If active incident present, incident_id should match or be a valid string
    if data["incident_id"] is not None:
        assert isinstance(data["incident_id"], str)
        assert data["status"] in ("OPEN", "INVESTIGATING", "TRIAGING", "MITIGATING", "CRITICAL", "HIGH", "MEDIUM")


# =============================================================================
# 7. GET /api/v1/incidents/{id}/pipeline verifying all 6 stages
# =============================================================================
def test_remediation_pipeline_all_stages():
    """Verify GET /api/v1/incidents/{id}/pipeline returns all 6 stages."""
    # Inject an incident
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-disk"})
    assert inject_resp.status_code == 200
    incident_id = inject_resp.json()["incident_id"]

    response = client.get(f"/api/v1/incidents/{incident_id}/pipeline")
    assert response.status_code == 200
    data = response.json()

    assert data["incident_id"] == incident_id
    assert "current_step_index" in data
    assert isinstance(data["current_step_index"], int)
    assert 1 <= data["current_step_index"] <= 6

    assert "steps" in data
    steps = data["steps"]
    assert len(steps) == 6

    expected_labels = ["Ingest", "Vector", "Triage", "Guardrail", "Execute", "Verify"]
    for idx, step in enumerate(steps):
        assert step["id"] == idx + 1
        assert step["label"] == expected_labels[idx]
        assert "timestamp" in step
        assert "status" in step
        assert step["status"] in ("completed", "active", "pending")

    assert "proposed_command" in data
    assert "risk_level" in data
    assert "category" in data
    assert "next_step_label" in data
    assert "next_step_status" in data


def test_remediation_pipeline_nonexistent_id():
    """Verify GET /api/v1/incidents/{id}/pipeline returns HTTP 404 for non-existent ID."""
    response = client.get("/api/v1/incidents/nonexistent-pipeline-id/pipeline")
    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"


# =============================================================================
# 8. POST /api/v1/incidents/{id}/execute override execution & defaults
# =============================================================================
def test_remediation_execute_override():
    """Verify POST /api/v1/incidents/{id}/execute executes override command successfully."""
    # Inject an incident
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-oom"})
    assert inject_resp.status_code == 200
    incident_id = inject_resp.json()["incident_id"]

    # Execute override
    payload = {
        "override_approval": True,
        "operator_id": "test_sre_lead@company.com",
    }
    exec_resp = client.post(f"/api/v1/incidents/{incident_id}/execute", json=payload)
    assert exec_resp.status_code == 200
    data = exec_resp.json()

    assert data["success"] is True
    assert data["incident_id"] == incident_id
    assert "executed_command" in data
    assert data["operator_id"] == "test_sre_lead@company.com"
    assert "result" in data


def test_remediation_execute_default_payload():
    """Verify POST /api/v1/incidents/{id}/execute works with empty payload defaults."""
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-rag"})
    assert inject_resp.status_code == 200
    incident_id = inject_resp.json()["incident_id"]

    exec_resp = client.post(f"/api/v1/incidents/{incident_id}/execute", json={})
    assert exec_resp.status_code == 200
    data = exec_resp.json()

    assert data["success"] is True
    assert data["operator_id"] == "p.venkatsai333@gmail.com"


# =============================================================================
# 9. GET /api/v1/metrics/slo for ranges 1h, 24h, 7d & defaults
# =============================================================================
@pytest.mark.parametrize("time_range", ["1h", "24h", "7d"])
def test_slo_metrics_all_ranges(time_range):
    """Verify GET /api/v1/metrics/slo works for time ranges 1h, 24h, and 7d."""
    response = client.get(f"/api/v1/metrics/slo?range={time_range}")
    assert response.status_code == 200
    data = response.json()

    assert data["time_range"] == time_range
    assert "mttr_avg_seconds" in data
    assert isinstance(data["mttr_avg_seconds"], (int, float))
    assert "auto_resolve_pct" in data
    assert isinstance(data["auto_resolve_pct"], (int, float))
    assert "incidents_resolved_count" in data
    assert isinstance(data["incidents_resolved_count"], int)
    assert "triage_precision_pct" in data
    assert isinstance(data["triage_precision_pct"], (int, float))

    assert "timeseries" in data
    assert isinstance(data["timeseries"], list)
    assert len(data["timeseries"]) == 7

    for point in data["timeseries"]:
        assert "time" in point
        assert "mttr" in point
        assert "accuracy" in point
        assert "volume" in point


def test_slo_metrics_default_range_and_invalid_param():
    """Verify GET /api/v1/metrics/slo fallback for default and custom range strings."""
    # Default without query param
    resp_def = client.get("/api/v1/metrics/slo")
    assert resp_def.status_code == 200
    assert resp_def.json()["time_range"] == "1h"

    # Arbitrary range parameter
    resp_custom = client.get("/api/v1/metrics/slo?range=30d")
    assert resp_custom.status_code == 200
    assert resp_custom.json()["time_range"] == "30d"


# =============================================================================
# 10. GET /api/v1/incidents/{id}/postmortem valid vs non-existent UUIDs
# =============================================================================
def test_postmortem_dossier_valid_id():
    """Verify GET /api/v1/incidents/{id}/postmortem returns complete RCA dossier."""
    # Inject incident
    inject_resp = client.post("/api/v1/chaos/inject", json={"experiment_id": "exp-oom"})
    assert inject_resp.status_code == 200
    incident_id = inject_resp.json()["incident_id"]

    response = client.get(f"/api/v1/incidents/{incident_id}/postmortem")
    assert response.status_code == 200
    data = response.json()

    assert data["incident_id"] == incident_id
    assert "title" in data
    assert "executive_summary" in data

    assert "impact" in data
    impact = data["impact"]
    assert "service" in impact
    assert "severity" in impact
    assert "duration" in impact

    assert "root_cause_analysis" in data
    assert "terminal_output" in data

    assert "timeline" in data
    assert isinstance(data["timeline"], list)
    assert len(data["timeline"]) > 0

    assert "preventative_measures" in data
    assert isinstance(data["preventative_measures"], list)

    assert "action_items" in data
    assert isinstance(data["action_items"], list)


@pytest.mark.parametrize("invalid_id", [
    "00000000-0000-0000-0000-000000000000",
    "non-existent-pm-id",
    "invalid-uuid",
])
def test_postmortem_dossier_nonexistent_id(invalid_id):
    """Verify GET /api/v1/incidents/{id}/postmortem returns HTTP 404 for non-existent incident ID."""
    response = client.get(f"/api/v1/incidents/{invalid_id}/postmortem")
    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"


# =============================================================================
# 11. WS /api/v1/ws/events WebSocket connection and heartbeat
# =============================================================================
def test_websocket_events_connection_and_heartbeat():
    """Test WS /api/v1/ws/events WebSocket connection and bidirectional heartbeat ACK."""
    with client.websocket_connect("/api/v1/ws/events") as websocket:
        # Send heartbeat ping
        websocket.send_text("PING")

        # Receive ACK response
        data = websocket.receive_json()
        assert data["type"] == "HEARTBEAT_ACK"
        assert data["client_msg"] == "PING"

        # Send structured payload
        custom_payload = json.dumps({"action": "check_status", "timestamp": 1000})
        websocket.send_text(custom_payload)

        data_2 = websocket.receive_json()
        assert data_2["type"] == "HEARTBEAT_ACK"
        assert data_2["client_msg"] == custom_payload
