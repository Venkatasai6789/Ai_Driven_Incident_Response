import React, { useState } from 'react';
import { Check, ShieldCheck, Copy, CheckCheck, Loader2, Radio, Sparkles, Send } from 'lucide-react';
import { ActiveIncidentState } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface PipelineStepperProps {
  activeIncident: ActiveIncidentState;
  isLoading?: boolean;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  activeIncident,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = () => {
    if (activeIncident.proposedCommand) {
      navigator.clipboard?.writeText(activeIncident.proposedCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isClosed =
    activeIncident.status === 'CLOSED' ||
    activeIncident.status === 'RESOLVED' ||
    activeIncident.status === 'NOMINAL' ||
    !activeIncident.incidentId ||
    activeIncident.incidentId === 'INC-NOMINAL-000' ||
    activeIncident.incidentId === 'nominal' ||
    activeIncident.title.includes('Operational') ||
    activeIncident.title.includes('0 Errors');

  // 6 deterministic pipeline stage labels
  const stepShortLabels = ['Ingest', 'Vector', 'Triage', 'Guardrail', 'Execute', 'Verify'];

  const currentStepIdx = isClosed ? 5 : (activeIncident.currentStepIndex ?? 3);
  const isExecuting = !isClosed && currentStepIdx === 4;
  const isAwaitingApproval = !isClosed && (currentStepIdx === 3 || activeIncident.nextStepStatus?.toLowerCase().includes('approval'));

  // Calculate dynamic progress percentage:
  const getProgressPercentage = () => {
    if (isClosed) return 100;
    return Math.min(100, Math.max(0, (currentStepIdx / 5) * 100));
  };

  const getStepSublabel = (idx: number, step?: any) => {
    if (isClosed) return idx === 5 ? '100% Healthy' : 'Verified';
    if (idx < currentStepIdx) return step?.time || 'Verified';
    if (idx === currentStepIdx) {
      if (idx === 4) return 'Executing';
      if (idx === 3) return 'Awaiting Approval';
      return 'In Progress';
    }
    return 'Pending';
  };

  return (
    <div
      id="pipeline-stepper-card"
      className="bg-white dark:bg-[#090C14] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors duration-300 min-h-[300px] h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-[#0F172A] dark:bg-white/[0.08] text-white text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
            5
          </span>
          <div className="min-w-0">
            <h2 className="text-[12px] font-bold text-[#0F172A] dark:text-white tracking-wider uppercase truncate">
              AUTONOMOUS REMEDIATION PIPELINE
            </h2>
            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 font-medium leading-tight truncate mt-0.5">
              Zero-blast-radius execution pipeline
            </p>
          </div>
        </div>

        {/* Header Right Status Pill */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {isLoading ? (
            <div className="w-24 h-4 rounded-full skeleton-shimmer" />
          ) : isExecuting ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 text-[10px] font-semibold text-amber-700 dark:text-amber-400 animate-pulse">
              <Loader2 className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
              Executing in DB/Shell
            </span>
          ) : isAwaitingApproval ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/40 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
              Telegram 2FA Armed
            </span>
          ) : isClosed ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
              Standby Mode
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Guardrail Active
            </span>
          )}
        </div>
      </div>

      {/* Stepper Pipeline Bar */}
      <div className="w-full px-1 py-2">
        <div className="flex items-center justify-between relative">
          {/* Horizontal Connecting Line Behind Steps */}
          <div className="absolute top-3 left-4 right-4 h-[3px] bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden -z-0">
            {isLoading ? (
              <div className="w-full h-full skeleton-shimmer" />
            ) : (
              <motion.div
                className={`h-full ${
                  isClosed
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : isExecuting
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 animate-laser-flow'
                    : 'bg-emerald-500 dark:bg-emerald-400'
                }`}
                initial={false}
                animate={{
                  width: `${getProgressPercentage()}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            )}
          </div>

          {/* 6 Step Nodes */}
          {stepShortLabels.map((label, idx) => {
            const stepObj = activeIncident.steps?.[idx];
            const isCompleted = isClosed || idx < currentStepIdx;
            const isActive = !isClosed && idx === currentStepIdx;
            const sublabel = getStepSublabel(idx, stepObj);

            return (
              <div key={label} className="flex flex-col items-center relative z-1 flex-1 min-w-0">
                {/* Step Circle Node */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? [1, 1.08, 1] : 1,
                  }}
                  transition={{
                    repeat: isActive ? Infinity : 0,
                    duration: 2,
                    ease: 'easeInOut',
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-white dark:bg-black border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : isActive && idx === 4 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </motion.div>

                {/* Step Label */}
                <span
                  className={`text-[9.5px] font-semibold mt-1.5 leading-tight text-center truncate w-full ${
                    isCompleted || isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {label}
                </span>

                {/* Step Sublabel / Status */}
                <span
                  className={`text-[8.5px] leading-tight font-mono mt-0.5 truncate w-full text-center ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : isCompleted
                      ? 'text-slate-500 dark:text-zinc-400'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {sublabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Inspector Box */}
      <div className="mt-1 bg-[#FAFAFA] dark:bg-[#0E121B] rounded-xl border border-slate-200 dark:border-white/[0.08] p-3 flex flex-col gap-2.5">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="w-24 h-2 rounded skeleton-shimmer" />
                <div className="w-48 h-3.5 rounded skeleton-shimmer" />
                <div className="w-64 h-2.5 rounded skeleton-shimmer" />
              </div>
              <div className="w-14 h-4 rounded skeleton-shimmer" />
            </div>
            <div className="w-full h-8 rounded-lg skeleton-shimmer" />
          </div>
        ) : isClosed ? (
          /* Standby Execution Box */
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium tracking-wide block leading-none mb-1 uppercase font-mono">
                  EXECUTION PIPELINE · STANDBY
                </span>
                <h4 className="text-[12px] font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                  Autonomous SRE Remediation Engine Idle
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Actively listening for Prometheus alert webhooks and eBPF threshold anomalies. Upon detection, this pipeline executes verified runbook recovery.
                </p>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[9.5px] font-bold rounded-md font-mono flex-shrink-0 ml-2">
                <Radio className="w-3 h-3 text-slate-500 dark:text-zinc-400 animate-pulse" />
                <span>0 IN-FLIGHT</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9.5px] pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06] font-mono text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Gemini 2.5 Flash Triage: <strong className="text-slate-700 dark:text-zinc-200">Armed</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Zero-Blast-Radius Policy: <strong className="text-slate-700 dark:text-zinc-200">Enforced</strong></span>
              </span>
            </div>
          </div>
        ) : (
          /* Real-time Pipeline Execution Inspector */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIncident.incidentId + '-' + activeIncident.currentStepName}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2 flex-1 justify-between"
            >
              {/* Phase Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 dark:text-zinc-400 font-medium tracking-wide block leading-none mb-1 uppercase font-mono">
                    Current Execution Phase
                  </span>
                  <h4 className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                    {activeIncident.currentStepName}
                  </h4>
                  <p className="text-[10.5px] text-slate-600 dark:text-zinc-300 mt-0.5 leading-normal">
                    {activeIncident.currentStepDescription}
                  </p>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium leading-none mb-1">
                    Risk Tier
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-bold rounded border border-emerald-200 dark:border-emerald-800/40 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{activeIncident.riskLevel || 'LOW'}</span>
                  </div>
                </div>
              </div>

              {/* Telegram 2FA Notice if awaiting operator approval */}
              {isAwaitingApproval && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-lg text-[10px] text-sky-800 dark:text-sky-300">
                  <Send className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                  <span className="flex-1 truncate">
                    Telegram 2FA Authorization Armed: <strong>@AuroraSREBot</strong> (Awaiting Operator Click)
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 font-mono text-[9px] font-bold flex-shrink-0">
                    HITL
                  </span>
                </div>
              )}

              {/* Proposed Command Row */}
              <div>
                <span className="text-[9px] text-slate-500 dark:text-zinc-400 font-medium block leading-none mb-1">
                  Deterministic CLI Command
                </span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-black border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <code className="text-[10px] font-mono text-slate-900 dark:text-emerald-400 font-semibold truncate flex-1">
                    {activeIncident.proposedCommand}
                  </code>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyCommand}
                      title="Copy CLI command"
                      className="p-1 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="flex items-center pl-1.5 border-l border-slate-200 dark:border-white/[0.08]">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded font-mono">
                        {activeIncident.category || 'SAFE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Step Row */}
              <div className="flex items-center justify-between text-[9.5px] pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-slate-500 dark:text-zinc-400 truncate max-w-[240px]">
                  Next Phase: <strong className="text-slate-800 dark:text-zinc-200 font-semibold">{activeIncident.nextStepLabel}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[9.5px] flex-shrink-0 ml-2">
                  {activeIncident.nextStepStatus}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};




