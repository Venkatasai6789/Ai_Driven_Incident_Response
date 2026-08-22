"""
Google Gemini Vector Embedding Generator
Uses Google GenAI SDK to generate 768-dimensional embeddings matching PostgreSQL VECTOR(768).
Synthesizes embedding workflow from Reference Repo A.
"""

import os
import time
from typing import List, Union
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


class GeminiEmbedder:
    def __init__(
        self,
        api_key: str = None,
        model_name: str = None,
        dimension: int = 768,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment or constructor.")

        self.model_name = model_name or os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
        self.dimension = int(dimension or os.getenv("EMBEDDING_DIMENSION", 768))
        self.client = genai.Client(api_key=self.api_key)

    def embed_text(self, text: str, retries: int = 3) -> List[float]:
        """Generate vector embedding for a single string."""
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Cannot embed empty text.")

        config = types.EmbedContentConfig(output_dimensionality=self.dimension)
        
        for attempt in range(1, retries + 1):
            try:
                response = self.client.models.embed_content(
                    model=self.model_name,
                    contents=clean_text,
                    config=config,
                )
                embedding = response.embeddings[0].values
                if len(embedding) != self.dimension:
                    raise ValueError(f"Expected {self.dimension} dimensions, got {len(embedding)}")
                return embedding
            except Exception as e:
                if attempt == retries:
                    raise RuntimeError(f"Embedding failed after {retries} attempts: {e}")
                time.sleep(2 ** attempt)

    def embed_batch(self, texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """Generate vector embeddings for a list of texts."""
        embeddings: List[List[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            for item in batch:
                embeddings.append(self.embed_text(item))
        return embeddings
