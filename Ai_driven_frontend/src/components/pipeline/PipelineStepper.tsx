import React, { useState } from 'react';
import { Check, ShieldCheck, Copy, CheckCheck, Loader2, Radio, Sparkles, Terminal } from 'lucide-react';
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
    navigator.clipboard?.writeText(activeIncident.proposedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Compact, professional stage labels that never collide
  const stepShortLabels = ['Ingest', 'Vector', 'Triage', 'Guardrail', 'Execute', 'Verify'];

  // Calculate dynamic progress percentage: 
  const getProgressPercentage = () => {
    if (isClosed) return 0;
    const idx = activeIncident.currentStepIndex;
    if (idx >= 5) return 100;
    if (idx === 4) return 75;
    if (idx === 3) return 60;
    if (idx === 2) return 40;
    if (idx === 1) return 20;
    return 5;
  };

  const isExecuting = !isClosed && activeIncident.currentStepIndex === 4;

  return (
    <div
      id="pipeline-stepper-card"
      className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] flex flex-col justify-between transition-colors duration-300 min-h-[220px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-[#F0F2F0] dark:bg-white/[0.08] text-[#111312] dark:text-white text-[10px] font-bold flex items-center justify-center">
            5
          </span>
          <h2 className="text-[12px] font-bold text-[#111312] dark:text-white tracking-wider uppercase">
            AUTONOMOUS REMEDIATION PIPELINE
          </h2>
          {isLoading ? (
            <div className="w-24 h-4 rounded-full skeleton-shimmer" />
          ) : isExecuting ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 text-[10px] font-semibold text-amber-700 dark:text-amber-400 animate-pulse">
              <Loader2 className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
              Executing in DB/Shell
            </span>
          ) : isClosed ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
              Standby Mode
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/50 border border-[#DCFCE7] dark:border-emerald-800/40 text-[10px] font-semibold text-[#15803D] dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] dark:bg-emerald-400 animate-pulse" />
              Live Guardrail
            </span>
          )}
        </div>
      </div>

      {/* Stepper Pipeline Bar */}
      <div className="w-full px-1 py-1.5">
        <div className="flex items-center justify-between relative">
          {/* Horizontal Connecting Line Behind Steps */}
          <div className="absolute top-3 left-4 right-4 h-[3px] bg-[#E5E8E5] dark:bg-zinc-800 rounded-full overflow-hidden -z-0">
            {isLoading ? (
              <div className="w-full h-full skeleton-shimmer" />
            ) : (
              <motion.div
                className={`h-full ${
                  isClosed
                    ? 'bg-transparent'
                    : isExecuting
                    ? 'bg-gradient-to-r from-[#22C55E] via-amber-400 to-[#22C55E] animate-laser-flow'
                    : 'bg-[#22C55E] dark:bg-emerald-400'
                }`}
                initial={false}
                animate={{
                  width: `${getProgressPercentage()}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            )}
          </div>

          {/* Steps */}
          {isLoading ? (
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center relative z-1 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full skeleton-shimmer" />
                <div className="w-10 h-2 rounded skeleton-shimmer mt-1.5" />
                <div className="w-8 h-2 rounded skeleton-shimmer mt-0.5" />
              </div>
            ))
          ) : isClosed ? (
            /* Standby Steps (Clean, Neutral, Ready) */
            stepShortLabels.map((label, idx) => (
              <div key={label} className="flex flex-col items-center relative z-1 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-100 dark:bg-zinc-800/90 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                  <span>{idx + 1}</span>
                </div>
                <span className="text-[9.5px] font-medium mt-1.5 leading-tight text-center truncate w-full text-slate-500 dark:text-zinc-400">
                  {label}
                </span>
                <span className="text-[8.5px] leading-tight font-mono mt-0.5 truncate w-full text-center text-slate-400 dark:text-zinc-500">
                  Ready
                </span>
              </div>
            ))
          ) : (
            activeIncident.steps.map((step, idx) => {
              const isCompleted = step.status === 'completed' || activeIncident.status === 'CLOSED' || activeIncident.status === 'RESOLVED';
              const isActive = step.status === 'active' && !isCompleted;

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center relative z-1 flex-1 min-w-0"
                >
                  {/* Step Circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCompleted
                        ? 'bg-[#22C55E] dark:bg-emerald-500 text-white shadow-xs'
                        : isActive
                        ? 'bg-white dark:bg-black border-2 border-[#22C55E] dark:border-emerald-400 text-[#15803D] dark:text-emerald-400 ring-3 ring-[#DCFCE7] dark:ring-emerald-900/40 shadow-xs'
                        : 'bg-[#F0F2F0] dark:bg-zinc-800 text-[#929894] dark:text-zinc-500 border border-[#E5E8E5] dark:border-zinc-700'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : isActive && idx === 4 ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-[9.5px] font-semibold mt-1.5 leading-tight text-center truncate w-full ${
                      isCompleted || isActive ? 'text-[#111312] dark:text-white' : 'text-[#929894] dark:text-zinc-500'
                    }`}
                  >
                    {stepShortLabels[idx] || step.label}
                  </span>

                  {/* Step Time */}
                  <span
                    className={`text-[8.5px] leading-tight font-mono mt-0.5 truncate w-full text-center ${
                      isActive
                        ? 'text-[#15803D] dark:text-emerald-400 font-bold'
                        : isCompleted
                        ? 'text-[#606763] dark:text-zinc-400'
                        : 'text-[#929894] dark:text-zinc-500'
                    }`}
                  >
                    {isCompleted ? 'Verified' : step.time || step.timestamp || step.sublabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Current Step Inspector Box */}
      <div className="mt-1 bg-[#FAFAFA] dark:bg-[#0E121B] rounded-xl border border-[#F0F2F0] dark:border-white/[0.08] p-2.5 flex flex-col gap-2">
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

            <div>
              <div className="w-32 h-2 rounded skeleton-shimmer mb-1" />
              <div className="w-full h-8 rounded-lg skeleton-shimmer" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#F0F2F0] dark:border-white/[0.08]">
              <div className="w-40 h-2.5 rounded skeleton-shimmer" />
              <div className="w-28 h-2.5 rounded skeleton-shimmer" />
            </div>
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
                  Actively listening for Prometheus alert webhooks and eBPF kernel threshold anomalies. Upon detection, this pipeline executes deterministic triage and verified runbook recovery.
                </p>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[9.5px] font-bold rounded-md font-mono flex-shrink-0 ml-2">
                <Radio className="w-3 h-3 text-slate-500 dark:text-zinc-400 animate-pulse" />
                <span>0 IN-FLIGHT</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9.5px] pt-1.5 border-t border-slate-100 dark:border-white/[0.06] font-mono text-slate-500 dark:text-zinc-400">
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
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] text-[#606763] dark:text-zinc-400 font-medium tracking-wide block leading-none mb-1 uppercase">
                    Current Execution Phase
                  </span>
                  <h4 className="text-[11.5px] font-bold text-[#111312] dark:text-white leading-tight">
                    {activeIncident.currentStepName}
                  </h4>
                  <p className="text-[10px] text-[#606763] dark:text-zinc-400 mt-0.5 leading-normal">
                    {activeIncident.currentStepDescription}
                  </p>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
                    Risk Tier
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 text-[9.5px] font-bold rounded border border-transparent dark:border-emerald-800/40 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{activeIncident.riskLevel}</span>
                  </div>
                </div>
              </div>

              {/* Proposed Command Row */}
              <div>
                <span className="text-[9px] text-[#606763] dark:text-zinc-400 font-medium block leading-none mb-1">
                  Deterministic CLI Command
                </span>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-black border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <code className="text-[10px] font-mono text-[#111312] dark:text-emerald-400 font-semibold truncate flex-1">
                    {activeIncident.proposedCommand}
                  </code>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={handleCopyCommand}
                      title="Copy command"
                      className="p-1 text-[#606763] dark:text-zinc-400 hover:text-[#111312] dark:hover:text-white hover:bg-[#F0F2F0] dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#22C55E] dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="flex items-center pl-1.5 border-l border-[#E5E8E5] dark:border-white/[0.08]">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 rounded font-mono">
                        {activeIncident.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Step Row */}
              <div className="flex items-center justify-between text-[9.5px] pt-1 border-t border-[#F0F2F0] dark:border-white/[0.08]">
                <span className="text-[#606763] dark:text-zinc-400">
                  Next Phase: <strong className="text-[#111312] dark:text-zinc-200 font-semibold">{activeIncident.nextStepLabel}</strong>
                </span>
                <span className="text-[#15803D] dark:text-emerald-400 font-semibold">
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



