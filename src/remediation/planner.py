"""
Dynamic Multi-Scenario Remediation Planner (Phase 4 Enhanced)
Synthesizes ChangePlan schemas and dynamic planning from Reference Repo B (runbook_guard/schemas/plan.py)
and RAG retrieval from Reference Repo A (RAG_pgvector).
Uses Google Gemini 2.5 Flash to formulate contextual multi-step mitigation plans.
"""

import json
import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.rag.search import RunbookSearchEngine
from src.remediation.safety_guard import SafetyGuard, SafetyEvaluation, CommandType
from src.remediation.budgets import BudgetTracker, CapabilityBudget


@dataclass
class PlanAction:
    action_id: str
    title: str
    command: str
    description: str
    risk_level: str
    is_safe: bool
    requires_approval: bool
    reason: str


@dataclass
class ChangePlan:
    plan_id: str
    incident_id: str
    summary: str
    risk_level: str
    actions: List[PlanAction]
    rollback_strategy: str
    requires_human_approval: bool
    matched_runbook: Optional[str] = None
    similarity_score: float = 0.0


class RemediationPlanner:
    """
    Dynamic Multi-Scenario Remediation Planner.
    Formulates context-aware multi-step mitigation plans for any arbitrary IT incident.
    """

    def __init__(self, search_engine: Optional[RunbookSearchEngine] = None):
        self.search_engine = search_engine or RunbookSearchEngine(similarity_threshold=0.3)
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def plan(
        self,
        incident_id: str,
        alert_name: str,
        service: str,
        instance: str,
        description: str,
        severity: str = "High",
    ) -> ChangePlan:
        """
        Dynamically synthesize a typed ChangePlan based on alert context & SOP retrieval.
        """
        plan_id = f"plan-{uuid.uuid4().hex[:8]}"

        # 1. Retrieve matching SOP context from pgvector
        query = f"Incident: {alert_name} on service {service} ({instance}). {description}"
        sop_results = self.search_engine.search(query, limit=1, threshold=0.3)
        
        sop_context = "No pre-existing SOP found. Use standard SRE best practices."
        matched_title = None
        sim_score = 0.0

        if sop_results:
            top_sop = sop_results[0]
            matched_title = top_sop.title
            sim_score = top_sop.similarity_score
            sop_context = f"Standard Operating Procedure: {top_sop.title}\n{top_sop.content}"

        # 2. Prompt Gemini 2.5 Flash for dynamic multi-step plan
        prompt = f"""
You are a Principal SRE and Automation Architect. Formulate a robust, multi-step incident remediation plan.

### Incident Context:
- Incident ID: {incident_id}
- Alert Name: {alert_name}
- Target Service: {service}
- Target Host/Node: {instance}
- Severity: {severity}
- Incident Description: {description}

### Relevant SOP Runbook:
{sop_context}

### Instructions:
Generate a structured JSON change plan.
1. Provide a concise technical summary of the mitigation strategy.
2. Formulate 1 to 3 sequential operational commands (e.g. Step 1: Diagnostic/read-only, Step 2: Safe restart or remediation action, Step 3: Optional destructive fallback if required).
3. Provide a clear, actionable Rollback Strategy if the remediation fails.
4. Assess overall plan risk level: 'Low', 'Medium', 'High', or 'Critical'.

Respond strictly in valid JSON matching this schema:
{{
  "summary": "Mitigation summary...",
  "risk_level": "Low|Medium|High|Critical",
  "rollback_strategy": "Rollback steps...",
  "steps": [
    {{
      "title": "Short title",
      "command": "executable terminal command",
      "description": "What this step does"
    }}
  ]
}}
"""

        try:
            config = types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
            plan_data = json.loads(response.text)
        except Exception as e:
            # Resilient fallback plan if LLM is unreachable
            plan_data = {
                "summary": f"Standard remediation for {alert_name} on {service}",
                "risk_level": "Medium",
                "rollback_strategy": f"Restart service {service} and restore from latest backup if needed.",
                "steps": [
                    {
                        "title": f"Restart {service}",
                        "command": f"docker restart {service}",
                        "description": "Restart the unhealthy container to restore normal operation."
                    }
                ],
            }

        # 3. Validate every single planned action through SafetyGuard
        actions: List[PlanAction] = []
        plan_requires_approval = False

        for idx, step in enumerate(plan_data.get("steps", []), 1):
            cmd = step.get("command", "").strip()
            eval_res: SafetyEvaluation = SafetyGuard.evaluate(cmd)
            
            if eval_res.requires_approval:
                plan_requires_approval = True

            action = PlanAction(
                action_id=f"{plan_id}-step-{idx}",
                title=step.get("title", f"Step {idx}"),
                command=cmd,
                description=step.get("description", ""),
                risk_level=eval_res.risk_level,
                is_safe=eval_res.is_safe,
                requires_approval=eval_res.requires_approval,
                reason=eval_res.reason,
            )
            actions.append(action)

        return ChangePlan(
            plan_id=plan_id,
            incident_id=incident_id,
            summary=plan_data.get("summary", "Dynamic incident remediation plan"),
            risk_level=plan_data.get("risk_level", "Medium"),
            actions=actions,
            rollback_strategy=plan_data.get("rollback_strategy", "Revert changes"),
            requires_human_approval=plan_requires_approval,
            matched_runbook=matched_title,
            similarity_score=sim_score,
        )
