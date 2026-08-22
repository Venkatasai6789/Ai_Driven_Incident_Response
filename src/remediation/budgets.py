"""
Capability Budget & Rate Limiting Engine (Phase 4)
Enforces limits on automated write actions to prevent runaway remediation cascades.
Synthesized from Reference Repo B (runbook_guard policies/budgets.py).
"""

from dataclasses import dataclass, field
from typing import Dict, Optional


class PolicyViolationError(Exception):
    """Raised when an action or plan breaches the capability budget."""
    pass


@dataclass
class RiskLimitConfig:
    low: int = 10
    medium: int = 5
    high: int = 2
    critical: int = 1

    def limit_for(self, risk: str) -> int:
        mapping = {
            "low": self.low,
            "medium": self.medium,
            "high": self.high,
            "critical": self.critical,
        }
        return mapping.get(risk.lower(), self.medium)


@dataclass
class CapabilityBudget:
    max_write_actions: int = 3
    max_read_actions: int = 10
    risk_limits: RiskLimitConfig = field(default_factory=RiskLimitConfig)


class BudgetTracker:
    """Tracks runtime consumption of actions per incident."""

    def __init__(
        self,
        budget: Optional[CapabilityBudget] = None,
        max_write_actions_per_incident: Optional[int] = None,
    ):
        if budget:
            self.budget = budget
        elif max_write_actions_per_incident is not None:
            self.budget = CapabilityBudget(max_write_actions=max_write_actions_per_incident)
        else:
            self.budget = CapabilityBudget()
        self._read_count: int = 0
        self._write_count: int = 0

    @property
    def write_count(self) -> int:
        return self._write_count

    @property
    def read_count(self) -> int:
        return self._read_count

    def consume_action(self, is_write: bool, risk_level: str = "medium"):
        """Record consumption of an action; raises PolicyViolationError if budget exceeded."""
        if is_write:
            risk_cap = self.budget.risk_limits.limit_for(risk_level)
            if self._write_count >= risk_cap:
                raise PolicyViolationError(
                    f"Write action budget exceeded for risk '{risk_level}': "
                    f"{self._write_count} actions executed >= limit of {risk_cap}."
                )
            if self._write_count >= self.budget.max_write_actions:
                raise PolicyViolationError(
                    f"Global write action budget exceeded: "
                    f"{self._write_count} >= max {self.budget.max_write_actions}."
                )
            self._write_count += 1
        else:
            if self._read_count >= self.budget.max_read_actions:
                raise PolicyViolationError(
                    f"Read action budget exceeded: {self._read_count} >= max {self.budget.max_read_actions}."
                )
            self._read_count += 1

    def request_action(self, incident_id: str, command: str, is_write_action: bool = True, risk_level: str = "medium") -> bool:
        """Consume action for incident; raises PolicyViolationError if budget exhausted."""
        self.consume_action(is_write=is_write_action, risk_level=risk_level)
        return True


# Aliases for synthesis compatibility
CapabilityBudgetTracker = BudgetTracker
CapabilityBudgetExhausted = PolicyViolationError
