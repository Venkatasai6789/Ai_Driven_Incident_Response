# AI-Driven Incident Response & IT Alert Management System
## Master Architecture & Phase Implementation Guide

This document defines the complete technical architecture, data flows, and phase-by-phase implementation reference for the platform, synthesized from the three reference repositories:
- **Repo A:** `RAG_pgvector` (Vector search & semantic retrieval)
- **Repo B:** `autonomous-agent-runbook-guard` (Safety filters, dry-run receipts, Telegram gates, typed audit)
- **Repo C:** `RAG_with_n8n` (n8n orchestration & webhook intake)

---

## 🏛️ End-to-End System Architecture

```
                                [ Prometheus / Grafana / Datadog / Webhook Alerts ]
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │    PHASE 3: Alert Ingestion      │
                                       │ (src/triage/normalizer.py)       │
                                       │ • Normalizes to uniform schema   │
                                       │ • SHA-256 Deduplication Hash     │
                                       └─────────────────┬────────────────┘
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │   PHASE 2: Semantic SOP Search   │
                                       │ (src/rag/search.py)              │
                                       │ • Gemini 768-dim Vector Embed    │
                                       │ • pgvector Cosine Search in DB   │
                                       └─────────────────┬────────────────┘
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │     PHASE 3: Gemini AI Triage    │
                                       │ (src/triage/classifier.py)       │
                                       │ • Severity (Critical/High/Med)   │
                                       │ • Root Cause Hypothesis (RCA)    │
                                       │ • Recommended Remediation Plan   │
                                       └─────────────────┬────────────────┘
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │    PHASE 4: Safety Policy Guard  │
                                       │ (src/remediation/safety_guard.py)│
                                       │ • Checks Safe vs Destructive     │
                                       └─────────┬──────────────┬─────────┘
                                                 │              │
                                     [SAFE COMMAND]       [DESTRUCTIVE COMMAND]
                                                 │              │
                                                 ▼              ▼
                              ┌────────────────────┐   ┌──────────────────────────────┐
                              │ Direct Execution   │   │ PHASE 4: Telegram Bot Gate   │
                              │ (Auto-Approved)    │   │ (src/remediation/telegram_   │
                              │ (src/remediation/  │   │  gate.py & telegram_bot.py)  │
                              │  runner.py)        │   │ • [Approve] / [Reject]       │
                              └─────────┬──────────┘   └──────────────┬───────────────┘
                                        │                             │
                                        │                      [User Approves]
                                        │                             │
                                        └──────────────┬──────────────┘
                                                       │
                                                       ▼
                                       ┌──────────────────────────────────┐
                                       │ PHASE 4: Remediation Execution   │
                                       │ • Subprocess / Remote SSH Runner │
                                       │ • Writes receipts to `actions`   │
                                       │ • Posts output back to Telegram  │
                                       └─────────────────┬────────────────┘
                                                         │
                                                         ▼
                                       ┌──────────────────────────────────┐
                                       │ PHASE 5: Automated Verification  │
                                       │ (src/verification/verifier.py)   │
                                       │ • Health Probes (HTTP / DB / Sys)│
                                       └─────────┬──────────────┬─────────┘
                                                 │              │
                                             [HEALTHY]      [UNHEALTHY]
                                                 │              │
                                                 ▼              ▼
                              ┌────────────────────┐   ┌──────────────────────────────┐
                              │ Gemini Post-Mortem │   │ P1 On-Call Escalation        │
                              │ (Executive Summary,│   │ • Telegram Alert             │
                              │  Timeline, RCA)    │   │ • Email Alert (SMTP)         │
                              │ • Mark Incident    │   └──────────────────────────────┘
                              │   Resolved in DB   │
                              └────────────────────┘
```

---

## 📂 Phase Breakdown & Component Reference

### Phase 1: Environment, Docker Compose & PostgreSQL Schema
- **Database:** Supabase PostgreSQL with `pgvector` v0.8.2.
- **Tables:**
  - `incidents`: Master incident records, status, severity, post-mortem.
  - `alerts`: Raw payload, normalized payload, fingerprint (unique deduplication).
  - `runbooks`: SOP content, chunk index, `VECTOR(768)` embedding with `HNSW` cosine index.
  - `actions`: Remediation commands, command type (`safe`/`destructive`), approval status, dry run flag, stdout/stderr receipts.
  - `timeline`: Chronological audit trail of all lifecycle events.
  - `ai_logs`: Audit trail of Gemini LLM prompts, reasoning, tokens, and latency.

### Phase 2: Runbook Ingestion & pgvector Semantic Search Pipeline
- **Document Chunker (`src/rag/chunker.py`):** Loads `.md`, `.txt`, `.pdf`, `.docx`.
- **Gemini Embedder (`src/rag/embedder.py`):** Uses Google GenAI `gemini-embedding-001` with `output_dimensionality=768`.
- **Ingestion Runner (`src/rag/ingest.py`):** Chunks files in `runbooks/`, calculates vectors, and inserts into Supabase.
- **Search Engine (`src/rag/search.py`):** Queries `1 - (embedding <=> query_vector) >= 0.60`.

### Phase 3: Webhook Alert Ingestion & Gemini AI Classification
- **Alert Normalizer (`src/triage/normalizer.py`):** Normalizes Prometheus Alertmanager, Grafana, Datadog, and Custom JSON.
- **Gemini AI Classifier (`src/triage/classifier.py`):** Uses `gemini-2.5-flash` to evaluate alerts with RAG SOP context.
- **FastAPI Webhook Service (`src/triage/webhook_service.py`):** Listens on port 8000 for `POST /webhook/alerts`.
- **n8n Workflow (`workflows/n8n_alert_triage.json`):** Orchestrates webhook intake and database persistence.

### Phase 4: Safety Decision Engine, SSH Remediation & Telegram Approval Gate
- **Safety Policy Guard (`src/remediation/safety_guard.py`):** Deterministic regex categorization.
  - *Safe Allowlist:* `docker restart`, `systemctl restart/reload`, `truncate -s 0`, diagnostics (`df`, `free`, `ps`).
  - *Destructive Blocklist:* `rm -rf`, `reboot`, `shutdown`, `kill -9`, `drop table`, `truncate table`, `iptables -F`.
- **Telegram Approval Gate (`src/remediation/telegram_gate.py`):** Sends interactive cards with `[✅ Approve & Execute]` and `[❌ Reject & Abort]` inline buttons.
- **Telegram Live Poller (`src/remediation/telegram_bot.py`):** Real-time background long-polling worker processing button clicks.
- **Execution Runner (`src/remediation/runner.py`):** Executes approved commands locally or over SSH and records receipts.
- **Remediation Controller (`src/remediation/controller.py`):** Coordinates safety check -> auto-execution OR Telegram gate hold.

### Phase 5: Verification Engine, Post-Mortem Generator & Incident Archival (COMPLETE & VERIFIED)
- **Health Probes (`src/verification/verifier.py`):** Multi-protocol health verification (HTTP 200 checks, PostgreSQL connection & query probes, system resource thresholds) with configurable retry loops and exponential backoff.
- **Gemini Post-Mortem Generator (`src/verification/postmortem.py`):** Uses **Gemini 2.5 Flash** to ingest full incident lifecycle context (alerts, triage, SOPs, actions, timeline events, verification metrics) and generate an executive-ready Markdown Root Cause Analysis (RCA) report. Automatically persists markdown into `incidents.postmortem` and sets `status = 'resolved'`.
- **On-Call Notifier & Escalation Engine (`src/verification/notifier.py`):** Dispatches resolution summaries and urgent P1 escalation alerts to Telegram (`@Ai_Driven_Incident_Response_bot`) and On-Call channels.
- **Phase 5 Coordinator (`src/verification/coordinator.py`):** Orchestrates the full post-remediation verification, post-mortem generation, and escalation workflow.
- **End-to-End Incident Lifecycle Runner (`scripts/run_full_incident_lifecycle.py`):** Executes all 5 phases end-to-end in a unified simulation.
