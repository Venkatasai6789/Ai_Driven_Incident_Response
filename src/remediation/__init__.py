"""
Enterprise Safety Decision Engine, Dynamic Multi-Scenario Remediation & Telegram Gate.
Synthesizes architecture from Reference Repo B (autonomous-agent-runbook-guard)
and Reference Repo A (RAG_pgvector).
"""

from .safety_guard import SafetyGuard, SafetyEvaluation, CommandType
from .telegram_gate import TelegramApprovalGate
from .telegram_bot import TelegramPollingBot
from .runner import RemediationRunner, ExecutionReceipt
from .controller import RemediationController
from .budgets import BudgetTracker, CapabilityBudget, PolicyViolationError
from .planner import RemediationPlanner, ChangePlan, PlanAction

__all__ = [
    "SafetyGuard",
    "SafetyEvaluation",
    "CommandType",
    "TelegramApprovalGate",
    "TelegramPollingBot",
    "RemediationRunner",
    "ExecutionReceipt",
    "RemediationController",
    "BudgetTracker",
    "CapabilityBudget",
    "PolicyViolationError",
    "RemediationPlanner",
    "ChangePlan",
    "PlanAction",
]
