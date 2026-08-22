"""
FastAPI Webhook Service (Phases 3 & 4)
Receives inbound alert webhooks from Prometheus/Grafana and Telegram Approval callbacks.
Coordinates normalization, deduplication, Gemini AI triage, safety gating, and remediation execution.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.triage.normalizer import AlertNormalizer, NormalizedAlert
from src.triage.classifier import GeminiTriageClassifier, TriageResult
from src.remediation.controller import RemediationController
from src.remediation.telegram_gate import TelegramApprovalGate

load_dotenv(BASE_DIR / ".env")

app = FastAPI(
    title="AI-Driven Incident Response Platform",
    version="1.0.0",
    description="Autonomous incident triage and safe remediation platform powered by Google Gemini, pgvector, and Telegram gates",
)

classifier = GeminiTriageClassifier()
remediation_controller = RemediationController()
telegram_gate = TelegramApprovalGate()

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


def get_db_connection():
    if DATABASE_URL:
        if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sslmode=" not in DATABASE_URL:
            separator = "&" if "?" in DATABASE_URL else "?"
            conn_url = f"{DATABASE_URL}{separator}sslmode=require"
        else:
            conn_url = DATABASE_URL
        return psycopg2.connect(conn_url)
    else:
        sslmode = "require" if POSTGRES_HOST not in ("localhost", "127.0.0.1") else "prefer"
        return psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=POSTGRES_DB,
            sslmode=sslmode,
        )


class RemediateRequest(BaseModel):
    command: str
    dry_run: Optional[bool] = None


@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint for probe verification."""
    return {
        "status": "healthy",
        "service": "incident-response-platform",
        "version": "1.0.0",
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    }


@app.post("/webhook/alerts", response_model=List[TriageResult], status_code=status.HTTP_201_CREATED, tags=["Webhooks"])
async def receive_alerts(request: Request):
    """
    Main webhook receiver for monitoring alerts.
    Accepts Prometheus Alertmanager, Grafana, Datadog, or custom JSON alerts.
    """
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {str(e)}",
        )

    source_header = request.headers.get("X-Alert-Source", "custom")
    normalized_alerts = AlertNormalizer.normalize(payload, default_source=source_header)

    if not normalized_alerts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any valid alert items from the payload.",
        )

    results: List[TriageResult] = []
    for alert in normalized_alerts:
        result = classifier.process_alert(alert)
        results.append(result)

    return results


@app.post("/api/incidents/{incident_id}/remediate", tags=["Remediation"])
def remediate_incident(incident_id: str, req: RemediateRequest):
    """
    Propose and execute or gate a remediation command for an incident.
    Safe commands auto-execute; Destructive commands are routed to Telegram Approval Gate.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT title FROM incidents WHERE id = %s;", (incident_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident_title = row[0]
    result = remediation_controller.process_remediation(
        incident_id=incident_id,
        command=req.command,
        incident_title=incident_title,
        dry_run=req.dry_run,
    )
    return result


@app.post("/webhook/telegram", tags=["Webhooks"])
async def receive_telegram_webhook(request: Request):
    """
    Webhook receiver for Telegram inline button callbacks (Approve / Reject).
    """
    try:
        payload = await request.json()
    except Exception as e:
        return {"ok": False, "error": "invalid json"}

    # Check for callback query (button press)
    callback_query = payload.get("callback_query")
    if not callback_query:
        # Standard text message (e.g. /start or /help)
        message = payload.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        if chat_id:
            welcome_msg = (
                "🤖 <b>AI Incident Response Gate Bot Active</b>\n\n"
                "You will receive real-time approval requests with inline [Approve]/[Reject] buttons here whenever destructive remediation actions are proposed."
            )
            telegram_gate.send_execution_receipt(
                incident_id="SYSTEM",
                command="STATUS",
                exit_code=0,
                stdout=welcome_msg,
                stderr="",
                duration_ms=0,
                target_chat_id=str(chat_id),
            )
        return {"ok": True}

    callback_data = callback_query.get("data", "")
    from_user = callback_query.get("from", {})
    user_id = str(from_user.get("id", ""))
    user_name = from_user.get("username") or from_user.get("first_name", "Operator")
    message = callback_query.get("message", {})
    message_id = message.get("message_id")
    chat_id = str(message.get("chat", {}).get("id", ""))

    success, msg, action_id = telegram_gate.handle_callback(
        callback_data=callback_data,
        user_id=user_id,
        user_name=user_name,
        message_id=message_id,
        chat_id=chat_id,
    )

    # If approved, execute the action immediately!
    if success and action_id and callback_data.startswith("approve"):
        try:
            remediation_controller.execute_approved_action(action_id)
        except Exception as e:
            print(f"[ERROR] Failed to execute approved action {action_id}: {e}")

    return {"ok": success, "message": msg, "action_id": action_id}


@app.get("/api/incidents", tags=["Incidents"])
def list_incidents(limit: int = 10, status_filter: str = None):
    """Retrieve recent incidents from the database."""
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
        SELECT id::text, title, severity, status, source, created_at, updated_at, resolved_at
        FROM incidents
    """
    params = []
    if status_filter:
        query += " WHERE status = %s"
        params.append(status_filter)

    query += " ORDER BY created_at DESC LIMIT %s;"
    params.append(limit)

    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    incidents = []
    for r in rows:
        incidents.append({
            "id": r[0],
            "title": r[1],
            "severity": r[2],
            "status": r[3],
            "source": r[4],
            "created_at": str(r[5]),
            "updated_at": str(r[6]),
            "resolved_at": str(r[7]) if r[7] else None,
        })
    return incidents


@app.get("/api/incidents/{incident_id}", tags=["Incidents"])
def get_incident_details(incident_id: str):
    """Retrieve full incident details including alerts, actions, and timeline events."""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id::text, title, description, severity, status, source, created_at, postmortem FROM incidents WHERE id = %s;", (incident_id,))
    inc_row = cur.fetchone()
    if not inc_row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    cur.execute("SELECT id::text, source, fingerprint, severity, status, received_at, deduplicated FROM alerts WHERE incident_id = %s;", (incident_id,))
    alerts = [{"id": r[0], "source": r[1], "fingerprint": r[2], "severity": r[3], "status": r[4], "received_at": str(r[5]), "deduplicated": r[6]} for r in cur.fetchall()]

    cur.execute("SELECT id::text, command, command_type, approval_status, approved_by, executed_at, exit_code, dry_run, stdout, stderr FROM actions WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
    actions = [{"id": r[0], "command": r[1], "command_type": r[2], "approval_status": r[3], "approved_by": r[4], "executed_at": str(r[5]) if r[5] else None, "exit_code": r[6], "dry_run": r[7], "stdout": r[8], "stderr": r[9]} for r in cur.fetchall()]

    cur.execute("SELECT id::text, event_type, description, actor, created_at FROM timeline WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
    timeline = [{"id": r[0], "event_type": r[1], "description": r[2], "actor": r[3], "created_at": str(r[4])} for r in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        "incident": {
            "id": inc_row[0],
            "title": inc_row[1],
            "description": inc_row[2],
            "severity": inc_row[3],
            "status": inc_row[4],
            "source": inc_row[5],
            "created_at": str(inc_row[6]),
            "postmortem": inc_row[7],
        },
        "alerts": alerts,
        "actions": actions,
        "timeline": timeline,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"[*] Starting Incident Response Platform on port {port}...")
    uvicorn.run("src.triage.webhook_service:app", host="0.0.0.0", port=port, reload=False)
