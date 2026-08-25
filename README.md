# 🛡️ AI-Driven Incident Response & IT Alert Management System

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL pgvector](https://img.shields.io/badge/PostgreSQL-pgvector%20v0.8.2-336791?style=flat&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash%20%7C%20Embeddings-4285F4?style=flat&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Telegram Bot Gate](https://img.shields.io/badge/Telegram-Human--in--the--Loop-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![React Dashboard](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat&logo=react&logoColor=black)](./Ai_driven_frontend)
[![Tests Passing](https://img.shields.io/badge/Tests-33%2F33%20Passing%20(100%25)-brightgreen?style=flat&logo=pytest&logoColor=white)]()

An autonomous, multi-phase Site Reliability Engineering (SRE) and IT Alert Management platform. It ingests multi-source monitoring alerts (Prometheus, Grafana, Datadog), conducts semantic Standard Operating Procedure (SOP) retrieval via `pgvector`, performs AI-driven root-cause triage with Google Gemini 2.5 Flash, enforces deterministic safety guardrails & write budgets, requires interactive Telegram approvals for destructive actions, executes validated remediations (Local/SSH), verifies service recovery via multi-protocol health probes, and generates executive-grade Root Cause Analysis (RCA) post-mortems stored in PostgreSQL.

---

## 📑 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [System Architecture & Workflow](#-system-architecture--workflow)
- [Phase Breakdown](#-phase-breakdown)
- [Repository Structure](#-repository-structure)
- [Prerequisites & Requirements](#-prerequisites--requirements)
- [Installation & Setup](#-installation--setup)
- [Configuration (.env)](#-configuration-env)
- [Execution & Operations](#-execution--operations)
- [Frontend Dashboard](#-frontend-dashboard)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Safety & Security Policies](#-safety--security-policies)
- [License](#-license)

---

## ⚡ Key Capabilities

- **Multi-Source Ingestion & Deduplication**: Native parsers for Prometheus Alertmanager, Grafana, Datadog, and custom webhooks with SHA-256 fingerprint deduplication.
- **Semantic SOP Runbook Retrieval (RAG)**: Chunks standard operating procedures and creates 768-dimensional Gemini embeddings stored in Supabase / PostgreSQL with HNSW cosine indexing.
- **AI-Powered Root Cause Triage**: Gemini 2.5 Flash automatically assigns incident severity, formulates diagnostic hypotheses, and formulates precise remediation plans.
- **Deterministic Safety Gating**: Regex allowlist/blocklist enforcement, capability write-action quotas, and adversarial prompt injection filtering before command dispatch.
- **Human-in-the-Loop (HITL) Telegram Gate**: Interactive Telegram cards with `[Approve]` and `[Reject]` buttons for high-risk or destructive actions, backed by low-latency long-polling workers.
- **Audited Execution Engine**: Subprocess and remote SSH runners with dry-run capabilities, recording structured execution receipts (`stdout`, `stderr`, `exit_code`, `duration_ms`).
- **Multi-Protocol Recovery Verification**: Automated health probes (HTTP status checks, SQL queries, system resource thresholds) with exponential backoff.
- **Automated RCA Post-Mortems & Escalation**: Generates comprehensive executive Markdown post-mortems in database and triggers on-call escalations (Telegram / SMTP) if verification fails.
- **Modern Operator Interface**: Full-featured React 19 + Tailwind CSS + Lucide dashboard for real-time monitoring and incident tracking.

---

## 🏛️ System Architecture & Workflow

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
                               │  Timeline, RCA)    │   │ • On-Call Channel Dispatch   │
                               │ • Mark Incident    │   └──────────────────────────────┘
                               │   Resolved in DB   │
                               └────────────────────┘
```

---

## 🔍 Phase Breakdown

| Phase | Core Focus | Key Modules | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Infrastructure & Data Schema** | `db/init.sql`, `docker-compose.yml` | Supabase / PostgreSQL with `pgvector` extension; sets up `incidents`, `alerts`, `runbooks`, `actions`, `timeline`, and `ai_logs` tables. |
| **Phase 2** | **RAG Ingestion & Vector Retrieval** | `src/rag/` (`chunker.py`, `embedder.py`, `ingest.py`, `search.py`) | Parses SOP Markdown documents, generates 768-dim embeddings via Google GenAI, stores in DB, and performs cosine similarity search (`1 - (embedding <=> query_vector) >= 0.60`). |
| **Phase 3** | **Alert Ingestion & AI Triage** | `src/triage/` (`normalizer.py`, `classifier.py`, `webhook_service.py`) | Normalizes Prometheus, Grafana, Datadog alerts; deduplicates via SHA-256; performs Gemini 2.5 Flash RCA triage and remediation formulation. |
| **Phase 4** | **Safety Guard & Execution Engine** | `src/remediation/` (`safety_guard.py`, `budgets.py`, `telegram_gate.py`, `runner.py`) | Classifies safe vs. destructive commands, enforces quota budgets, requests Telegram operator approval for destructive actions, and executes over subprocess/SSH with execution receipts. |
| **Phase 5** | **Verification & Post-Mortem RCA** | `src/verification/` (`verifier.py`, `postmortem.py`, `notifier.py`, `coordinator.py`) | Validates recovery via HTTP/DB/System probes; on success: synthesizes Gemini executive RCA post-mortem; on failure: initiates P1 on-call escalation. |

---

## 📁 Repository Structure

```
Ai_Driven_Incident_Response/
├── .env.example                                  # Master environment variable template
├── .gitignore                                    # Git exclusion rules
├── README.md                                     # Master documentation & operational guide
├── requirements.txt                              # Core Python dependencies
├── docker-compose.yml                            # Docker Compose for PostgreSQL (pgvector) & n8n
├── db/
│   └── init.sql                                  # Database schema definitions & pgvector indexing
├── runbooks/                                     # Standard Operating Procedure (SOP) Runbooks
│   ├── sop_101_high_memory_oom.md                # Memory leak & OOM recovery SOP
│   ├── sop_202_db_connection_starvation.md      # PostgreSQL connection pool starvation SOP
│   └── sop_303_k8s_crashloop.md                  # Kubernetes pod crash-loop backoff SOP
├── src/
│   ├── rag/                                      # Phase 2: RAG & Semantic Retrieval
│   │   ├── chunker.py                            # Document loader and recursive chunker
│   │   ├── embedder.py                           # Gemini 768-dim embedding client
│   │   ├── ingest.py                             # Runbook vector batch ingestion
│   │   └── search.py                             # pgvector cosine similarity search
│   ├── triage/                                   # Phase 3: Alert Ingestion & Triage
│   │   ├── normalizer.py                         # Multi-source schema normalization & deduplication
│   │   ├── classifier.py                         # Gemini 2.5 Flash triage & RCA planner
│   │   └── webhook_service.py                    # FastAPI alert ingestion listener (port 8000)
│   ├── remediation/                              # Phase 4: Safety & Remediation Execution
│   │   ├── safety_guard.py                       # Regex filter, allowlists & injection sanitizers
│   │   ├── budgets.py                            # Action rate limiter and capability quotas
│   │   ├── planner.py                            # Dynamic AI remediation planner
│   │   ├── runner.py                             # Subprocess & SSH command executor
│   │   ├── telegram_gate.py                      # Telegram approval cards & callback handler
│   │   ├── telegram_bot.py                       # High-speed Telegram polling worker
│   │   └── controller.py                         # Remediation dispatch controller
│   └── verification/                             # Phase 5: Verification & Archival
│       ├── verifier.py                           # Multi-protocol health probes (HTTP, SQL, System)
│       ├── postmortem.py                         # Gemini 2.5 Flash RCA post-mortem generator
│       ├── notifier.py                           # Telegram & escalation notifier
│       └── coordinator.py                        # Phase 5 workflow coordinator
├── Ai_driven_frontend/                           # Modern Operator Dashboard (React 19 + Vite)
│   ├── package.json                              # Frontend package configurations
│   ├── vite.config.ts                            # Vite configuration
│   └── src/                                      # UI components, views, and state management
├── workflows/
│   ├── n8n_supabase_rag_incident_response.json  # Complete n8n Supabase RAG Agent workflow
│   └── n8n_alert_triage.json                     # Lightweight webhook intake workflow
├── scripts/
│   ├── run_full_incident_lifecycle.py            # Master end-to-end 5-phase simulation runner
│   └── interactive_telegram_test.py              # Interactive live Telegram approval test script
├── docs/
│   └── ARCHITECTURE_AND_PHASE_GUIDE.md           # In-depth architectural documentation
└── tests/                                        # Master Pytest Suite (33/33 Tests Passing)
    ├── conftest.py                               # Shared Pytest fixtures and mocks
    ├── test_chaos_stress_harness.py              # 12 Chaos & non-deterministic stress tests
    ├── test_multi_scenario_enterprise.py         # 5 Enterprise scenario & injection tests
    ├── test_n8n_workflow_integration.py          # 3 n8n schema & connection tests
    ├── test_rag.py                               # 3 Vector search & chunking tests
    ├── test_safety_and_remediation.py            # 3 Safety guard & dry-run tests
    ├── test_triage.py                            # 4 Normalizer & FastAPI webhook tests
    └── test_verification_and_postmortem.py       # 3 Health probe & post-mortem tests
```

---

## 🛠️ Prerequisites & Requirements

- **Python**: `3.10+` (tested on 3.10, 3.11, 3.12, 3.13, 3.14)
- **Node.js**: `18+` / `20+` (for optional frontend dashboard)
- **Database**: PostgreSQL 15+ or Supabase instance with the `pgvector` extension enabled
- **Google Gemini API Key**: For embedding generation and triage/post-mortem LLM calls
- **Telegram Bot** *(Optional for live approvals)*: Bot Token & Chat ID created via `@BotFather`
- **Docker & Docker Compose** *(Optional)*: For running local pgvector & n8n containers

---

## 🚀 Installation & Setup

### 1. Clone the Repository & Create Virtual Environment

```bash
# Clone repository
git clone https://github.com/Venkatasai6789/Ai_Driven_Incident_Response.git
cd Ai_Driven_Incident_Response

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
```

### 2. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Start Infrastructure via Docker (Optional Local DB)

If running a local PostgreSQL + pgvector and n8n instance:

```bash
docker compose up -d
```

---

## ⚙️ Configuration (.env)

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your target configurations:

```ini
# ==============================================================================
# Database Configuration (PostgreSQL / Supabase + pgvector)
# ==============================================================================
DATABASE_URL=postgresql://postgres.your-project-id:your-password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
POSTGRES_USER=incident_user
POSTGRES_PASSWORD=incident_secure_pass_2024
POSTGRES_DB=incident_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ==============================================================================
# Google Gemini AI Configuration
# ==============================================================================
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=768
SIMILARITY_THRESHOLD=0.60

# ==============================================================================
# Telegram Approval Gate (Optional for Human-in-the-Loop)
# ==============================================================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_here

# ==============================================================================
# Remediation & Operational Modes
# ==============================================================================
DRY_RUN_DEFAULT=true
API_PORT=8000

# ==============================================================================
# Phase 5: Verification & On-Call Notifications
# ==============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
ONCALL_EMAIL=oncall-team@yourcompany.com
ALERT_SOURCE_URL=http://localhost:8080/health
```

### Database Initialization & Runbook Ingestion

```bash
# 1. Initialize PostgreSQL schema & pgvector tables
python -c "import psycopg2, os; from dotenv import load_dotenv; load_dotenv(); conn = psycopg2.connect(os.getenv('DATABASE_URL') + ('?sslmode=require' if 'supabase' in os.getenv('DATABASE_URL','') else '')); cur = conn.cursor(); cur.execute(open('db/init.sql', 'r').read()); conn.commit(); print('✓ Database Schema Initialized Successfully!'); cur.close(); conn.close()"

# 2. Ingest markdown runbooks from runbooks/ into pgvector
python src/rag/ingest.py
```

---

## 💻 Execution & Operations

### Mode 1: Run End-to-End Simulation (Phases 1 to 5)

Executes the complete incident lifecycle across all 5 phases with mock alerts, SOP retrieval, AI triage, safety checks, remediation execution, health probes, and RCA post-mortem generation:

```bash
python scripts/run_full_incident_lifecycle.py
```

### Mode 2: Launch FastAPI Webhook Listener

Starts the production REST webhook receiver for Prometheus, Grafana, and Datadog alerts on port `8000`:

```bash
python src/triage/webhook_service.py
```

- **Health Check**: `GET http://localhost:8000/health`
- **Alert Ingestion**: `POST http://localhost:8000/webhook/alerts`

**Sample Alert Ingestion Request:**

```bash
curl -X POST http://localhost:8000/webhook/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "source": "prometheus",
    "alert_name": "HighMemoryUsage",
    "severity": "critical",
    "service": "payment-api",
    "host": "prod-api-01",
    "description": "Memory consumption exceeded 95% threshold for 5m",
    "metrics": {"memory_percent": 96.4, "threshold": 90.0}
  }'
```

### Mode 3: Launch Interactive Telegram Approval Worker

Runs the Telegram long-polling worker to handle real-time operator approvals:

```bash
python scripts/interactive_telegram_test.py
```

---

## 🖥️ Frontend Dashboard

The platform includes a modern operator web application built with **React 19**, **Vite**, **Tailwind CSS**, and **Lucide Icons**.

```bash
cd Ai_driven_frontend

# Install dependencies
npm install

# Start development server (accessible on http://localhost:3000)
npm run dev

# Build for production
npm run build
```

---

## 🧪 Testing & Quality Assurance

The codebase includes an enterprise-grade automated test suite covering all operational phases, safety guardrails, schema parsing, and chaos stress conditions.

```bash
# Run the entire test suite (33 tests)
pytest tests/ -v

# Run the 12 Chaos & Stress-Test harness
pytest tests/test_chaos_stress_harness.py -v

# Run specific domain test suites
pytest tests/test_rag.py -v
pytest tests/test_safety_and_remediation.py -v
pytest tests/test_triage.py -v
pytest tests/test_verification_and_postmortem.py -v
pytest tests/test_multi_scenario_enterprise.py -v
pytest tests/test_n8n_workflow_integration.py -v
```

### Test Suite Summary

- **Chaos & Stress Tests (`test_chaos_stress_harness.py`)**: 12 tests verifying malformed payloads, injection attempts, DB disconnects, timeout handling, and capability budget exhaustions.
- **Enterprise Scenarios (`test_multi_scenario_enterprise.py`)**: 5 comprehensive multi-service enterprise incidents.
- **RAG Engine (`test_rag.py`)**: 3 tests for document chunking, embedding generation, and cosine distance search.
- **Safety Guard (`test_safety_and_remediation.py`)**: 3 tests verifying command classification, dry-run receipts, and policy evaluation.
- **Triage & Webhooks (`test_triage.py`)**: 4 tests validating multi-format normalization and FastAPI routing.
- **Verification (`test_verification_and_postmortem.py`)**: 3 tests for multi-protocol probes, retry backoffs, and post-mortem generation.
- **Workflow Integration (`test_n8n_workflow_integration.py`)**: 3 tests verifying n8n schema parsing and execution contracts.

---

## 🛡️ Safety & Security Policies

1. **Deterministic Command Classification**:
   - **Safe Allowlist** *(Direct Execution)*: Read-only diagnostics (`df`, `free`, `ps`, `uptime`), service restarts (`systemctl restart`, `docker restart`), cache clearing (`sync; echo 3 > /proc/sys/vm/drop_caches`).
   - **Destructive Blocklist** *(Requires Telegram Gate Approval)*: File removals (`rm -rf`), host power operations (`reboot`, `shutdown`), forceful termination (`kill -9`), database deletions (`DROP TABLE`, `TRUNCATE TABLE`), firewall flushes (`iptables -F`).
2. **Adversarial Prompt Injection Defense**:
   - Sanitizes and rejects user input containing prompt escape characters, system prompt overrides, or instruction hijack attempts.
3. **Capability Quotas & Rate Limits**:
   - Limits the maximum number of write actions per incident to prevent run-away automation loops.
4. **Dry-Run Safe Mode**:
   - Supports non-destructive execution simulations (`DRY_RUN_DEFAULT=true`) capturing execution plans without altering state.
5. **Typed Immutable Audit Trail**:
   - Every incident event, prompt, token usage count, LLM response, and command receipt is recorded in the PostgreSQL `timeline` and `actions` tables.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.
