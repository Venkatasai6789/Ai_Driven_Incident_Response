"""
Remediation Execution Runner (Phase 4)
Executes approved remediation commands locally or via remote SSH.
Enforces dry-run-first safety policies and records execution receipts in PostgreSQL.
Synthesizes runner architecture from Reference Repo B (Runbook Guard sandbox/local_runner.py).
"""

import os
import shlex
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


@dataclass
class ExecutionReceipt:
    action_id: str
    incident_id: str
    command: str
    command_type: str
    approval_status: str
    exit_code: int
    stdout: str
    stderr: str
    dry_run: bool
    duration_ms: int
    executed_at: str


class RemediationRunner:
    """
    Subprocess and SSH execution runner with dry-run support.
    Persists full terminal stdout/stderr receipts in the `actions` table.
    """

    def __init__(self, dry_run_default: bool = False, timeout_seconds: int = 60):
        self.dry_run_default = dry_run_default
        self.timeout_seconds = timeout_seconds

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

    def execute_action(
        self,
        action_id: str,
        incident_id: str,
        command: str,
        command_type: str = "safe",
        approval_status: str = "approved",
        dry_run: Optional[bool] = None,
        ssh_host: Optional[str] = None,
        ssh_user: Optional[str] = None,
    ) -> ExecutionReceipt:
        """
        Execute an approved remediation command and write the receipt to Supabase.
        """
        is_dry_run = self.dry_run_default if dry_run is None else dry_run
        start_time = time.monotonic()
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # 1. Handle Dry-Run Mode
        if is_dry_run:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            mock_stdout = f"[DRY-RUN RECEIPT] Command would have been executed: {command}"
            receipt = ExecutionReceipt(
                action_id=action_id,
                incident_id=incident_id,
                command=command,
                command_type=command_type,
                approval_status=approval_status,
                exit_code=0,
                stdout=mock_stdout,
                stderr="",
                dry_run=True,
                duration_ms=duration_ms,
                executed_at=timestamp_str,
            )
            self._persist_receipt(receipt)
            return receipt

        # 2. Real Execution (Local Subprocess / SSH)
        stdout_text = ""
        stderr_text = ""
        exit_code = 0

        try:
            # Check if remote SSH execution is specified
            if ssh_host and ssh_user:
                ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", f"{ssh_user}@{ssh_host}", command]
                proc = subprocess.run(
                    ssh_cmd,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                    shell=False,
                )
            else:
                # Local execution (handling Windows vs POSIX gracefully)
                use_shell = sys.platform == "win32"
                proc = subprocess.run(
                    command if use_shell else shlex.split(command),
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                    shell=use_shell,
                )

            stdout_text = proc.stdout or ""
            stderr_text = proc.stderr or ""
            exit_code = proc.returncode

        except subprocess.TimeoutExpired:
            exit_code = 124
            stderr_text = f"Execution timed out after {self.timeout_seconds} seconds."
        except Exception as e:
            exit_code = 1
            stderr_text = f"Execution error: {str(e)}"

        duration_ms = int((time.monotonic() - start_time) * 1000)

        receipt = ExecutionReceipt(
            action_id=action_id,
            incident_id=incident_id,
            command=command,
            command_type=command_type,
            approval_status=approval_status,
            exit_code=exit_code,
            stdout=stdout_text,
            stderr=stderr_text,
            dry_run=False,
            duration_ms=duration_ms,
            executed_at=timestamp_str,
        )

        self._persist_receipt(receipt)
        return receipt

    def _persist_receipt(self, receipt: ExecutionReceipt):
        """Update actions table and append execution event to timeline in database."""
        conn = self.get_connection()
        cur = conn.cursor()

        # Update action row
        cur.execute(
            """
            UPDATE actions
            SET executed_at = CURRENT_TIMESTAMP,
                exit_code = %s,
                stdout = %s,
                stderr = %s,
                dry_run = %s,
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{duration_ms}',
                    %s::jsonb
                )
            WHERE id = %s;
            """,
            (
                receipt.exit_code,
                receipt.stdout,
                receipt.stderr,
                receipt.dry_run,
                Json(receipt.duration_ms),
                receipt.action_id,
            ),
        )

        # Append execution receipt to timeline
        status_label = "SUCCESS" if receipt.exit_code == 0 else f"FAILED (code {receipt.exit_code})"
        cur.execute(
            """
            INSERT INTO timeline (incident_id, event_type, description, actor, metadata)
            VALUES (%s, 'action_executed', %s, 'remediation-runner', %s);
            """,
            (
                receipt.incident_id,
                f"Executed '{receipt.command}' -> {status_label}. (Dry-run: {receipt.dry_run})",
                Json({
                    "action_id": receipt.action_id,
                    "exit_code": receipt.exit_code,
                    "duration_ms": receipt.duration_ms,
                    "dry_run": receipt.dry_run,
                }),
            ),
        )

        conn.commit()
        cur.close()
        conn.close()
