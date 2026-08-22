-- ==============================================================================
-- AI-Driven Incident Response & IT Alert Management System
-- Database Initialization & Schema Definition (PostgreSQL + pgvector)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Incidents Table (Master lifecycle & postmortem record)
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium' 
        CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' 
        CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed', 'escalated')),
    source VARCHAR(100) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    postmortem TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);

-- 3. Alerts Table (Raw incoming payloads & deduplication)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL,
    fingerprint VARCHAR(255) UNIQUE,
    raw_payload JSONB NOT NULL,
    normalized_payload JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium'
        CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    status VARCHAR(50) NOT NULL DEFAULT 'firing',
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deduplicated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint ON alerts (fingerprint);
CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON alerts (incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_received_at ON alerts (received_at DESC);

-- 4. Runbooks Table (SOP documents, chunked text, & Gemini 768-dim embeddings)
CREATE TABLE IF NOT EXISTS runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    embedding VECTOR(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runbooks_source_file ON runbooks (source_file);
-- HNSW Vector Cosine Index for fast semantic similarity retrieval (Repo A synthesis)
CREATE INDEX IF NOT EXISTS idx_runbooks_embedding ON runbooks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Actions Table (Remediation commands, safety classification & execution receipts)
-- Adopts Repo B's Runbook Guard safety gating and dry-run by default
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    command_type VARCHAR(20) NOT NULL 
        CHECK (command_type IN ('safe', 'destructive')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved', 'expired')),
    approved_by VARCHAR(100),
    executed_at TIMESTAMPTZ,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actions_incident_id ON actions (incident_id);
CREATE INDEX IF NOT EXISTS idx_actions_approval_status ON actions (approval_status);

-- 6. Timeline Table (Traceable event logs for incident lifecycle audit)
CREATE TABLE IF NOT EXISTS timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(100) NOT NULL DEFAULT 'system',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_incident_id ON timeline (incident_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON timeline (created_at ASC);

-- 7. AI Logs Table (Audit trail of LLM prompts, reasoning, and token usage)
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    token_count INTEGER,
    latency_ms INTEGER,
    purpose VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_incident_id ON ai_logs (incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_purpose ON ai_logs (purpose);

-- 8. Auto-update Trigger for incidents.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_incidents_updated_at ON incidents;
CREATE TRIGGER trigger_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
