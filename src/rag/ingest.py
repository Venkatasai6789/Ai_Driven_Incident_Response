"""
Runbook Ingestion Pipeline (Phase 2)
Synthesizes patterns from Reference Repo A (RAG_pgvector load_runbooks.py).
Parses files in runbooks/, generates Gemini 768-dim embeddings, and stores them in PostgreSQL pgvector.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extras import Json
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.rag.chunker import DocumentChunker, DocumentChunk
from src.rag.embedder import GeminiEmbedder
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")


class RunbookIngester:
    def __init__(self, runbooks_dir: Optional[Path] = None):
        self.runbooks_dir = runbooks_dir or (BASE_DIR / "runbooks")
        self.chunker = DocumentChunker(chunk_size=1200, chunk_overlap=200)
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

    def ingest_directory(self, clean_existing: bool = False) -> Dict:
        """Ingest all supported documents in the runbooks directory."""
        if not self.runbooks_dir.exists():
            raise FileNotFoundError(f"Runbooks directory not found at: {self.runbooks_dir}")

        supported_extensions = [".md", ".txt", ".pdf", ".docx"]
        files = [
            f for f in self.runbooks_dir.iterdir()
            if f.is_file() and f.suffix.lower() in supported_extensions
        ]

        if not files:
            print(f"[!] No runbook documents found in {self.runbooks_dir}")
            return {"files_processed": 0, "chunks_inserted": 0}

        conn = self.get_connection()
        cur = conn.cursor()

        if clean_existing:
            print("[*] Cleaning existing runbook records...")
            cur.execute("DELETE FROM runbooks;")
            conn.commit()

        total_chunks = 0
        processed_files = []

        print(f"[*] Found {len(files)} runbook file(s) to process in {self.runbooks_dir.name}/")

        for file_path in files:
            print(f"  -> Processing: {file_path.name}...")
            chunks: List[DocumentChunk] = self.chunker.process_file(file_path)
            
            # Delete any previous chunks for this specific file if not full clean
            if not clean_existing:
                cur.execute("DELETE FROM runbooks WHERE source_file = %s;", (file_path.name,))

            for chunk in chunks:
                print(f"     * Generating embedding for chunk {chunk.chunk_index + 1}/{len(chunks)}...")
                embedding = self.embedder.embed_text(chunk.content)

                cur.execute(
                    """
                    INSERT INTO runbooks (title, source_file, content, chunk_index, embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s);
                    """,
                    (
                        chunk.title,
                        chunk.source_file,
                        chunk.content,
                        chunk.chunk_index,
                        embedding,
                        Json(chunk.metadata),
                    ),
                )
                total_chunks += 1

            conn.commit()
            processed_files.append({"filename": file_path.name, "chunks": len(chunks)})

        cur.close()
        conn.close()

        summary = {
            "files_processed": len(processed_files),
            "chunks_inserted": total_chunks,
            "details": processed_files,
        }
        return summary


def main():
    print("=" * 60)
    print("AI-Driven Incident Response - Runbook Ingestion Pipeline")
    print("=" * 60)
    try:
        ingester = RunbookIngester()
        result = ingester.ingest_directory(clean_existing=False)
        print(f"\n[OK] Ingestion complete: {result['files_processed']} file(s), {result['chunks_inserted']} chunk(s) stored.")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"\n[ERROR] Ingestion failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
