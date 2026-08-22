# 🛡️ AI-Driven Incident Response & IT Alert Management System

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Supabase pgvector](https://img.shields.io/badge/Supabase-pgvector%20v0.8.2-3ECF8E.svg)](https://supabase.com/)
[![Google Gemini 2.5](https://img.shields.io/badge/Gemini-2.5%20Flash%20%2B%20Embeddings-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Approval%20Gate-2CA5E0.svg)](https://core.telegram.org/bots/api)
[![Tests Passing](https://img.shields.io/badge/tests-33%2F33%20passing%20(100%25)-brightgreen.svg)]()

An autonomous, multi-phase Site Reliability Engineering (SRE) platform designed to ingest multi-source monitoring alerts (Prometheus, Grafana, Datadog), perform semantic SOP runbook retrieval via `pgvector`, conduct root-cause triage using Google Gemini 2.5 Flash, enforce deterministic safety gating & write budgets, require interactive Telegram operator approvals for destructive commands, execute dry-run/SSH remediations, verify service recovery via multi-protocol health probes, and generate executive RCA Post-Mortems stored in PostgreSQL.

---

## 🏛️ System Architecture & Lifecycle Flow

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
                                       │ • Adversarial Injection Filter   │
                                       │ • Capability Budget Limiter      │
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
                              │  Timeline, RCA)    │   │ • Status = 'escalated'       │
                              │ • Mark Incident    │   └──────────────────────────────┘
                              │   Resolved in DB   │
                              └────────────────────┘
```

---

## 🧬 Reference Codebase Synthesis

This platform synthesizes patterns, algorithms, and architectures from 3 reference repositories located in `_reference_repos/`:

1. **Repo A (`RAG_pgvector`):** Vector chunking pipelines, Supabase PostgreSQL `pgvector` HNSW cosine similarity distance search (`1 - (embedding <=> query_vector)`).
2. **Repo B (`autonomous-agent-runbook-guard`):** Deterministic regex safety command classification (`safe` vs `destructive`), capability write-action quotas & circuit-breakers, dry-run receipts (`stdout`, `stderr`, `exit_code`, `duration_ms`), and post-condition health probes.
3. **Repo C (`RAG_with_n8n`):** Multi-source monitoring schema normalizer (Prometheus, Grafana, Datadog), SHA-256 fingerprint deduplication, and ready-to-import visual n8n RAG agent orchestration (`workflows/n8n_supabase_rag_incident_response.json`).

---

## 📁 Repository Directory Structure

```
Ai_Driven_Incident_Response/
├── .env.example                                  # Template for environment configuration
├── .gitignore                                    # Git ignore rules for virtualenvs, logs & caches
├── README.md                                     # Master documentation & operating manual
├── requirements.txt                              # Python package dependencies
├── db/
│   └── init.sql                                  # Supabase PostgreSQL DDL with pgvector schema
├── runbooks/                                     # Standard Operating Procedure (SOP) Markdown Runbooks
│   ├── sop_101_high_memory_oom.md
│   ├── sop_202_db_connection_starvation.md
│   └── sop_303_k8s_crashloop.md
├── src/
│   ├── rag/                                      # Phase 2: RAG Ingestion & Semantic Vector Search
│   │   ├── chunker.py                            # Document parsing & recursive chunking
│   │   ├── embedder.py                           # Google GenAI 768-dim Gemini embeddings
│   │   ├── ingest.py                             # Runbook vector batch ingestion into Supabase
│   │   └── search.py                             # Cosine similarity vector search engine
│   ├── triage/                                   # Phase 3: Ingestion, Normalization & Gemini Triage
│   │   ├── normalizer.py                         # Unified schema & SHA-256 deduplication
│   │   ├── classifier.py                         # Gemini 2.5 Flash RCA & remediation planner
│   │   └── webhook_service.py                    # Production FastAPI listener (POST /webhook/alerts)
│   ├── remediation/                              # Phase 4: Safety Decisions, Budgets & Telegram Gate
│   │   ├── safety_guard.py                       # Regex filter & adversarial sanitizer
│   │   ├── budgets.py                            # Capability budget & rate-limiting tracker
│   │   ├── planner.py                            # Dynamic AI remediation planner
│   │   ├── runner.py                             # Subprocess & SSH execution runner
│   │   ├── telegram_gate.py                      # Interactive Telegram approval cards & callbacks
│   │   ├── telegram_bot.py                       # High-speed Telegram long-polling worker (<15ms)
│   │   └── controller.py                         # Safety dispatch & execution controller
│   └── verification/                             # Phase 5: Health Probes, Post-Mortem & Escalation
│       ├── verifier.py                           # Multi-protocol probes (HTTP, SQL, System)
│       ├── postmortem.py                         # Gemini 2.5 Flash Markdown RCA generator
│       ├── notifier.py                           # Telegram resolution & P1 escalation notifier
│       └── coordinator.py                        # Phase 5 orchestration workflow
├── workflows/
│   ├── n8n_supabase_rag_incident_response.json  # Complete n8n Supabase RAG Agent workflow
│   └── n8n_alert_triage.json                     # Lightweight webhook intake workflow
├── scripts/
│   ├── run_full_incident_lifecycle.py            # Master end-to-end 5-phase simulation runner
│   └── interactive_telegram_test.py              # Interactive live Telegram approval test script
└── tests/                                        # Master Test Suite (33/33 Tests Passing)
    ├── test_chaos_stress_harness.py              # 12 Chaos & non-deterministic stress tests
    ├── test_multi_scenario_enterprise.py         # 5 Enterprise scenario & injection tests
    ├── test_n8n_workflow_integration.py          # 3 n8n schema & connection tests
    ├── test_rag.py                               # 3 Vector search & chunking tests
    ├── test_safety_and_remediation.py            # 3 Safety guard & dry-run tests
    ├── test_triage.py                            # 4 Normalizer & FastAPI webhook tests
    └── test_verification_and_postmortem.py       # 3 Health probe & post-mortem tests
```

---

## 🚀 Setup & Installation Guide

### 1. Prerequisites
- Python 3.10, 3.11, 3.12, 3.13, or 3.14
- Supabase / PostgreSQL database with `pgvector` enabled
- Google Gemini API Key
- Telegram Bot Token (created via `@BotFather`)

### 2. Environment Setup
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables Configuration (`.env`)
```ini
DATABASE_URL=postgresql://postgres.your-project-id:your-password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
TELEGRAM_BOT_TOKEN=8970004685:AAH-7eR_oSY78o6gjHRRR25sNxHAcMyE5Lg
TELEGRAM_CHAT_ID=5775779049
DRY_RUN_DEFAULT=true
API_PORT=8000
```

### 4. Database Initialization & Runbook Ingestion
```powershell
# Initialize PostgreSQL schema
python -c "import psycopg2, os; from dotenv import load_dotenv; load_dotenv(); conn = psycopg2.connect(os.getenv('DATABASE_URL') + '?sslmode=require'); cur = conn.cursor(); cur.execute(open('db/init.sql', 'r').read()); conn.commit(); print('Schema Initialized!'); cur.close(); conn.close()"

# Ingest SOP runbooks into pgvector
python src/rag/ingest.py
```

---

## 💻 Operating & Running the System

### Option A: Run Full End-to-End Simulation (Phases 1 to 5)
```powershell
python scripts/run_full_incident_lifecycle.py
```

### Option B: Start FastAPI Webhook Server on Port 8000
```powershell
python src/triage/webhook_service.py
```

### Option C: Run Interactive Telegram Bot Worker
```powershell
python scripts/interactive_telegram_test.py
```

---

## 🧪 Automated Testing (33 / 33 Passing)

```powershell
# Run the complete test suite
pytest tests/ -v

# Run the Chaos Stress-Test Harness (Domains 1-5)
pytest tests/test_chaos_stress_harness.py -v
```
