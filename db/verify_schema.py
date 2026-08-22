"""
Database Verification Script (Phase 1)
Validates pgvector installation, table structures, vector column dimensions, and indexes.
Outputs a structured JSON test report for Phase 1 sign-off.
"""

import json
import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

EXPECTED_TABLES = ["incidents", "alerts", "runbooks", "actions", "timeline", "ai_logs"]


def get_connection():
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


def run_verification():
    report = {
        "phase": 1,
        "database": POSTGRES_DB,
        "host": POSTGRES_HOST if not DATABASE_URL else DATABASE_URL.split("@")[-1].split("/")[0],
        "checks": {},
        "status": "FAIL",
        "errors": [],
    }

    try:
        conn = get_connection()
        cur = conn.cursor()
    except Exception as e:
        report["errors"].append(f"Connection failed: {str(e)}")
        return report

    try:
        # Check 1: pgvector extension
        cur.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        row = cur.fetchone()
        if row:
            report["checks"]["pgvector_extension"] = {
                "installed": True,
                "version": row[1],
            }
        else:
            report["checks"]["pgvector_extension"] = {"installed": False}
            report["errors"].append("pgvector extension is NOT installed in database.")

        # Check 2: All 6 required tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        present_tables = [r[0] for r in cur.fetchall()]
        report["checks"]["tables_present"] = [t for t in EXPECTED_TABLES if t in present_tables]
        missing_tables = [t for t in EXPECTED_TABLES if t not in present_tables]
        report["checks"]["missing_tables"] = missing_tables
        if missing_tables:
            report["errors"].append(f"Missing expected tables: {missing_tables}")

        # Check 3: Vector Column Type & Dimension in runbooks table
        cur.execute("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'runbooks' AND column_name = 'embedding';
        """)
        vec_col = cur.fetchone()
        if vec_col:
            report["checks"]["runbooks_vector_column"] = {
                "column_name": vec_col[0],
                "data_type": vec_col[1],
                "udt_name": vec_col[2],
            }
            if vec_col[2] != "vector":
                report["errors"].append(f"runbooks.embedding column udt_name is '{vec_col[2]}', expected 'vector'")
        else:
            report["checks"]["runbooks_vector_column"] = None
            report["errors"].append("Column 'embedding' missing in 'runbooks' table.")

        # Check 4: Indexes Check
        cur.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public';
        """)
        indexes = {r[0]: r[1] for r in cur.fetchall()}
        report["checks"]["indexes_count"] = len(indexes)
        report["checks"]["has_vector_index"] = any("runbooks" in k and "embedding" in v for k, v in indexes.items())

        # Check 5: Trigger Check
        cur.execute("""
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE event_object_table = 'incidents';
        """)
        triggers = [r[0] for r in cur.fetchall()]
        report["checks"]["incidents_triggers"] = triggers

        # Final Evaluation
        if not report["errors"]:
            report["status"] = "PASS"

        cur.close()
        conn.close()
    except Exception as e:
        report["errors"].append(f"Verification query error: {str(e)}")

    return report


def main():
    report = run_verification()
    print(json.dumps(report, indent=2))
    if report["status"] == "PASS":
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
