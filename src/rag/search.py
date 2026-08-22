"""
Runbook Semantic Similarity Search Engine (Phase 2)
Synthesizes cosine retrieval patterns from Reference Repo A (RAG_pgvector agent_app.py).
Queries pgvector for relevant standard operating procedures based on incident descriptions.
"""

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
import psycopg2
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.rag.embedder import GeminiEmbedder
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


@dataclass
class SearchResult:
    id: str
    title: str
    source_file: str
    chunk_index: int
    content: str
    similarity_score: float
    distance: float
    metadata: Dict


class RunbookSearchEngine:
    def __init__(self, similarity_threshold: float = 0.65):
        self.similarity_threshold = similarity_threshold
        self.embedder = GeminiEmbedder()

    def get_connection(self):
        """Establish connection to PostgreSQL with pgvector registration."""
        if DATABASE_URL:
            if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sslmode=" not in DATABASE_URL:
                separator = "&" if "?" in DATABASE_URL else "?"
                conn_url = f"{DATABASE_URL}{separator}sslmode=require"
            else:
                conn_url = DATABASE_URL
            conn = psycopg2.connect(conn_url)
        else:
            sslmode = "require" if POSTGRES_HOST not in ("localhost", "127.0.0.1") else "prefer"
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                dbname=POSTGRES_DB,
                sslmode=sslmode,
            )
        register_vector(conn)
        return conn

    def search(
        self,
        query: str,
        limit: int = 3,
        threshold: Optional[float] = None,
    ) -> List[SearchResult]:
        """Search runbooks for semantically relevant procedures given an alert/incident description."""
        clean_query = query.strip()
        if not clean_query:
            return []

        min_similarity = threshold if threshold is not None else self.similarity_threshold

        # 1. Generate query embedding
        query_embedding = self.embedder.embed_text(clean_query)

        # 2. Execute pgvector cosine similarity search
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT 
                id::text,
                title,
                source_file,
                chunk_index,
                content,
                1 - (embedding <=> %s::vector) AS similarity_score,
                embedding <=> %s::vector AS distance,
                metadata
            FROM runbooks
            WHERE (1 - (embedding <=> %s::vector)) >= %s
            ORDER BY embedding <=> %s::vector ASC
            LIMIT %s;
            """,
            (query_embedding, query_embedding, query_embedding, min_similarity, query_embedding, limit),
        )

        rows = cur.fetchall()
        cur.close()
        conn.close()

        results: List[SearchResult] = []
        for row in rows:
            results.append(
                SearchResult(
                    id=row[0],
                    title=row[1],
                    source_file=row[2],
                    chunk_index=row[3],
                    content=row[4],
                    similarity_score=round(float(row[5]), 4),
                    distance=round(float(row[6]), 4),
                    metadata=row[7] if isinstance(row[7], dict) else {},
                )
            )

        return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python src/rag/search.py \"<incident description or alert query>\"")
        sys.exit(1)

    query = sys.argv[1]
    print(f"[*] Searching runbooks for: '{query}'...")
    engine = RunbookSearchEngine(similarity_threshold=0.60)
    matches = engine.search(query, limit=3)

    if not matches:
        print("[!] No matching runbooks found matching the similarity threshold.")
        return

    print(f"\n[OK] Found {len(matches)} matching SOP(s):\n")
    for i, match in enumerate(matches, 1):
        print(f"--- [Match #{i}] Similarity: {match.similarity_score * 100:.1f}% ---")
        print(f"Title:       {match.title}")
        print(f"Source:      {match.source_file} (Chunk {match.chunk_index})")
        print(f"Snippet:\n{match.content[:300]}...\n")


if __name__ == "__main__":
    main()
