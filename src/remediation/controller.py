"""
Remediation Controller & State Machine Coordinator (Phase 4)
Integrates SafetyGuard, TelegramApprovalGate, and RemediationRunner into an automated workflow.
Synthesizes orchestration state machine from Reference Repo B (Runbook Guard core/workflow.py).
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.remediation.safety_guard import SafetyGuard, SafetyEvaluation, CommandType
from src.remediation.telegram_gate import TelegramApprovalGate
from src.remediation.runner import RemediationRunner, ExecutionReceipt

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


class RemediationController:
    def __init__(
        self,
        safety_guard: Optional[SafetyGuard] = None,
        telegram_gate: Optional[TelegramApprovalGate] = None,
        runner: Optional[RemediationRunner] = None,
    ):
        self.safety_guard = safety_guard or SafetyGuard()
        self.telegram_gate = telegram_gate or TelegramApprovalGate()
        self.runner = runner or RemediationRunner()

    def get_connection(self):
        """Establish connection to PostgreSQL."""
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

    def process_remediation(
        self,
        incident_id: str,
        command: str,
        incident_title: str = "IT Incident",
        dry_run: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Process a proposed remediation command:
        - Evaluates safety (safe vs. destructive).
        - Safe -> Auto-approves and executes directly.
        - Destructive -> Places in 'pending' and routes to Telegram Approval Gate.
        """
        clean_cmd = command.strip()
        evaluation: SafetyEvaluation = self.safety_guard.evaluate(clean_cmd)

        conn = self.get_connection()
        cur = conn.cursor()

        # 1. Create action entry in PostgreSQL
        initial_status = "auto_approved" if evaluation.is_safe else "pending"
        cur.execute(
            """
            INSERT INTO actions (incident_id, command, command_type, approval_status, approved_by, dry_run, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id::text;
            """,
            (
                incident_id,
                clean_cmd,
                evaluation.command_type.value,
                initial_status,
                "system:safety-filter" if evaluation.is_safe else None,
                True if dry_run else False,
                Json({
                    "risk_level": evaluation.risk_level,
                    "matched_rule": evaluation.matched_rule,
                    "reason": evaluation.reason,
                }),
            ),
        )
        action_id = cur.fetchone()[0]

        # 2. Append event to timeline
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, 'action_proposed', %s, 'safety-guard', %s);
            """,
            (
                incident_id,
                f"Proposed {evaluation.command_type.value.upper()} command: '{clean_cmd}'. (Risk: {evaluation.risk_level})",
                Json({"action_id": action_id, "is_safe": evaluation.is_safe, "rule": evaluation.matched_rule}),
            ),
        )

        conn.commit()
        cur.close()
        conn.close()

        # 3. Branching Logic based on Safety Evaluation
        if evaluation.is_safe:
            print(f"[OK] Command '{clean_cmd}' classified as SAFE. Auto-executing...")
            receipt = self.runner.execute_action(
                action_id=action_id,
                incident_id=incident_id,
                command=clean_cmd,
                command_type="safe",
                approval_status="auto_approved",
                dry_run=dry_run,
            )
            return {
                "action_id": action_id,
                "incident_id": incident_id,
                "command": clean_cmd,
                "command_type": "safe",
                "status": "executed",
                "exit_code": receipt.exit_code,
                "stdout": receipt.stdout,
                "stderr": receipt.stderr,
                "dry_run": receipt.dry_run,
                "duration_ms": receipt.duration_ms,
            }
        else:
            print(f"[!] Command '{clean_cmd}' classified as DESTRUCTIVE ({evaluation.risk_level}). Halting for Telegram approval...")
            tg_result = self.telegram_gate.send_approval_request(
                incident_id=incident_id,
                action_id=action_id,
                title=incident_title,
                command=clean_cmd,
                risk_level=evaluation.risk_level,
                reason=evaluation.reason,
            )
            return {
                "action_id": action_id,
                "incident_id": incident_id,
                "command": clean_cmd,
                "command_type": "destructive",
                "status": "pending_approval",
                "risk_level": evaluation.risk_level,
                "reason": evaluation.reason,
                "telegram_dispatched": tg_result.get("sent", False),
            }

    def execute_approved_action(self, action_id: str, dry_run: Optional[bool] = False) -> ExecutionReceipt:
        """Execute an action that has been approved via Telegram callback."""
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT incident_id::text, command, command_type, approval_status
            FROM actions
            WHERE id = %s;
            """,
            (action_id,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            raise ValueError(f"Action ID '{action_id}' not found.")

        incident_id, command, cmd_type, status = row
        if status != "approved":
            raise ValueError(f"Action '{action_id}' cannot be executed with status '{status}' (must be 'approved').")

        real_dry_run = False if dry_run is None else dry_run
        receipt = self.runner.execute_action(
            action_id=action_id,
            incident_id=incident_id,
            command=command,
            command_type=cmd_type,
            approval_status="approved",
            dry_run=real_dry_run,
        )

        # Mark incident as resolved in PostgreSQL
        conn_res = self.get_connection()
        cur_res = conn_res.cursor()
        cur_res.execute(
            "UPDATE incidents SET status = 'resolved', resolved_at = NOW() WHERE id = %s;",
            (incident_id,)
        )
        conn_res.commit()
        cur_res.close()
        conn_res.close()

        # Dispatch execution receipt to Telegram
        self.telegram_gate.send_execution_receipt(
            incident_id=incident_id,
            command=command,
            exit_code=receipt.exit_code,
            stdout=receipt.stdout,
            stderr=receipt.stderr,
            duration_ms=receipt.duration_ms,
        )

        # Asynchronously broadcast state update to frontend WebSocket clients
        try:
            from src.triage.events_ws import ws_manager
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(ws_manager.broadcast({
                    "type": "INCIDENT_RESOLVED",
                    "incident_id": incident_id,
                    "action_id": action_id,
                    "command": command,
                    "exit_code": receipt.exit_code,
                    "status": "resolved",
                }))
            except RuntimeError:
                asyncio.run(ws_manager.broadcast({
                    "type": "INCIDENT_RESOLVED",
                    "incident_id": incident_id,
                    "action_id": action_id,
                    "command": command,
                    "exit_code": receipt.exit_code,
                    "status": "resolved",
                }))
        except Exception:
            pass

        return receipt
