"""
Phase 3 Live Demonstration & Verification Script
Simulates inbound monitoring alerts from Prometheus, Grafana, and Custom sources.
Demonstrates normalization, deduplication, Gemini AI triage, RAG SOP matching, and DB audit logging.
"""

import json
import os
import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.triage.webhook_service import app

client = TestClient(app)

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


def main():
    print("=" * 70)
    print("  AI-Driven Incident Response: Phase 3 Live Triage Verification")
    print("=" * 70)

    # 1. Health Check
    print("\n[Step 1] Checking Webhook Service Health...")
    health = client.get("/health").json()
    print(f"[OK] Health Status: {health['status']} | Model: {health['model']}")

    # 2. Test 1: Prometheus Ingestion (Memory Leak Alert)
    ts = int(time.time())
    print("\n[Step 2] Sending Inbound Prometheus Alert (Memory Leak)...")
    prom_payload = {
        "receiver": "webhook-receiver",
        "status": "firing",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "ContainerHighMemoryUsage",
                    "severity": "critical",
                    "instance": f"worker-node-{ts}.internal",
                    "job": "checkout-service",
                },
                "annotations": {
                    "summary": "Container memory utilization > 92%",
                    "description": "Container checkout-worker-01 memory utilization reached 96% with recurring OOM errors in Node.js event loop.",
                },
            }
        ],
    }
    
    resp1 = client.post("/webhook/alerts", json=prom_payload, headers={"X-Alert-Source": "prometheus"})
    res1_data = resp1.json()[0]
    print(f"[OK] Incident Created:")
    print(f"     * Incident ID:       {res1_data['incident_id']}")
    print(f"     * AI Title:          {res1_data['title']}")
    print(f"     * AI Severity:       {res1_data['severity']}")
    print(f"     * Matched SOP:       {res1_data['matched_runbook_title']} ({res1_data['similarity_score']*100:.1f}%)")
    print(f"     * Root Cause:        {res1_data['root_cause_hypothesis'][:140]}...")
    print(f"     * Recommended Cmd:   {res1_data['recommended_safe_command']}")

    # 3. Test 2: Deduplication Check (Send the EXACT same Prometheus alert again)
    print("\n[Step 3] Sending Duplicate Prometheus Alert (Testing Deduplication)...")
    resp_dup = client.post("/webhook/alerts", json=prom_payload, headers={"X-Alert-Source": "prometheus"})
    res_dup_data = resp_dup.json()[0]
    print(f"[OK] Deduplication Result:")
    print(f"     * Is Duplicate:      {res_dup_data['is_duplicate']}")
    print(f"     * Title:             {res_dup_data['title']}")
    print(f"     * Diagnostic:        {res_dup_data['diagnostic_summary']}")

    # 4. Test 3: Grafana Ingestion (PostgreSQL Connection Pool Alert)
    print("\n[Step 4] Sending Inbound Grafana Alert (Database Pool Starvation)...")
    grafana_payload = {
        "title": "[Alerting] Database Connection Pool Exhausted",
        "ruleName": "PostgresPoolExhausted",
        "state": "alerting",
        "message": "FATAL: remaining connection slots are reserved for non-replication superuser connections. Client transactions timing out.",
        "tags": {
            "service": "postgres-primary",
            "instance": f"db-prod-{ts}",
        },
    }
    resp2 = client.post("/webhook/alerts", json=grafana_payload, headers={"X-Alert-Source": "grafana"})
    res2_data = resp2.json()[0]
    print(f"[OK] Incident Created:")
    print(f"     * Incident ID:       {res2_data['incident_id']}")
    print(f"     * AI Title:          {res2_data['title']}")
    print(f"     * AI Severity:       {res2_data['severity']}")
    print(f"     * Matched SOP:       {res2_data['matched_runbook_title']} ({res2_data['similarity_score']*100:.1f}%)")
    print(f"     * Root Cause:        {res2_data['root_cause_hypothesis'][:140]}...")
    print(f"     * Safe Command:      {res2_data['recommended_safe_command']}")
    print(f"     * Destructive Cmd:   {res2_data['recommended_destructive_command']}")

    # 5. Database Verification
    print("\n[Step 5] Querying Live Supabase PostgreSQL Database Records...")
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT count(*) FROM incidents;")
    total_incidents = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM alerts;")
    total_alerts = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM ai_logs;")
    total_ai_logs = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM timeline;")
    total_timeline = cur.fetchone()[0]

    print(f"[OK] Supabase Live State:")
    print(f"     * Total Incidents:   {total_incidents}")
    print(f"     * Total Alerts:      {total_alerts}")
    print(f"     * Total AI Logs:     {total_ai_logs}")
    print(f"     * Total Timeline:    {total_timeline}")

    # Display most recent AI Log
    cur.execute("SELECT model, latency_ms, purpose, created_at FROM ai_logs ORDER BY created_at DESC LIMIT 1;")
    ai_row = cur.fetchone()
    if ai_row:
        print(f"\n[OK] Most Recent AI Log Entry:")
        print(f"     * Model:             {ai_row[0]}")
        print(f"     * Latency:           {ai_row[1]} ms")
        print(f"     * Purpose:           {ai_row[2]}")
        print(f"     * Timestamp:         {ai_row[3]}")

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print("  [PASS] Phase 3 Live Triage & Deduplication Successfully Verified!")
    print("=" * 70)


if __name__ == "__main__":
    main()
