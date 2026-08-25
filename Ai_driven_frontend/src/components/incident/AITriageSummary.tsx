import React from 'react';
import { ArrowUpRight, ShieldCheck, Cpu, Database, Network, FileCheck2, AlertOctagon } from 'lucide-react';
import { ActiveIncidentState } from '../../types';

interface AITriageSummaryProps {
  activeIncident: ActiveIncidentState;
  onOpenAnalysis: () => void;
}

export const AITriageSummary: React.FC<AITriageSummaryProps> = ({
  activeIncident,
  onOpenAnalysis,
}) => {
  return (
    <div
      id="ai-triage-summary-card"
      className="bg-white dark:bg-[#090C14] border border-[#E2E8F0] dark:border-white/[0.08] rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#0F172A] dark:bg-white/[0.08] text-white text-[10px] font-mono font-bold">
            3B
          </span>
          <div>
            <h2 className="text-[11.5px] font-bold text-[#0F172A] dark:text-white tracking-wider uppercase font-sans">
              TRIAGE & ROOT CAUSE
            </h2>
            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 font-medium leading-none mt-0.5">
              Deterministic AI diagnostics
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#F1F5F9] dark:bg-zinc-800/60 text-[#334155] dark:text-zinc-300 border border-[#E2E8F0] dark:border-white/[0.08]">
          {activeIncident.duration} triage
        </span>
      </div>

      {/* Structured Diagnostics Data */}
      <div className="flex flex-col gap-2 text-[11px] my-1">
        {/* Row 1: Root Cause */}
        <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0E121C] border border-[#E2E8F0] dark:border-white/[0.08] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-zinc-400 uppercase tracking-wider">
              Diagnosed Root Cause
            </span>
            <span className="text-[10px] font-mono font-bold text-[#16A34A] dark:text-emerald-400 bg-[#DCFCE7] dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-transparent dark:border-emerald-800/40">
              {activeIncident.confidence}% Match
            </span>
          </div>
          <span className="font-semibold text-[#0F172A] dark:text-zinc-100 text-[11.5px] leading-snug">
            {activeIncident.rootCause}
          </span>
        </div>

        {/* Row 2: Vector Runbook & Guardrail Policy */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0E121C] border border-[#E2E8F0] dark:border-white/[0.08] flex flex-col">
            <span className="text-[9.5px] font-bold text-[#64748B] dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Database className="w-3 h-3 text-[#64748B] dark:text-zinc-400" />
              Runbook
            </span>
            <span className="font-mono font-bold text-[#0F172A] dark:text-zinc-200 text-[11px] mt-0.5 truncate">
              {activeIncident.sopMatched}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0E121C] border border-[#E2E8F0] dark:border-white/[0.08] flex flex-col">
            <span className="text-[9.5px] font-bold text-[#64748B] dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#16A34A] dark:text-emerald-400" />
              Guardrail
            </span>
            <span className="font-mono font-bold text-[#16A34A] dark:text-emerald-400 text-[11px] mt-0.5 truncate">
              {activeIncident.category === 'SAFE' ? 'Safe · Zero Mutation' : 'Destructive Review'}
            </span>
          </div>
        </div>

        {/* Row 3: Blast Radius & Recommended Action */}
        <div className="flex flex-col gap-1 text-[11px] px-1">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] dark:text-zinc-400 font-medium">Blast Radius:</span>
            <span className="font-mono font-semibold text-[#0F172A] dark:text-zinc-200 text-right truncate max-w-[210px]">
              {activeIncident.blastRadius}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] dark:text-zinc-400 font-medium">Telemetry Sources:</span>
            <span className="font-medium text-[#334155] dark:text-zinc-300 text-right truncate max-w-[200px] text-[10.5px] font-mono">
              {activeIncident.evidenceSources}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA button */}
      <button
        type="button"
        id="view-ai-analysis-btn"
        onClick={onOpenAnalysis}
        className="w-full mt-1 py-2 bg-[#0F172A] dark:bg-[#161B28] hover:bg-[#1E293B] dark:hover:bg-[#1F2536] active:bg-[#020617] text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-transparent dark:border-white/[0.08]"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80] dark:text-emerald-400" />
        <span>Inspect Diagnostic Dossier & Post-Mortem</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

