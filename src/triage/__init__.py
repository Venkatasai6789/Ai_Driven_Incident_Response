"""
Webhook Alert Ingestion & Gemini AI Classification Package.
Synthesizes patterns from Reference Repo B (Runbook Guard schemas) and Reference Repo C (RAG with n8n).
"""

from .normalizer import AlertNormalizer, NormalizedAlert
from .classifier import GeminiTriageClassifier, TriageResult
from .webhook_service import app

__all__ = [
    "AlertNormalizer",
    "NormalizedAlert",
    "GeminiTriageClassifier",
    "TriageResult",
    "app",
]
