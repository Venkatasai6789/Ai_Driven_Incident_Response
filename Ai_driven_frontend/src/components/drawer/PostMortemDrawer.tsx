import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  CheckCheck,
  ShieldCheck,
  Terminal,
  Clock,
  FileText,
  ListOrdered,
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  ExternalLink,
  Share2,
  Download,
  Flame,
  Zap,
  Layers,
  Lock,
  Code,
  ArrowRight,
} from 'lucide-react';
import { ActiveIncidentState } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface PostMortemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeIncident: ActiveIncidentState;
}

export const PostMortemDrawer: React.FC<PostMortemDrawerProps> = ({
  isOpen,
  onClose,
  activeIncident,
}) => {
  const [activeTab, setActiveTab] = useState<'Summary' | 'Timeline' | 'Remediation' | 'Actions'>('Summary');
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showStack, setShowStack] = useState(true);

  // Dynamic stack trace / log excerpt based on incident service
  const getForensicTrace = () => {
    switch (activeIncident.service) {
      case 'checkout-service':
        return `[FATAL] v8::internal::Heap::FatalProcessOutOfMemory (Allocation failed - JavaScript heap out of memory)
  at Array.map (<anonymous>)
  at BatchOrderTransformer.serializeBuffer (/app/services/checkout/worker.js:142:19)
  at Object.processBulkCheckout (/app/services/checkout/pipeline.js:89:12)
-- Telemetry Evidence:
  heap_used_bytes: 1,984,201,728 / 2,048,000,000 (98.4% limit)
  event_loop_lag_ms: 1,480ms (Threshold: 50ms)
  status: Worker unresponsive on pod checkout-service-7f9b8c-x2q`;
      case 'postgresql':
        return `[ALERT] PgBouncer pool client socket saturation:
  active_connections: 96 / 100 (96.0% utilization)
  queued_queries: 48 (avg wait: 340ms)
  idle_in_transaction_count: 32 client handles
-- Forensic SQL Socket Trace:
  PID 8491: "SELECT * FROM orders WHERE status = 'PENDING' FOR UPDATE" (Socket open: 420s)
  Root Cause: Microservice client omitted connection pool release in exception handler.`;
      case 'api-gateway':
        return `[SECURITY] Edge Ingress WAF Rule Triggered:
  Source CIDR: 198.51.100.0/24 (Known Distributed Scanner Botnet)
  Route Targeted: POST /api/v2/auth/token
  Payload Match: "' OR 1=1; EXEC xp_cmdshell --" (SQLi Pattern #9401)
  Edge POPs Enforced: 280 Global Edge Points isolated in 240ms.`;
      case 'logging-service':
        return `[STORAGE] Storage Volume Capacity Threshold Breached:
  Mount: /var/log/audit (Node Volume nvme0n1p2)
  Utilized: 92.4% (92.4GB / 100GB)
  Growth Rate: +1.4GB/minute (Debug log verbosity set to TRACE post-staging test)
  Remediation: Gzip compression & archive tiering to S3 cold storage.`;
      default:
        return `[ANOMALY] Out-of-Domain Error Classification:
  Service: ${activeIncident.service}
  Retrieved Runbook Cosine Similarity: 0.241 (Threshold: 0.700)
  Action: Zero Mutation Safe Mode engaged. Auto-escalated to Primary On-Call Engineer.`;
    }
  };

  const handleCopyMarkdown = () => {
    const markdownContent = `# INCIDENT POST-MORTEM DOSSIER: ${activeIncident.title}
**Incident ID:** ${activeIncident.incidentId}  
**Target Service:** \`${activeIncident.service}\`  
**Severity:** ${activeIncident.severity} (MTTR: ${activeIncident.duration})  
**Autonomous First-Responder:** Gemini 2.0 SRE Engine  
**Runbook Matched:** ${activeIncident.sopMatched} (Cosine Confidence: ${activeIncident.confidence}%)  

---

## 1. Executive Summary
${activeIncident.postMortem.executiveSummary}

---

## 2. System Impact Telemetry
- **Target Service:** \`${activeIncident.postMortem.impact.service}\`
- **Severity Tier:** ${activeIncident.postMortem.impact.severity}
- **Total MTTR:** ${activeIncident.postMortem.impact.duration}
- **Affected Sessions:** ${activeIncident.postMortem.impact.usersAffected}
- **SLO Availability Impact:** ${activeIncident.postMortem.impact.availabilityImpact}
- **Blast Radius:** ${activeIncident.blastRadius}

---

## 3. Root Cause Diagnostics & Forensic Evidence
${activeIncident.postMortem.rootCauseAnalysis}

\`\`\`
${getForensicTrace()}
\`\`\`

---

## 4. Chronological Telemetry Timeline
| Time (UTC) | Source | Event Description |
|---|---|---|
${activeIncident.timeline.map((t) => `| ${t.time} | \`${t.source}\` | ${t.event} |`).join('\n')}

---

## 5. Executed Remediation CLI & Safety Guardrail
**Authorized Command:**  
\`\`\`bash
${activeIncident.proposedCommand}
\`\`\`

**Execution Output:**  
\`\`\`bash
${activeIncident.terminalOutput}
\`\`\`

---

## 6. Preventative Measures & Action Items
### Preventative Measures:
${activeIncident.postMortem.preventativeMeasures.map((m) => `- [x] ${m}`).join('\n')}

### Engineering Follow-ups:
${activeIncident.postMortem.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}
`;

    navigator.clipboard?.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeIncident.terminalOutput);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isCrit = activeIncident.severity === 'CRITICAL';
  const isHigh = activeIncident.severity === 'HIGH';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            id="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-40"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            id="post-mortem-drawer"
            role="dialog"
            aria-label="Incident Post-Mortem Dossier"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-[560px] max-w-[95vw] h-full bg-[#F8FAFC] dark:bg-[#07090F] border-l border-slate-200 dark:border-white/[0.08] flex flex-col justify-between shadow-2xl z-50 overflow-hidden select-text transition-colors duration-300"
          >
            {/* Drawer Header */}
            <div className="p-4 bg-white dark:bg-[#090C14] border-b border-slate-200 dark:border-white/[0.08] flex-shrink-0 shadow-2xs">
              {/* Top Row: Identifier & Close */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-white/[0.08] text-white text-[10px] font-bold flex items-center justify-center shadow-2xs font-mono">
                    PM
                  </div>
                  <h2 className="text-[12px] font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                    INCIDENT POST-MORTEM DOSSIER
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    AUTONOMOUSLY MITIGATED
                  </span>
                </div>
                <button
                  id="close-drawer-btn"
                  onClick={onClose}
                  aria-label="Close dossier"
                  className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Badges Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                    {activeIncident.incidentId}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10.5px] font-bold rounded-md flex items-center gap-1 font-mono ${
                      isCrit
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 animate-pulse'
                        : isHigh
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                    }`}
                  >
                    {isCrit && <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                    {activeIncident.severity} · P1
                  </span>
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-transparent dark:border-zinc-700">
                    MTTR: <b className="text-slate-900 dark:text-zinc-200">{activeIncident.duration}</b>
                  </span>
                </div>
                <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 font-mono">
                  {activeIncident.timeAgo}
                </span>
              </div>

              {/* Title & Microservice Tag */}
              <h1 className="text-[15.5px] font-bold text-slate-900 dark:text-white leading-snug">
                {activeIncident.title}
              </h1>

              {/* AI SRE Engine & SOP Runbook Match Banner */}
              <div className="mt-2 bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-emerald-950/30 dark:to-indigo-950/30 border border-emerald-200/70 dark:border-emerald-800/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium truncate">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="truncate">Gemini 2.0 SRE Engine · <b className="font-semibold font-mono">{activeIncident.sopMatched}</b></span>
                </div>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-white/80 dark:bg-black/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
                  {activeIncident.confidence}% Match
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-5 mt-3 border-b border-slate-100 dark:border-white/[0.08] -mb-[17px] text-[11.5px]">
                {(['Summary', 'Timeline', 'Remediation', 'Actions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 font-bold transition-all relative cursor-pointer ${
                      activeTab === tab
                        ? 'text-slate-900 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-400'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body: Tabbed Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-slate-900 dark:text-zinc-100">
              {activeTab === 'Summary' && (
                <div className="space-y-3">
                  {/* Section 1: Executive Summary */}
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-[10.5px] uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" />
                      <span>1. Executive Incident Summary</span>
                    </div>
                    <p className="text-[12px] text-slate-800 dark:text-zinc-300 leading-relaxed">
                      {activeIncident.postMortem.executiveSummary}
                    </p>
                  </div>

                  {/* Section 2: 4-KPI Impact Telemetry Grid */}
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2 text-slate-900 dark:text-white font-bold text-[10.5px] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>2. System Impact Telemetry</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">
                        SLO Met 99.99%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06] rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Total Autonomous MTTR</span>
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {activeIncident.postMortem.impact.duration}
                        </div>
                        <span className="text-[9.5px] text-slate-400 dark:text-zinc-500">Detection to recovery</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06] rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Blast Radius Ceiling</span>
                        <div className="text-sm font-bold text-slate-900 dark:text-zinc-200 truncate font-mono mt-0.5">
                          {activeIncident.blastRadius}
                        </div>
                        <span className="text-[9.5px] text-slate-400 dark:text-zinc-500">Zero cross-node bleed</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06] rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Affected Client Requests</span>
                        <div className="text-sm font-bold text-slate-900 dark:text-zinc-200 truncate font-mono mt-0.5">
                          {activeIncident.postMortem.impact.usersAffected}
                        </div>
                        <span className="text-[9.5px] text-slate-400 dark:text-zinc-500">Graceful connection drain</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06] rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Availability Budget Loss</span>
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {activeIncident.postMortem.impact.availabilityImpact}
                        </div>
                        <span className="text-[9.5px] text-slate-400 dark:text-zinc-500">Budget consumed: &lt;0.01%</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Root Cause Diagnostics & Forensic Trace */}
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2 text-slate-900 dark:text-white font-bold text-[10.5px] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>3. Root Cause & Forensic Evidence</span>
                      </div>
                      <button
                        onClick={() => setShowStack(!showStack)}
                        className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Code className="w-3 h-3" />
                        <span>{showStack ? 'Hide Trace' : 'Show Trace'}</span>
                      </button>
                    </div>

                    <p className="text-[12px] text-slate-800 dark:text-zinc-300 leading-relaxed mb-2.5">
                      {activeIncident.postMortem.rootCauseAnalysis}
                    </p>

                    {showStack && (
                      <div className="bg-slate-950 dark:bg-black rounded-lg p-3 font-mono text-[10px] text-emerald-400 leading-relaxed overflow-x-auto border border-slate-800 dark:border-zinc-800">
                        <div className="text-slate-500 dark:text-zinc-500 mb-1 border-b border-slate-800 dark:border-zinc-800 pb-1 flex justify-between">
                          <span>// Telemetry Diagnostic Stack Dump</span>
                          <span>Source: {activeIncident.service}</span>
                        </div>
                        <pre className="whitespace-pre-wrap">{getForensicTrace()}</pre>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Runbook Vector Alignment */}
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-[10.5px] uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>4. Matched Semantic Runbook Embeddings</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800/40 font-bold">
                        {activeIncident.confidence}% Match
                      </span>
                    </div>

                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-2.5 text-[11.5px]">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center justify-between">
                        <span>{activeIncident.sopMatched}</span>
                        <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">pgvector HNSW</span>
                      </div>
                      <p className="text-slate-600 dark:text-zinc-300 text-[11px] mt-1">
                        {activeIncident.recommendedAction}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        <span className="bg-white dark:bg-black/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/[0.08]">
                          Sources: {activeIncident.evidenceSources}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Timeline' && (
                <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 text-slate-900 dark:text-white font-bold text-[10.5px] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Chronological Telemetry Stream</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                      {activeIncident.timeline.length} Recorded Milestones
                    </span>
                  </div>

                  <div className="space-y-3.5 relative pl-3.5 border-l-2 border-slate-200 dark:border-zinc-800 ml-2">
                    {activeIncident.timeline.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white dark:bg-black border-2 border-emerald-500 shadow-2xs" />
                        <div className="flex items-baseline justify-between text-[10.5px] text-slate-500 dark:text-zinc-400 mb-0.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-zinc-200">{item.time} UTC</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[9.5px] font-semibold border border-slate-200 dark:border-zinc-700">
                            {item.source}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-800 dark:text-zinc-300 leading-snug">
                          {item.event}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Remediation' && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-[10.5px] uppercase tracking-wider">
                        <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Autonomous Remediation CLI Execution</span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                      >
                        {copiedCode ? <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-950 dark:bg-black rounded-lg p-3 font-mono text-[11px] text-slate-200 leading-relaxed overflow-x-auto border border-slate-800 dark:border-zinc-800">
                      <div className="text-slate-500 dark:text-zinc-500 text-[10px] mb-1.5 pb-1 border-b border-slate-800 dark:border-zinc-800 flex justify-between">
                        <span>// Terminal Output</span>
                        <span className="text-emerald-400">Exit Code: 0 (SUCCESS)</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-emerald-300">{activeIncident.terminalOutput}</pre>
                    </div>
                  </div>

                  {/* Deterministic Guardrail Proof */}
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-[10.5px] uppercase tracking-wider mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Deterministic Safety Guardrail Audit</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06]">
                        <span className="text-slate-700 dark:text-zinc-300">Zero-Downtime Rolling Update Policy</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">PASSED ✓</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06]">
                        <span className="text-slate-700 dark:text-zinc-300">Blast Radius Ceiling (&lt; 10% Cluster Capacity)</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">PASSED ✓</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06]">
                        <span className="text-slate-700 dark:text-zinc-300">Destructive Pattern Filter (AST Checked)</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">PASSED ✓</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#131826] border border-slate-100 dark:border-white/[0.06]">
                        <span className="text-slate-700 dark:text-zinc-300">Auto-Authorization Clearance</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">GRANTED ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Actions' && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-[10.5px] uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Preventative Architectural Controls</span>
                    </div>
                    <ul className="space-y-2 text-[11.5px] text-slate-800 dark:text-zinc-300">
                      {activeIncident.postMortem.preventativeMeasures.map((measure, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-[#131826] p-2 rounded-lg border border-slate-100 dark:border-white/[0.06]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-snug">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-[#0E121C] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2 text-blue-700 dark:text-blue-400 font-bold text-[10.5px] uppercase tracking-wider">
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>Engineering Follow-Up Tickets & PRs</span>
                    </div>
                    <ul className="space-y-2 text-[11.5px] text-slate-800 dark:text-zinc-300">
                      {activeIncident.postMortem.actionItems.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 bg-slate-50 dark:bg-[#131826] p-2.5 rounded-lg border border-slate-100 dark:border-white/[0.06]">
                          <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 font-mono">
                            P{idx}
                          </span>
                          <div className="flex-1">
                            <span className="leading-snug font-medium">{action}</span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                              <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1 rounded">PR #{840 + idx}</span>
                              <span>Assigned: Core Platform SRE</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3.5 bg-white dark:bg-[#090C14] border-t border-slate-200 dark:border-white/[0.08] flex items-center gap-2.5 flex-shrink-0">
              <button
                id="copy-markdown-postmortem-btn"
                onClick={handleCopyMarkdown}
                className="flex-1 py-2.5 px-3 bg-white dark:bg-[#151926] hover:bg-slate-50 dark:hover:bg-[#1D2336] border border-slate-300 dark:border-white/[0.08] text-slate-800 dark:text-zinc-200 text-[11.5px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-slate-400 dark:hover:border-white/[0.18]"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">Copied Markdown Dossier</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                    <span>Copy Full Markdown Dossier</span>
                  </>
                )}
              </button>

              <button
                id="close-drawer-bottom-btn"
                onClick={onClose}
                className="py-2.5 px-5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-[11.5px] font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Close Dossier
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

