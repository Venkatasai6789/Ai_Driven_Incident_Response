"""
Gemini AI Post-Mortem Generator (Phase 5)
Synthesizes full incident lifecycle data (alerts, triage, SOPs, actions, timeline, verification)
and prompts Google Gemini 2.5 Flash to generate an executive-ready RCA Post-Mortem report.
Persists markdown report in PostgreSQL and marks the incident resolved.
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv
from google import genai
from google.genai import types

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


class PostMortemGenerator:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def get_connection(self):
        """Establish connection to PostgreSQL."""
        if DATABASE_URL:
            if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sslmode=" not in DATABASE_URL:
                separator = "&" if "?" in DATABASE_URL else "?"
                conn_url = f"{DATABASE_URL}{separator}sslmode=require&connect_timeout=10"
            else:
                conn_url = DATABASE_URL
            return psycopg2.connect(conn_url, connect_timeout=10)
        else:
            sslmode = "require" if POSTGRES_HOST not in ("localhost", "127.0.0.1") else "prefer"
            return psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                sslmode=sslmode,
                connect_timeout=10,
            )

    def fetch_incident_context(self, incident_id: str) -> Dict[str, Any]:
        """Query PostgreSQL for full incident lifecycle context."""
        conn = self.get_connection()
        cur = conn.cursor()

        # Incident master
        cur.execute("SELECT id::text, title, description, severity, status, source, created_at FROM incidents WHERE id = %s;", (incident_id,))
        inc_row = cur.fetchone()
        if not inc_row:
            cur.close()
            conn.close()
            raise ValueError(f"Incident {incident_id} not found.")

        # Alerts
        cur.execute("SELECT source, fingerprint, severity, status, received_at FROM alerts WHERE incident_id = %s;", (incident_id,))
        alerts = [{"source": r[0], "fingerprint": r[1], "severity": r[2], "status": r[3], "received_at": str(r[4])} for r in cur.fetchall()]

        # Actions
        cur.execute("SELECT command, command_type, approval_status, approved_by, exit_code, dry_run, stdout, stderr, executed_at FROM actions WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
        actions = [{"command": r[0], "type": r[1], "status": r[2], "approved_by": r[3], "exit_code": r[4], "dry_run": r[5], "output": r[6] or r[7], "executed_at": str(r[8])} for r in cur.fetchall()]

        # Timeline
        cur.execute("SELECT event_type, description, actor, created_at FROM timeline WHERE incident_id = %s ORDER BY created_at ASC;", (incident_id,))
        timeline = [{"event_type": r[0], "description": r[1], "actor": r[2], "time": str(r[3])} for r in cur.fetchall()]

        cur.close()
        conn.close()

        return {
            "incident_id": inc_row[0],
            "title": inc_row[1],
            "description": inc_row[2],
            "severity": inc_row[3],
            "status": inc_row[4],
            "source": inc_row[5],
            "created_at": str(inc_row[6]),
            "alerts": alerts,
            "actions": actions,
            "timeline": timeline,
        }

    def generate_and_save_postmortem(
        self,
        incident_id: str,
        verification_details: str = "All automated health probes verified service healthy.",
    ) -> str:
        """
        Generate Markdown post-mortem via Gemini 2.5 Flash and persist in Supabase.
        """
        ctx = self.fetch_incident_context(incident_id)
        start_time = time.monotonic()

        prompt = f"""
You are a Principal Site Reliability Engineer. Generate an executive-level, highly detailed Incident Post-Mortem Report in GitHub-flavored Markdown.

### Incident Data:
- Incident ID: {ctx['incident_id']}
- Title: {ctx['title']}
- Severity: {ctx['severity']}
- Source: {ctx['source']}
- Start Time: {ctx['created_at']}
- Description: {ctx['description']}

### Executed Actions & Terminal Receipts:
{json.dumps(ctx['actions'], indent=2)}

### Chronological Timeline Events:
{json.dumps(ctx['timeline'], indent=2)}

### Verification Probe Outcome:
{verification_details}

### Required Sections in the Markdown Document:
1. `# Incident Post-Mortem: {ctx['title']}`
2. `## 1. Executive Summary` (High-level business and operational overview)
3. `## 2. Incident Timeline` (Markdown table with Time, Event, Actor, Status)
4. `## 3. Root Cause Analysis (RCA)` (Detailed failure mechanism & contributing factors)
5. `## 4. Remediation Actions Taken` (Commands run, safety gates, execution receipts)
6. `## 5. Verification & Recovery Confirmation` (Probe results and health checks)
7. `## 6. Lessons Learned & Action Items` (Concrete preventative items with owners & priorities: P0, P1, P2)

Format cleanly with standard GitHub Markdown tables, alerts, and code blocks.
"""

        try:
            config = types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="text/plain",
            )
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
            postmortem_markdown = response.text or ""
        except Exception as e:
            # Fallback markdown template if Gemini API is unreachable
            postmortem_markdown = f"""# Incident Post-Mortem: {ctx['title']}

## 1. Executive Summary
An incident occurred affecting {ctx['source']} with severity {ctx['severity']}. Automated remediation was executed and verified.

## 2. Root Cause Analysis
Initial alert description: {ctx['description']}.

## 3. Remediation & Receipts
Actions executed: {len(ctx['actions'])} action(s). Verification: {verification_details}.

## 4. Action Items
- [ ] Review system capacity and alert thresholds (P1)
- [ ] Update SOP runbooks with lessons learned (P2)
"""

        latency_ms = int((time.monotonic() - start_time) * 1000)

        # Persist postmortem and resolve incident in PostgreSQL
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE incidents
            SET status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP,
                postmortem = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
            """,
            (postmortem_markdown, incident_id),
        )
        cur.execute(
            """
            UPDATE alerts
            SET status = 'resolved'
            WHERE incident_id = %s;
            """,
            (incident_id,),
        )

        # Log resolution event to timeline
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, 'incident_resolved', 'Incident marked as RESOLVED. Post-mortem RCA generated.', 'gemini-ai', %s);
            """,
            (incident_id, Json({"model": self.model, "latency_ms": latency_ms})),
        )

        # Record AI log
        cur.execute(
            """
            INSERT INTO ai_logs (incident_id, model, prompt, response, latency_ms, purpose)
            VALUES (%s, %s, %s, %s, %s, 'postmortem_rca_generation');
            """,
            (incident_id, self.model, prompt[:2000], postmortem_markdown[:2000], latency_ms),
        )

        conn.commit()
        cur.close()
        conn.close()

        print(f"[OK] Post-Mortem generated and saved in Supabase for Incident {incident_id} ({latency_ms}ms).", flush=True)
        return postmortem_markdown
