"""
Enterprise Safety Policy Decision Engine (Phase 4 Enhanced)
Includes:
- Lexical & Regex Command Categorization (Safe vs. Destructive)
- Adversarial Chaining Detection (&&, ||, ;, |, newline)
- Command Substitution & Subshell Defense ($(), `` ` ``, eval, bash -c)
- Privilege Escalation & Sensitive Path Protection
Synthesizes from Reference Repo B (runbook_guard policies/engine.py & validator.py).
"""

import re
import shlex
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Tuple


class CommandType(str, Enum):
    SAFE = "safe"
    DESTRUCTIVE = "destructive"


@dataclass
class SafetyEvaluation:
    command: str
    command_type: CommandType
    is_safe: bool
    requires_approval: bool
    risk_level: str  # Low, Medium, High, Critical
    matched_rule: str
    reason: str
    sub_commands_evaluated: List[str]


class SafetyGuard:
    """
    Deterministic Enterprise Safety Filter with Adversarial Command Injection Protection.
    """

    # Explicit Destructive Patterns (Blocklist - High / Critical Risk)
    DESTRUCTIVE_PATTERNS: List[Tuple[str, str, str]] = [
        (r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive)", "Recursive file/directory deletion (rm -r / rm -rf)", "Critical"),
        (r"\brm\s+-[a-zA-Z]*f", "Force file deletion (rm -f)", "High"),
        (r"\b(drop\s+database|drop\s+table|drop\s+schema|drop\s+view)\b", "Destructive Database DDL DROP statement", "Critical"),
        (r"\btruncate\s+(table\s+)?[a-zA-Z0-9_\.]+\b", "Database table truncation", "Critical"),
        (r"\b(reboot|shutdown|poweroff|init\s+0|init\s+6|halt)\b", "System shutdown or reboot command", "Critical"),
        (r"\b(kill\s+-9|killall\s+-9|pkill\s+-9)\b", "SIGKILL ungraceful process termination", "High"),
        (r"\b(mkfs|fdisk|parted|dd\s+if=)\b", "Direct disk or filesystem manipulation", "Critical"),
        (r"\biptables\s+(-F|--flush)", "Flushing firewall rules", "High"),
        (r"\bdocker\s+system\s+prune\s+.*--volumes", "Destructive Docker volume purge", "High"),
        (r"\b(chmod\s+-R\s+777|chown\s+-R)\b", "Broad recursive permission alteration", "High"),
        (r"\b(sudo\s+su|su\s+-|visudo)\b", "Privilege escalation attempts", "Critical"),
        (r"\b(base64\s+-d|eval|sh\s+-c|bash\s+-c)\b", "Obfuscated shell command execution wrapper", "High"),
    ]

    # Explicit Safe Patterns (Allowlist - Permitted for Direct Execution)
    SAFE_PATTERNS: List[Tuple[str, str, str]] = [
        (r"^docker\s+restart\s+[a-zA-Z0-9_\-]+$", "Safe container restart", "Low"),
        (r"^docker\s+(stats|logs|ps|inspect)\b", "Read-only Docker inspection", "Low"),
        (r"^kubectl\s+rollout\s+restart\s+deployment/[a-zA-Z0-9_\-]+$", "Safe Kubernetes deployment restart", "Low"),
        (r"^kubectl\s+(get|describe|logs)\b", "Read-only Kubernetes inspection", "Low"),
        (r"^systemctl\s+(restart|reload|reload-or-restart|restart-or-reload|status)\s+[a-zA-Z0-9_\-]+$", "Standard service restart or reload", "Low"),
        (r"^journalctl\s+--vacuum-(time|size)=[a-zA-Z0-9]+$", "Controlled journal log vacuuming", "Low"),
        (r"^find\s+/var/log\s+.*-exec\s+truncate\s+-s\s+0\s+\{\}\s+\+$", "Safe application log truncation", "Low"),
        (r"^(df|free|ps|top|uptime|netstat|ss|curl|ping|iostat|vmstat|lsof)\b", "Read-only system diagnostic command", "Low"),
        (r"^redis-cli\s+(ping|info|dbsize|memory\s+usage)\b", "Read-only Redis diagnostic", "Low"),
    ]

    @classmethod
    def split_compound_command(cls, command: str) -> List[str]:
        """Split chained or piped shell commands into individual executable sub-commands."""
        # Split on &&, ||, ;, |, and newlines
        parts = re.split(r"(&&|\|\||;|\||\n)", command)
        sub_cmds = [p.strip() for p in parts if p.strip() and p not in ("&&", "||", ";", "|")]
        return sub_cmds

    @classmethod
    def evaluate(cls, command: str) -> SafetyEvaluation:
        """
        Evaluate command safety with deep inspection of chained and nested sub-commands.
        Fail-safe: If ANY sub-command is destructive or untrusted, the whole command is gated.
        """
        clean_cmd = command.strip()
        if not clean_cmd:
            return SafetyEvaluation(
                command="",
                command_type=CommandType.DESTRUCTIVE,
                is_safe=False,
                requires_approval=True,
                risk_level="High",
                matched_rule="empty_command",
                reason="Empty command cannot be executed.",
                sub_commands_evaluated=[],
            )

        # Check for command substitution attacks: `command` or $(command)
        if re.search(r"(\$\(.*\)|`.*`)", clean_cmd):
            return SafetyEvaluation(
                command=clean_cmd,
                command_type=CommandType.DESTRUCTIVE,
                is_safe=False,
                requires_approval=True,
                risk_level="Critical",
                matched_rule="command_substitution_detected",
                reason="Command substitution detected (`...` or $(...)). Potentially adversarial injection.",
                sub_commands_evaluated=[clean_cmd],
            )

        sub_commands = cls.split_compound_command(clean_cmd)

        # 1. Evaluate each sub-command against Destructive Blocklist
        for sub in sub_commands:
            for pattern, rule_desc, risk in cls.DESTRUCTIVE_PATTERNS:
                if re.search(pattern, sub, re.IGNORECASE):
                    return SafetyEvaluation(
                        command=clean_cmd,
                        command_type=CommandType.DESTRUCTIVE,
                        is_safe=False,
                        requires_approval=True,
                        risk_level=risk,
                        matched_rule=rule_desc,
                        reason=f"Destructive action detected in sub-command '{sub}': {rule_desc}. Human authorization required.",
                        sub_commands_evaluated=sub_commands,
                    )

        # 2. Check if ALL sub-commands match Safe Allowlist
        all_safe = True
        highest_risk = "Low"
        matched_rules = []

        for sub in sub_commands:
            sub_is_safe = False
            for pattern, rule_desc, risk in cls.SAFE_PATTERNS:
                if re.search(pattern, sub, re.IGNORECASE):
                    sub_is_safe = True
                    matched_rules.append(rule_desc)
                    break
            if not sub_is_safe:
                all_safe = False
                break

        if all_safe and sub_commands:
            return SafetyEvaluation(
                command=clean_cmd,
                command_type=CommandType.SAFE,
                is_safe=True,
                requires_approval=False,
                risk_level=highest_risk,
                matched_rule="; ".join(matched_rules),
                reason=f"All {len(sub_commands)} sub-commands matched safe operational allowlists.",
                sub_commands_evaluated=sub_commands,
            )

        # 3. Default Policy: Unknown / Compound unverified commands require approval
        return SafetyEvaluation(
            command=clean_cmd,
            command_type=CommandType.DESTRUCTIVE,
            is_safe=False,
            requires_approval=True,
            risk_level="Medium",
            matched_rule="unclassified_command_default_gate",
            reason="Command is not fully covered by the pre-approved safe allowlist. Gated behind human approval by default.",
            sub_commands_evaluated=sub_commands,
        )
