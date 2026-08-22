"""
Phase 2 RAG & Vector Search Test Suite
Tests document chunking, Gemini 768-dim embeddings, pgvector storage, and semantic search.
"""

import os
from pathlib import Path
import pytest
from dotenv import load_dotenv

from src.rag.chunker import DocumentChunker
from src.rag.embedder import GeminiEmbedder
from src.rag.ingest import RunbookIngester
from src.rag.search import RunbookSearchEngine

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def test_chunker_markdown_parsing():
    """Verify markdown chunking and title extraction."""
    chunker = DocumentChunker(chunk_size=500, chunk_overlap=100)
    sample_md = """# SOP-999: Test Runbook Title

## Overview
This is a test runbook overview section.

## Remediation
Run the following command to fix the issue:
```bash
docker restart test_service
```
"""
    chunks = chunker.chunk_text(sample_md, source_file="test_runbook.md")
    assert len(chunks) >= 1
    assert chunks[0].title == "SOP-999: Test Runbook Title"
    assert "docker restart test_service" in chunks[0].content
    assert chunks[0].chunk_index == 0


def test_gemini_embedder_dimension():
    """Verify Gemini embedding generator produces 768-dimensional vectors."""
    api_key = os.getenv("GEMINI_API_KEY")
    assert api_key, "GEMINI_API_KEY must be set in .env"
    
    embedder = GeminiEmbedder(api_key=api_key)
    vector = embedder.embed_text("High memory usage in containerized microservice")
    assert isinstance(vector, list)
    assert len(vector) == 768
    assert all(isinstance(val, float) for val in vector)


def test_runbook_ingestion_and_search():
    """End-to-end test: Ingest sample SOPs and perform cosine similarity search."""
    # 1. Ingest runbooks
    ingester = RunbookIngester()
    summary = ingester.ingest_directory(clean_existing=False)
    assert summary["files_processed"] >= 3
    assert summary["chunks_inserted"] >= 3

    # 2. Search for memory leak
    search_engine = RunbookSearchEngine(similarity_threshold=0.60)
    memory_results = search_engine.search("Container memory utilization exceeding 95% threshold with OOM errors", limit=1)
    assert len(memory_results) == 1
    assert "Memory" in memory_results[0].title or "high_memory_leak" in memory_results[0].source_file
    assert memory_results[0].similarity_score >= 0.60

    # 3. Search for connection pool exhaustion
    db_results = search_engine.search("Database fatal error: remaining connection slots are reserved for non-replication", limit=1)
    assert len(db_results) == 1
    assert "Connection Pool" in db_results[0].title or "database_connection" in db_results[0].source_file
    assert db_results[0].similarity_score >= 0.60

    # 4. Search for disk full
    disk_results = search_engine.search("Root volume partition 90% full with large log files", limit=1)
    assert len(disk_results) == 1
    assert "Disk Space" in disk_results[0].title or "disk_space" in disk_results[0].source_file
    assert disk_results[0].similarity_score >= 0.60
