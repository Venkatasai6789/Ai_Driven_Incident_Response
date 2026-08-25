"""
Chaos Lab Controller for Synthetic Fault Injection.
Injects real chaos scenarios through the Alert Normalizer & Gemini Triage Classifier pipeline.
"""

from typing import Any, Dict, Optional
import time
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier


class ChaosLabController:
    """Orchestrates 5 chaos scenarios into live incident pipeline."""

    SCENARIOS = {
        "exp-oom": {
            "name": "V8 Heap Exhaustion",
            "alert_name": "NodeJSMemoryExhaustionOOM",
            "description": "V8 memory allocator reached 98.4% capacity during batch payload processing with recurring OOMKilled events.",
            "severity": "Critical",
            "default_target": "rag-ai-agent",
        },
        "exp-db": {
            "name": "DB Connection Pool Saturation",
            "alert_name": "PostgresConnectionPoolExhausted",
            "description": "PostgreSQL active connection pool reached max limit (100/100 connections). Client query wait timeout > 10,000ms.",
            "severity": "High",
            "default_target": "supabase-db",
        },
        "exp-disk": {
            "name": "Disk Volume Threshold Spike",
            "alert_name": "DiskStorageThresholdBreached",
            "description": "Root partition /var/lib/docker storage utilization reached 95% capacity.",
            "severity": "High",
            "default_target": "fastapi-dispatcher",
        },
        "exp-security": {
            "name": "Adversarial Ingress / SQLi",
            "alert_name": "WAFSecurityRuleViolationSQLi",
            "description": "WAF ingress filter intercepted malicious SQL injection payload pattern UNION SELECT in incoming webhook header.",
            "severity": "Critical",
            "default_target": "alert-webhook",
        },
        "exp-rag": {
            "name": "Low-Similarity Anomaly",
            "alert_name": "UnmatchedUnrecognizedSystemAnomaly",
            "description": "System encountered unknown kernel telemetry signal with zero vector runbook match.",
            "severity": "Medium",
            "default_target": "rag-ai-agent",
        },
    }

    def __init__(self):
        self.classifier = GeminiTriageClassifier()

    def inject_chaos(self, experiment_id: str, target_service: Optional[str] = None, dry_run: bool = True) -> Dict[str, Any]:
        """Inject synthetic failure scenario and return spawned incident."""
        scenario = self.SCENARIOS.get(experiment_id)
        if not scenario:
            raise ValueError(f"Unknown experiment_id '{experiment_id}'. Must be one of {list(self.SCENARIOS.keys())}")

        service_target = target_service or scenario["default_target"]
        ts = int(time.time())
        instance_id = f"node-chaos-{ts}"

        normalized_alert = NormalizedAlert(
            source="chaos_lab",
            alert_name=scenario["alert_name"],
            description=f"[{scenario['name']}] {scenario['description']}",
            severity=scenario["severity"],
            service=service_target,
            instance=instance_id,
            fingerprint=AlertNormalizer.calculate_fingerprint("chaos_lab", scenario["alert_name"], service_target, instance_id),
        )

        # Trigger real Gemini classification + DB incident creation
        triage_result = self.classifier.process_alert(normalized_alert)

        return {
            "success": True,
            "incident_id": triage_result.incident_id,
            "scenario": scenario["name"],
            "status": "TRIAGING",
            "spawned_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
