import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

def get_db():
    if DATABASE_URL:
        if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sslmode=" not in DATABASE_URL:
            sep = "&" if "?" in DATABASE_URL else "?"
            return psycopg2.connect(f"{DATABASE_URL}{sep}sslmode=require")
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB,
    )

def main():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE alerts, actions, timeline, incidents, ai_logs CASCADE;")
    conn.commit()
    cur.execute("SELECT count(*) FROM alerts;")
    alert_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM incidents;")
    inc_cnt = cur.fetchone()[0]
    cur.close()
    conn.close()
    print(f"Successfully cleaned PostgreSQL database: {alert_cnt} alerts, {inc_cnt} active incidents. System at 0 errors baseline.")

if __name__ == "__main__":
    main()
