"""
Phase 5 Resolution & Escalation Coordinator
Integrates VerificationEngine, PostMortemGenerator, and IncidentNotifier.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.verification.verifier import VerificationEngine, ProbeResult
from src.verification.postmortem import PostMortemGenerator
from src.verification.notifier import IncidentNotifier

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


class Phase5Coordinator:
    def __init__(
        self,
        verifier: Optional[VerificationEngine] = None,
        postmortem_gen: Optional[PostMortemGenerator] = None,
        notifier: Optional[IncidentNotifier] = None,
    ):
        self.verifier = verifier or VerificationEngine()
        self.postmortem_gen = postmortem_gen or PostMortemGenerator()
        self.notifier = notifier or IncidentNotifier()

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

    def process_incident_verification_and_closure(
        self,
        incident_id: str,
        probe_type: str = "http",
        target: str = "http://localhost:8000/health",
        retries: int = 3,
        simulated_healthy: bool = True,
    ) -> Dict[str, Any]:
        """
        Verify recovery -> If passed: generate post-mortem & resolve. If failed: escalate to on-call.
        """
        # Fetch incident title
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT title, severity FROM incidents WHERE id = %s;", (incident_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            raise ValueError(f"Incident {incident_id} not found.")

        title, severity = row

        # 1. Run Verification Probe
        probe_res: ProbeResult = self.verifier.verify_incident_recovery(
            incident_id=incident_id,
            probe_type=probe_type,
            target=target,
            retries=retries,
            simulated_healthy=simulated_healthy,
        )

        # 2. Branching: Success -> Resolve & Generate Post-Mortem
        if probe_res.is_healthy:
            postmortem_md = self.postmortem_gen.generate_and_save_postmortem(
                incident_id=incident_id,
                verification_details=f"Verification Probe ({probe_type.upper()}) passed: {probe_res.details}",
            )
            self.notifier.send_resolution_notification(
                incident_id=incident_id,
                title=title,
                severity=severity,
                verification_details=probe_res.details,
            )
            return {
                "incident_id": incident_id,
                "status": "resolved",
                "is_healthy": True,
                "verification": {
                    "probe_type": probe_res.probe_type,
                    "attempts": probe_res.attempts_made,
                    "details": probe_res.details,
                },
                "postmortem_length": len(postmortem_md),
                "postmortem_preview": postmortem_md[:400] + "...",
            }

        # 3. Branching: Failure -> Escalate to On-Call
        else:
            conn = self.get_connection()
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE incidents
                SET status = 'escalated', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (incident_id,),
            )
            cur.execute(
                """
                INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
                VALUES (%s, 'incident_escalated', 'Remediation failed verification probes. Escalated to P1 On-Call.', 'verification-coordinator', %s);
                """,
                (incident_id, Json({"reason": "Probe failure", "details": probe_res.details})),
            )
            conn.commit()
            cur.close()
            conn.close()

            self.notifier.send_escalation_alert(
                incident_id=incident_id,
                title=title,
                reason="Service failed post-remediation health verification checks.",
                failure_details=probe_res.details,
            )

            return {
                "incident_id": incident_id,
                "status": "escalated",
                "is_healthy": False,
                "verification": {
                    "probe_type": probe_res.probe_type,
                    "attempts": probe_res.attempts_made,
                    "details": probe_res.details,
                },
                "message": "Incident escalated to on-call SRE via Telegram/Email.",
            }
