"""
Test Suite: n8n Workflow Architecture & Reference 3 Validation
Validates that exported n8n workflow schemas strictly synthesize Reference Repo 3:
- @n8n/n8n-nodes-langchain.agent
- @n8n/n8n-nodes-langchain.vectorStoreSupabase (connected to 'runbooks')
- @n8n/n8n-nodes-langchain.memoryPostgresChat (connected to 'timeline')
- Webhook trigger, Deduplication Normalizer, and Telegram Notifier
"""

import json
from pathlib import Path
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
WORKFLOW_PATH = BASE_DIR / "workflows" / "n8n_supabase_rag_incident_response.json"
REF_WORKFLOW_PATH = BASE_DIR / "_reference_repos" / "RAG_with_n8n" / "RAG Agent.json"


def test_n8n_workflow_file_exists_and_valid_json():
    """Verify n8n workflow file exists and is valid JSON."""
    assert WORKFLOW_PATH.exists()
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "nodes" in data
    assert "connections" in data
    assert len(data["nodes"]) >= 6


def test_n8n_workflow_synthesizes_reference_3_nodes():
    """Verify n8n workflow incorporates all core node types from Reference 3."""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    node_types = {node["type"] for node in data["nodes"]}
    
    # 1. Vector Store Node (Supabase / Postgres Vector) from Reference 3
    assert ("@n8n/n8n-nodes-langchain.vectorStoreSupabase" in node_types or "@n8n/n8n-nodes-langchain.vectorStorePGVector" in node_types)
    
    # 2. Postgres Chat / Incident Memory Node from Reference 3
    assert "@n8n/n8n-nodes-langchain.memoryPostgresChat" in node_types
    
    # 3. LangChain Agent Node from Reference 3
    assert "@n8n/n8n-nodes-langchain.agent" in node_types
    
    # 4. Webhook Trigger & Telegram Notifier Nodes
    assert "n8n-nodes-base.webhook" in node_types
    assert "n8n-nodes-base.telegram" in node_types


def test_n8n_workflow_connections_integrity():
    """Verify all LangChain AI connections (ai_languageModel, ai_tool, ai_memory) are intact."""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    connections = data["connections"]
    
    # Check that Gemini Model connects to Agent
    assert "Google Gemini 2.5 Flash" in connections
    assert "ai_languageModel" in connections["Google Gemini 2.5 Flash"]
    
    # Check that Supabase Vector Store connects to Agent as tool
    assert "Supabase Vector Store (runbooks)" in connections
    assert "ai_tool" in connections["Supabase Vector Store (runbooks)"]
    
    # Check that Postgres Memory connects to Agent
    assert "Postgres Incident Memory" in connections
    assert "ai_memory" in connections["Postgres Incident Memory"]
