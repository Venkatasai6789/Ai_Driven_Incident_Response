"""
Dynamic Service Mesh Topology Manager for n8n Incident Response Workflow.
Tracks node health, active incidents, and latency dynamically from database state.
"""

from typing import Any, Dict, List, Optional
import os
import psycopg2
from dotenv import load_dotenv

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


class TopologyManager:
    """Calculates n8n workflow topology node and edge state dynamically from DB."""

    N8N_NODES = [
        {"id": "alert-webhook", "name": "Alert Webhook Receiver", "base_latency": 12},
        {"id": "normalizer", "name": "Alert Normalizer & Fingerprinter", "base_latency": 8},
        {"id": "rag-ai-agent", "name": "Supabase RAG Incident Agent", "base_latency": 38},
        {"id": "fastapi-dispatcher", "name": "FastAPI Triage & Safety Controller", "base_latency": 18},
        {"id": "telegram-notifier", "name": "Telegram Approval & Notification Gate", "base_latency": 45},
        {"id": "supabase-db", "name": "Supabase pgvector & Incident Storage", "base_latency": 5},
    ]

    BASE_EDGES = [
        {"from": "alert-webhook", "to": "normalizer", "base_p99": 12},
        {"from": "normalizer", "to": "rag-ai-agent", "base_p99": 18},
        {"from": "rag-ai-agent", "to": "fastapi-dispatcher", "base_p99": 22},
        {"from": "fastapi-dispatcher", "to": "telegram-notifier", "base_p99": 45},
        {"from": "rag-ai-agent", "to": "supabase-db", "base_p99": 15},
        {"from": "fastapi-dispatcher", "to": "supabase-db", "base_p99": 5},
    ]

    @classmethod
    def get_mesh_topology(cls) -> Dict[str, Any]:
        """Fetch live incident state and return dynamic node & edge health."""
        active_incidents = []
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT id::text, title, severity, status, source
                FROM incidents
                WHERE status IN ('open', 'investigating', 'mitigating')
                ORDER BY created_at DESC;
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()

            for r in rows:
                active_incidents.append({
                    "id": r[0],
                    "title": r[1],
                    "severity": r[2],
                    "status": r[3],
                    "source": r[4],
                })
        except Exception as e:
            print(f"[TOPOLOGY] DB query warning: {e}")

        has_critical = any(i["severity"].lower() == "critical" for i in active_incidents)
        has_high = any(i["severity"].lower() == "high" for i in active_incidents)
        has_active = len(active_incidents) > 0
        primary_incident_id = active_incidents[0]["id"] if has_active else None

        nodes = []
        for n in cls.N8N_NODES:
            node_id = n["id"]
            if node_id == "rag-ai-agent" and has_active:
                status = "CRITICAL" if has_critical else ("HIGH" if has_high else "DEGRADED")
                latency_ms = 480 if has_critical else 210
                inc_id = primary_incident_id
            elif node_id == "fastapi-dispatcher" and has_critical:
                status = "DEGRADED"
                latency_ms = 120
                inc_id = primary_incident_id
            else:
                status = "NOMINAL"
                latency_ms = n["base_latency"]
                inc_id = None

            nodes.append({
                "id": node_id,
                "name": n["name"],
                "status": status,
                "latency_ms": latency_ms,
                "active_incident_id": inc_id,
            })

        edges = []
        for e in cls.BASE_EDGES:
            is_degraded = (
                (e["from"] == "normalizer" and e["to"] == "rag-ai-agent" and has_active)
                or (e["from"] == "rag-ai-agent" and e["to"] == "fastapi-dispatcher" and has_critical)
            )
            edges.append({
                "from": e["from"],
                "to": e["to"],
                "status": "DEGRADED" if is_degraded else "HEALTHY",
                "p99_ms": (e["base_p99"] * 10) if is_degraded else e["base_p99"],
            })

        return {
            "nodes": nodes,
            "edges": edges,
        }
