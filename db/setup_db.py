"""
Database Setup Script (Phase 1)
Synthesizes patterns from Reference Repo A (RAG_pgvector setup_db.py).
Supports both local and cloud-hosted PostgreSQL (e.g. Supabase, Neon).
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


def get_connection():
    """Establish connection using DATABASE_URL or individual parameters."""
    if DATABASE_URL:
        # Check if sslmode needs to be added for remote hosts
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


def apply_schema():
    """Apply db/init.sql to the database."""
    init_sql_path = BASE_DIR / "db" / "init.sql"
    if not init_sql_path.exists():
        raise FileNotFoundError(f"init.sql not found at {init_sql_path}")

    sql_content = init_sql_path.read_text(encoding="utf-8")

    target_desc = DATABASE_URL.split("@")[-1] if DATABASE_URL else f"{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    print(f"[*] Connecting to database at {target_desc}...")
    
    conn = get_connection()
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    print("[*] Executing schema statements from db/init.sql...")
    cur.execute(sql_content)

    print("[OK] Schema applied successfully. All tables and vector extensions initialized.")
    cur.close()
    conn.close()


def main():
    print("=" * 60)
    print("AI-Driven Incident Response - Database Setup")
    print("=" * 60)
    try:
        apply_schema()
        print("\n[SUCCESS] Phase 1 Database Setup Complete!")
        print("Run 'python db/verify_schema.py' to run full validation.")
    except Exception as e:
        print(f"\n[ERROR] Setup failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
