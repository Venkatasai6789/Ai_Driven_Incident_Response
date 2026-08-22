"""
Gemini AI Triage & Classification Engine (Phase 3)
Enriches incoming alerts with pgvector RAG SOP runbooks and uses Google Gemini to generate:
- Severity Classification (Critical / High / Medium / Low)
- Root-Cause Hypothesis
- Diagnostic Summary & Recommended Safe/Destructive Remediation Steps
- Full audit persistence in incidents, alerts, timeline, and ai_logs tables.
"""

import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.rag.search import RunbookSearchEngine, SearchResult
from src.triage.normalizer import NormalizedAlert

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class TriageResult(BaseModel):
    incident_id: str
    alert_id: str
    is_duplicate: bool
    title: str
    severity: str = Field(..., description="Critical, High, Medium, Low")
    status: str = "open"
    root_cause_hypothesis: str
    diagnostic_summary: str
    recommended_safe_command: Optional[str] = None
    recommended_destructive_command: Optional[str] = None
    matched_runbook_title: Optional[str] = None
    matched_runbook_file: Optional[str] = None
    similarity_score: float = 0.0
    model_used: str = GEMINI_MODEL
    latency_ms: int = 0


class GeminiTriageClassifier:
    def __init__(self, search_engine: Optional[RunbookSearchEngine] = None):
        self.search_engine = search_engine or RunbookSearchEngine(similarity_threshold=0.55)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment.")
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = GEMINI_MODEL

    def get_connection(self):
        """Establish database connection."""
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

    def process_alert(self, alert: NormalizedAlert) -> TriageResult:
        """End-to-end alert triage: deduplication, RAG retrieval, Gemini classification, DB persistence."""
        conn = self.get_connection()
        cur = conn.cursor()

        # 1. Deduplication Check via unique fingerprint
        cur.execute(
            """
            SELECT a.id::text, a.incident_id::text, i.severity, i.status, i.title, i.description
            FROM alerts a
            LEFT JOIN incidents i ON a.incident_id = i.id
            WHERE a.fingerprint = %s AND a.status = 'firing'
            ORDER BY a.received_at DESC
            LIMIT 1;
            """,
            (alert.fingerprint,),
        )
        existing = cur.fetchone()

        if existing:
            # Mark duplicate alert in database
            alert_id_val = existing[0]
            incident_id_val = existing[1] or ""
            
            cur.execute(
                """
                INSERT INTO alerts (incident_id, source, fingerprint, raw_payload, normalized_payload, severity, status, deduplicated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id::text;
                """,
                (
                    incident_id_val if incident_id_val else None,
                    alert.source,
                    f"{alert.fingerprint}_dup_{int(time.time()*1000)}",
                    Json(alert.raw_payload),
                    Json(alert.model_dump(mode="json")),
                    alert.severity,
                    alert.status,
                ),
            )
            dup_alert_id = cur.fetchone()[0]

            # Add deduplication event to timeline
            if incident_id_val:
                cur.execute(
                    """
                    INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
                    VALUES (%s, 'alert_deduplicated', %s, 'normalizer', %s);
                    """,
                    (
                        incident_id_val,
                        f"Duplicate alert received from {alert.source}: {alert.alert_name}",
                        Json({"fingerprint": alert.fingerprint, "original_alert_id": alert_id_val}),
                    ),
                )

            conn.commit()
            cur.close()
            conn.close()

            return TriageResult(
                incident_id=incident_id_val,
                alert_id=dup_alert_id,
                is_duplicate=True,
                title=f"[DUPLICATE] {alert.alert_name}",
                severity=existing[2] or alert.severity,
                status=existing[3] or "open",
                root_cause_hypothesis="Duplicate firing alert detected. Appended to existing active incident timeline.",
                diagnostic_summary=f"Matches active incident {incident_id_val}",
            )

        # 2. Query pgvector for relevant SOP Runbooks (RAG Step)
        rag_query = f"{alert.alert_name} {alert.description} {alert.service}"
        matched_sops: List[SearchResult] = self.search_engine.search(rag_query, limit=2)

        sop_context = ""
        top_sop_title = None
        top_sop_file = None
        top_sop_score = 0.0

        if matched_sops:
            top_sop = matched_sops[0]
            top_sop_title = top_sop.title
            top_sop_file = top_sop.source_file
            top_sop_score = top_sop.similarity_score

            sop_context = "\n\n".join(
                [f"=== SOP: {sop.title} ({sop.source_file}, Similarity: {sop.similarity_score*100:.1f}%) ===\n{sop.content}" for sop in matched_sops]
            )

        # 3. Gemini LLM Classification & Reasoning Prompt
        prompt = f"""You are an elite Site Reliability Engineering (SRE) Incident Commander.
Analyze the following IT infrastructure alert and generate a structured JSON triage response.

ALERT DETAILS:
- Source: {alert.source}
- Alert Name: {alert.alert_name}
- Target Service: {alert.service}
- Target Host/Instance: {alert.instance}
- Description/Logs: {alert.description}
- Raw Severity: {alert.severity}

RELEVANT STANDARD OPERATING PROCEDURES (SOP RAG CONTEXT):
{sop_context if sop_context else "No direct matching SOP found."}

Provide your analysis in STRICT JSON format with EXACTLY the following keys:
{{
  "title": "Concise, professional incident title",
  "severity": "One of: Critical, High, Medium, Low",
  "root_cause_hypothesis": "Detailed technical hypothesis of why this incident occurred",
  "diagnostic_summary": "Summary of diagnostic indicators and observed anomalies",
  "recommended_safe_command": "A single non-destructive remediation command (e.g. docker restart <container>, systemctl reload <svc>), or null",
  "recommended_destructive_command": "A destructive or high-risk command requiring approval (e.g. kill -9, reboot, systemctl restart db), or null",
  "remediation_notes": "Step-by-step guidance for the on-call engineer"
}}
"""

        start_time = time.time()
        ai_response_text = ""
        token_count = 0
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            ai_response_text = response.text or ""
            latency_ms = int((time.time() - start_time) * 1000)
            parsed_ai = json.loads(ai_response_text)
        except Exception as e:
            # Fallback if AI call encounters rate limit/error
            latency_ms = int((time.time() - start_time) * 1000)
            parsed_ai = {
                "title": f"Incident: {alert.alert_name} on {alert.service}",
                "severity": alert.severity,
                "root_cause_hypothesis": f"Automated fallback hypothesis for {alert.alert_name}: Service anomaly detected on {alert.instance}.",
                "diagnostic_summary": alert.description,
                "recommended_safe_command": f"docker restart {alert.service}" if "container" in alert.description.lower() else None,
                "recommended_destructive_command": None,
                "remediation_notes": "Follow standard operating procedures.",
            }
            ai_response_text = json.dumps(parsed_ai)

        # 4. Insert into `incidents` table
        cur.execute(
            """
            INSERT INTO incidents (title, description, severity, status, source)
            VALUES (%s, %s, %s, 'open', %s)
            RETURNING id::text;
            """,
            (
                parsed_ai.get("title", alert.alert_name),
                f"{parsed_ai.get('diagnostic_summary', '')}\n\nRoot Cause Hypothesis: {parsed_ai.get('root_cause_hypothesis', '')}",
                parsed_ai.get("severity", alert.severity),
                alert.source,
            ),
        )
        incident_id = cur.fetchone()[0]

        # 5. Insert into `alerts` table
        cur.execute(
            """
            INSERT INTO alerts (incident_id, source, fingerprint, raw_payload, normalized_payload, severity, status, deduplicated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE)
            RETURNING id::text;
            """,
            (
                incident_id,
                alert.source,
                alert.fingerprint,
                Json(alert.raw_payload),
                Json(alert.model_dump(mode="json")),
                parsed_ai.get("severity", alert.severity),
                alert.status,
            ),
        )
        alert_id = cur.fetchone()[0]

        # 6. Insert into `ai_logs` table (Audit trail)
        cur.execute(
            """
            INSERT INTO ai_logs (incident_id, model, prompt, response, token_count, latency_ms, purpose)
            VALUES (%s, %s, %s, %s, %s, %s, 'triage_and_root_cause');
            """,
            (
                incident_id,
                self.model_name,
                prompt,
                ai_response_text,
                len(prompt.split()) + len(ai_response_text.split()),
                latency_ms,
            ),
        )

        # 7. Insert into `timeline` table
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, 'incident_created', %s, 'gemini-ai', %s);
            """,
            (
                incident_id,
                f"Incident created with severity {parsed_ai.get('severity')}. Root cause hypothesis: {parsed_ai.get('root_cause_hypothesis')[:150]}...",
                Json({
                    "alert_id": alert_id,
                    "matched_sop": top_sop_title,
                    "similarity": top_sop_score,
                    "latency_ms": latency_ms,
                }),
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

        return TriageResult(
            incident_id=incident_id,
            alert_id=alert_id,
            is_duplicate=False,
            title=parsed_ai.get("title", alert.alert_name),
            severity=parsed_ai.get("severity", alert.severity),
            status="open",
            root_cause_hypothesis=parsed_ai.get("root_cause_hypothesis", ""),
            diagnostic_summary=parsed_ai.get("diagnostic_summary", ""),
            recommended_safe_command=parsed_ai.get("recommended_safe_command"),
            recommended_destructive_command=parsed_ai.get("recommended_destructive_command"),
            matched_runbook_title=top_sop_title,
            matched_runbook_file=top_sop_file,
            similarity_score=top_sop_score,
            model_used=self.model_name,
            latency_ms=latency_ms,
        )
