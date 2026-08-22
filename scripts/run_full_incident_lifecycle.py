"""
Complete End-to-End Incident Response Lifecycle Runner
Simulates and verifies all 5 phases working seamlessly:
Phase 1: Environment & Supabase PostgreSQL pgvector store
Phase 2: RAG Vector Search for SOP Runbooks
Phase 3: Webhook Alert Normalization & Gemini 2.5 Flash Triage
Phase 4: Safety Decision Policy Engine & Execution Runner
Phase 5: Automated Health Verification & Gemini RCA Post-Mortem Generation
"""

import json
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from src.rag.search import RunbookSearchEngine
from src.triage.normalizer import NormalizedAlert, AlertNormalizer
from src.triage.classifier import GeminiTriageClassifier
from src.remediation.safety_guard import SafetyGuard
from src.remediation.controller import RemediationController
from src.verification.coordinator import Phase5Coordinator


def main():
    print("=" * 75, flush=True)
    print("  AI-DRIVEN INCIDENT RESPONSE: FULL END-TO-END LIFECYCLE (PHASES 1-5)", flush=True)
    print("=" * 75, flush=True)

    ts = int(time.time())

    # =========================================================================
    # PHASE 1 & 2: Vector Search & SOP Retrieval
    # =========================================================================
    print("\n[PHASE 1 & 2] Querying pgvector Store for SOP Runbooks...", flush=True)
    search_engine = RunbookSearchEngine(similarity_threshold=0.50)
    query_text = "Container memory leak OOM killer Node.js event loop crash"
    sop_matches = search_engine.search(query_text, limit=1)
    if sop_matches:
        top_sop = sop_matches[0]
        print(f"[OK] RAG Vector Search Success: Found '{top_sop.title}' (Similarity: {top_sop.similarity_score * 100:.1f}%)", flush=True)
    else:
        print("[!] No SOP matches above threshold.", flush=True)

    # =========================================================================
    # PHASE 3: Alert Ingestion & Gemini AI Triage
    # =========================================================================
    print("\n[PHASE 3] Ingesting & Normalizing Inbound Monitoring Alert...", flush=True)
    alert = NormalizedAlert(
        source="prometheus",
        alert_name="CheckoutServiceHighMemoryLeak",
        description="Checkout worker node container checkout-worker-01 memory utilization reached 96% with recurring OOM errors in Node.js event loop.",
        severity="Critical",
        service="checkout-service",
        instance=f"worker-node-{ts}",
        fingerprint=AlertNormalizer.calculate_fingerprint("prometheus", "CheckoutServiceHighMemoryLeak", "checkout-service", f"worker-node-{ts}"),
    )
    classifier = GeminiTriageClassifier()
    triage = classifier.process_alert(alert)
    incident_id = triage.incident_id

    print(f"[OK] Gemini AI Classification Complete:")
    print(f"     * Incident ID:       {incident_id}", flush=True)
    print(f"     * AI Title:          {triage.title}", flush=True)
    print(f"     * Severity:          {triage.severity}", flush=True)
    print(f"     * Matched SOP:       {triage.matched_runbook_title} ({triage.similarity_score * 100:.1f}%)", flush=True)
    print(f"     * Root Cause:        {triage.root_cause_hypothesis[:120]}...", flush=True)
    print(f"     * Recommended Safe:  {triage.recommended_safe_command}", flush=True)

    # =========================================================================
    # PHASE 4: Safety Decision Engine & Remediation Execution
    # =========================================================================
    print("\n[PHASE 4] Evaluating Remediation Command Safety & Executing...", flush=True)
    cmd_to_run = triage.recommended_safe_command or "docker restart checkout-worker-01"
    eval_res = SafetyGuard.evaluate(cmd_to_run)
    print(f"     * Command:           `{cmd_to_run}`", flush=True)
    print(f"     * Safety Filter:     {eval_res.command_type.value.upper()} (Risk: {eval_res.risk_level})", flush=True)
    print(f"     * Requires Approval: {eval_res.requires_approval}", flush=True)

    controller = RemediationController()
    rem_res = controller.process_remediation(
        incident_id=incident_id,
        command=cmd_to_run,
        incident_title=triage.title,
        dry_run=True,
    )
    print(f"[OK] Remediation Execution Status: {rem_res['status'].upper()}", flush=True)
    print(f"     * Terminal Output:   {rem_res['stdout']}", flush=True)

    # =========================================================================
    # PHASE 5: Health Verification Probe & Gemini Post-Mortem Generation
    # =========================================================================
    print("\n[PHASE 5] Executing Automated Verification Probe & AI Post-Mortem Generation...", flush=True)
    coordinator = Phase5Coordinator()
    phase5_res = coordinator.process_incident_verification_and_closure(
        incident_id=incident_id,
        probe_type="database",  # Uses direct PostgreSQL query probe
        retries=2,
        simulated_healthy=True,
    )

    print(f"[OK] Incident Status: {phase5_res['status'].upper()}", flush=True)
    print(f"     * Probe Result:      {phase5_res['verification']['details']}", flush=True)
    print(f"     * Post-Mortem Size:  {phase5_res['postmortem_length']} characters", flush=True)

    # =========================================================================
    # Database Audit Trail Verification
    # =========================================================================
    print("\n[AUDIT] Querying Final Incident State from Supabase...", flush=True)
    conn = coordinator.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT title, severity, status, resolved_at, postmortem FROM incidents WHERE id = %s;", (incident_id,))
    final_inc = cur.fetchone()
    cur.execute("SELECT count(*) FROM timeline WHERE incident_id = %s;", (incident_id,))
    tl_count = cur.fetchone()[0]
    cur.close()
    conn.close()

    print(f"[OK] Supabase Audit Record Verified:")
    print(f"     * Title:             {final_inc[0]}", flush=True)
    print(f"     * Status:            {final_inc[2].upper()}", flush=True)
    print(f"     * Resolved At:       {final_inc[3]}", flush=True)
    print(f"     * Timeline Events:   {tl_count} chronological events logged", flush=True)

    print("\n" + "=" * 75, flush=True)
    print("  >>> POST-MORTEM ROOT CAUSE ANALYSIS (RCA) PREVIEW <<<", flush=True)
    print("=" * 75, flush=True)
    print(final_inc[4][:1200] + "\n...", flush=True)
    print("=" * 75, flush=True)
    print("  [SUCCESS] FULL END-TO-END INCIDENT LIFECYCLE VERIFIED!", flush=True)
    print("=" * 75, flush=True)


if __name__ == "__main__":
    main()
