"""
Document Chunker & Multi-Format Loader
Supports Markdown (.md), Plain Text (.txt), PDF (.pdf), and DOCX (.docx).
Synthesizes document splitting logic from Reference Repos A & C.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
import re


@dataclass
class DocumentChunk:
    title: str
    source_file: str
    content: str
    chunk_index: int
    metadata: Dict = field(default_factory=dict)


class DocumentChunker:
    def __init__(self, chunk_size: int = 1200, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def load_file(self, file_path: Path) -> str:
        """Extract text from supported file types."""
        suffix = file_path.suffix.lower()
        if suffix in [".md", ".txt"]:
            return file_path.read_text(encoding="utf-8")
        elif suffix == ".pdf":
            return self._load_pdf(file_path)
        elif suffix == ".docx":
            return self._load_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")

    def _load_pdf(self, file_path: Path) -> str:
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        text_parts = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text_parts.append(extracted)
        return "\n\n".join(text_parts)

    def _load_docx(self, file_path: Path) -> str:
        import docx
        doc = docx.Document(str(file_path))
        return "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    def extract_title(self, content: str, default_name: str) -> str:
        """Extract document title from markdown heading or first prominent line."""
        for line in content.splitlines():
            line_clean = line.strip()
            if line_clean.startswith("# "):
                return line_clean.lstrip("# ").strip()
            if line_clean.startswith("Title:"):
                return line_clean.split(":", 1)[1].strip()
        return default_name.replace("_", " ").replace("-", " ").title()

    def chunk_text(self, text: str, source_file: str, title: Optional[str] = None) -> List[DocumentChunk]:
        """Split text into overlapping semantic chunks."""
        doc_title = title or self.extract_title(text, Path(source_file).stem)
        
        # Clean text
        text = text.strip()
        if not text:
            return []

        # If document is small enough, return as single chunk
        if len(text) <= self.chunk_size:
            return [
                DocumentChunk(
                    title=doc_title,
                    source_file=source_file,
                    content=text,
                    chunk_index=0,
                    metadata={"character_count": len(text), "total_chunks": 1},
                )
            ]

        # Split by markdown headers or double newlines where possible
        paragraphs = re.split(r'\n{2,}', text)
        chunks: List[str] = []
        current_chunk: List[str] = []
        current_length = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_len = len(para)
            if current_length + para_len > self.chunk_size and current_chunk:
                combined = "\n\n".join(current_chunk)
                chunks.append(combined)
                
                # Keep last paragraph for overlap if it's smaller than overlap size
                if current_chunk and len(current_chunk[-1]) <= self.chunk_overlap:
                    current_chunk = [current_chunk[-1], para]
                    current_length = len(current_chunk[0]) + para_len
                else:
                    current_chunk = [para]
                    current_length = para_len
            else:
                current_chunk.append(para)
                current_length += para_len

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        result_chunks = []
        for idx, chunk_content in enumerate(chunks):
            result_chunks.append(
                DocumentChunk(
                    title=doc_title,
                    source_file=source_file,
                    content=chunk_content,
                    chunk_index=idx,
                    metadata={
                        "character_count": len(chunk_content),
                        "chunk_index": idx,
                        "total_chunks": len(chunks),
                    },
                )
            )

        return result_chunks

    def process_file(self, file_path: Path) -> List[DocumentChunk]:
        """Load and chunk a single file from disk."""
        content = self.load_file(file_path)
        title = self.extract_title(content, file_path.stem)
        return self.chunk_text(content, file_path.name, title=title)
