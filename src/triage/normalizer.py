"""
Alert Payload Normalizer & Deduplication Fingerprinter (Phase 3)
Normalizes diverse monitoring payloads (Prometheus, Grafana, Datadog, Custom) to a uniform Pydantic schema.
Synthesizes schema design from Reference Repo B (Runbook Guard).
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class NormalizedAlert(BaseModel):
    source: str = Field(..., description="Alert origin source (e.g. prometheus, grafana, datadog, custom)")
    alert_name: str = Field(..., description="Short canonical title or rule name")
    description: str = Field(..., description="Full descriptive error text, logs, or metrics message")
    severity: str = Field(default="Medium", description="Initial severity: Critical, High, Medium, Low")
    status: str = Field(default="firing", description="Status: firing, resolved, acknowledged")
    service: str = Field(default="unknown-service", description="Target service or component name")
    instance: str = Field(default="unknown-host", description="Host, IP, pod name, or container ID")
    fingerprint: str = Field(..., description="Unique deterministic SHA-256 hash for deduplication")
    raw_payload: Dict[str, Any] = Field(default_factory=dict, description="Original unparsed webhook payload")
    custom_labels: Dict[str, Any] = Field(default_factory=dict, description="Extracted tags and metadata")
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        mapping = {
            "critical": "Critical",
            "crit": "Critical",
            "page": "Critical",
            "error": "High",
            "high": "High",
            "warn": "Medium",
            "warning": "Medium",
            "medium": "Medium",
            "info": "Low",
            "low": "Low",
        }
        return mapping.get(str(v).lower().strip(), "Medium")


class AlertNormalizer:
    """Normalizes various alert provider formats into a standardized NormalizedAlert."""

    @staticmethod
    def calculate_fingerprint(source: str, alert_name: str, service: str, instance: str) -> str:
        """Compute a deterministic SHA-256 hash for alert deduplication."""
        payload_key = f"{source.lower()}::{alert_name.lower()}::{service.lower()}::{instance.lower()}"
        return hashlib.sha256(payload_key.encode("utf-8")).hexdigest()

    @classmethod
    def normalize(cls, payload: Dict[str, Any], default_source: str = "custom") -> List[NormalizedAlert]:
        """Detect provider format and normalize into one or more NormalizedAlert objects."""
        # 1. Prometheus Alertmanager format
        if "alerts" in payload and isinstance(payload["alerts"], list):
            return cls._normalize_prometheus(payload)

        # 2. Grafana Webhook format
        if "ruleName" in payload or "evalMatches" in payload or ("state" in payload and "title" in payload):
            return [cls._normalize_grafana(payload)]

        # 3. Datadog Webhook format
        if "event_type" in payload or "body" in payload:
            return [cls._normalize_datadog(payload)]

        # 4. Custom / Generic JSON format
        return [cls._normalize_custom(payload, default_source)]

    @classmethod
    def _normalize_prometheus(cls, payload: Dict[str, Any]) -> List[NormalizedAlert]:
        normalized_list = []
        common_labels = payload.get("commonLabels", {})
        common_annotations = payload.get("commonAnnotations", {})

        for item in payload.get("alerts", []):
            labels = {**common_labels, **item.get("labels", {})}
            annotations = {**common_annotations, **item.get("annotations", {})}

            alert_name = (
                labels.get("alertname")
                or annotations.get("summary")
                or "Prometheus Alert"
            )
            description = (
                annotations.get("description")
                or annotations.get("message")
                or annotations.get("summary")
                or json.dumps(item)
            )
            service = labels.get("job") or labels.get("service") or labels.get("app") or "infrastructure"
            instance = labels.get("instance") or labels.get("pod") or labels.get("node") or "unknown-instance"
            raw_severity = labels.get("severity", "Medium")
            status = item.get("status", "firing")

            fingerprint = item.get("fingerprint") or cls.calculate_fingerprint(
                "prometheus", alert_name, service, instance
            )

            normalized_list.append(
                NormalizedAlert(
                    source="prometheus",
                    alert_name=alert_name,
                    description=description,
                    severity=raw_severity,
                    status=status,
                    service=service,
                    instance=instance,
                    fingerprint=fingerprint,
                    raw_payload=item,
                    custom_labels=labels,
                )
            )
        return normalized_list

    @classmethod
    def _normalize_grafana(cls, payload: Dict[str, Any]) -> NormalizedAlert:
        alert_name = payload.get("ruleName") or payload.get("title") or "Grafana Alert"
        description = payload.get("message") or payload.get("ruleUrl") or json.dumps(payload.get("evalMatches", []))
        labels = payload.get("tags", {})
        service = labels.get("service") or labels.get("app") or "grafana-monitored-service"
        instance = labels.get("instance") or "grafana-host"
        raw_severity = payload.get("state") or labels.get("severity") or "High"
        
        fingerprint = cls.calculate_fingerprint("grafana", alert_name, service, instance)
        return NormalizedAlert(
            source="grafana",
            alert_name=alert_name,
            description=description,
            severity="Critical" if str(raw_severity).lower() in ["alerting", "critical"] else "Medium",
            status=payload.get("state", "firing"),
            service=service,
            instance=instance,
            fingerprint=fingerprint,
            raw_payload=payload,
            custom_labels=labels,
        )

    @classmethod
    def _normalize_datadog(cls, payload: Dict[str, Any]) -> NormalizedAlert:
        alert_name = payload.get("title") or "Datadog Monitor Alert"
        description = payload.get("body") or payload.get("event_type") or "Datadog Event"
        tags = payload.get("tags", {})
        service = tags.get("service") if isinstance(tags, dict) else "datadog-service"
        instance = tags.get("host") if isinstance(tags, dict) else "datadog-host"
        priority = payload.get("priority", "normal")

        severity = "Critical" if priority == "high" else "Medium"
        fingerprint = cls.calculate_fingerprint("datadog", alert_name, str(service), str(instance))
        return NormalizedAlert(
            source="datadog",
            alert_name=alert_name,
            description=description,
            severity=severity,
            status="firing",
            service=str(service),
            instance=str(instance),
            fingerprint=fingerprint,
            raw_payload=payload,
            custom_labels=tags if isinstance(tags, dict) else {},
        )

    @classmethod
    def _normalize_custom(cls, payload: Dict[str, Any], default_source: str) -> NormalizedAlert:
        alert_name = (
            payload.get("alert_name")
            or payload.get("title")
            or payload.get("event")
            or "Custom IT Alert"
        )
        description = (
            payload.get("description")
            or payload.get("message")
            or payload.get("details")
            or json.dumps(payload)
        )
        service = payload.get("service") or payload.get("component") or "general-service"
        instance = payload.get("instance") or payload.get("host") or "localhost"
        severity = payload.get("severity", "Medium")
        source = payload.get("source", default_source)

        fingerprint = payload.get("fingerprint") or cls.calculate_fingerprint(
            source, alert_name, service, instance
        )

        return NormalizedAlert(
            source=source,
            alert_name=alert_name,
            description=description,
            severity=severity,
            status=payload.get("status", "firing"),
            service=service,
            instance=instance,
            fingerprint=fingerprint,
            raw_payload=payload,
            custom_labels=payload.get("metadata", {}),
        )
