import React from 'react';
import { AlertTriangle, Sparkles, ShieldCheck, Activity, CheckCircle2, RotateCcw } from 'lucide-react';
import { ActiveIncidentState } from '../../types';

interface TopStatusBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeIncident?: ActiveIncidentState | null;
  onResetNominal?: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  activeIncident,
  onResetNominal,
}) => {
  const isNominal = !activeIncident || activeIncident.incidentId === 'INC-NOMINAL-000' || activeIncident.incidentId === 'nominal' || activeIncident.title.includes('Operational');
  const isCritical = !isNominal && activeIncident?.severity === 'CRITICAL';
  const isHigh = !isNominal && activeIncident?.severity === 'HIGH';
  const isMedium = !isNominal && activeIncident?.severity === 'MEDIUM';
  const isLow = !isNominal && activeIncident?.severity === 'LOW';
  const hasIncident = !isNominal;

  return (
    <header
      id="top-executive-bar"
      className="w-full flex-shrink-0 flex items-center gap-2.5 px-4 pt-3 pb-1 select-none"
    >
      {/* 1. Platform Brand & Architecture Identifier */}
      <div
        id="aurora-brand"
        className="flex items-center gap-3 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-4 py-2.5 h-[62px] min-w-[250px] shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        {/* Geometric Mark */}
        <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/40 border border-[#DCFCE7] dark:border-emerald-800/40 flex items-center justify-center flex-shrink-0">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-2 h-2 rounded-[2px] bg-[#16A34A] dark:bg-emerald-400" />
            <div className="w-2 h-2 rounded-[2px] bg-[#22C55E] dark:bg-emerald-500" />
            <div className="w-2 h-2 rounded-[2px] bg-[#4ADE80] dark:bg-emerald-300" />
            <div className="w-2 h-2 rounded-[2px] bg-[#15803D] dark:bg-emerald-600" />
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-[#111312] dark:text-white tracking-wider uppercase leading-tight">
            AURORA SRE
          </span>
          <span className="text-[10px] text-[#606763] dark:text-zinc-400 leading-tight mt-0.5 font-medium">
            Autonomous Incident Engine
          </span>
        </div>
      </div>

      {/* 2. Metric: Cluster Health */}
      <div
        id="metric-system-health"
        className="flex-1 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
          Cluster Health
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isCritical ? 'bg-rose-500 animate-ping' : isHigh ? 'bg-amber-500' : 'bg-[#22C55E]'
            }`}
          />
          <span
            className={`text-[12.5px] font-bold tracking-tight ${
              isCritical
                ? 'text-rose-600 dark:text-rose-400'
                : isHigh
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-[#15803D] dark:text-emerald-400'
            }`}
          >
            {isCritical ? 'TRIAGING INCIDENT' : isHigh ? 'DEGRADED / GUARDED' : 'OPERATIONAL'}
          </span>
        </div>
        <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono">
          {hasIncident ? `Target: ${activeIncident.service} (SRE Guardrail)` : 'Envoy Mesh · 99.99% SLO'}
        </span>
      </div>

      {/* 3. Metric: Active Incidents */}
      <div
        id="metric-active-incidents"
        className="flex-1 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] relative group transition-colors duration-300"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
            Active Incidents
          </span>
          {hasIncident && onResetNominal && (
            <button
              onClick={onResetNominal}
              title="Acknowledge / Reset to All Nominal"
              className="text-[9.5px] text-slate-400 dark:text-zinc-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          {isCritical ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444] animate-pulse" />
              <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                01 CRITICAL
              </span>
            </>
          ) : isHigh ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                01 HIGH
              </span>
            </>
          ) : isMedium || isLow ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
              <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                01 ADVISORY
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
                00 ACTIVE
              </span>
            </>
          )}
        </div>

        <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono">
          {hasIncident ? '1 Service Under Triage · 0 Drop' : 'All Systems Nominal · 0 Errors'}
        </span>
      </div>

      {/* 4. Metric: Inference Engine Runtime */}
      <div
        id="metric-ai-engine"
        className="flex-1 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
          Inference Engine
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-[#6366F1] dark:text-indigo-400 fill-[#6366F1] dark:fill-indigo-400" />
          <span className="text-[12.5px] font-bold text-[#6366F1] dark:text-indigo-400 tracking-tight">
            ACTIVE (p99 38ms)
          </span>
        </div>
        <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono">
          Gemini SRE Reasoning Model
        </span>
      </div>

      {/* 5. Metric: Semantic Vector Runbook Index */}
      <div
        id="metric-vector-match"
        className="flex-1 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
          Semantic Runbook Index
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 fill-[#2563EB] dark:fill-blue-400" />
          <span className="text-[12.5px] font-bold text-[#111312] dark:text-white tracking-tight font-mono">
            {hasIncident ? `${activeIncident.confidence}% Match` : '98.4% Match'}
          </span>
        </div>
        <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono">
          pgvector HNSW Vector Index
        </span>
      </div>
    </header>
  );
};

