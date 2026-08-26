import React from 'react';
import { AlertTriangle, Sparkles, ShieldCheck, CheckCircle2, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { ActiveIncidentState, SystemOverviewData } from '../../types';

interface TopStatusBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeIncident?: ActiveIncidentState | null;
  systemOverview?: SystemOverviewData | null;
  isLoading?: boolean;
  isBackendConnected?: boolean;
  onResetNominal?: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  activeIncident,
  systemOverview,
  isLoading = false,
  isBackendConnected = true,
  onResetNominal,
}) => {
  const isClosedOrResolved = 
    activeIncident?.status === 'CLOSED' || 
    activeIncident?.status === 'RESOLVED' || 
    activeIncident?.status === 'NOMINAL';

  const isNominal = 
    !activeIncident || 
    isClosedOrResolved ||
    activeIncident.incidentId === 'INC-NOMINAL-000' || 
    activeIncident.incidentId === 'nominal' || 
    activeIncident.title.includes('Operational') ||
    activeIncident.title.includes('0 Errors');

  const isCritical = !isNominal && activeIncident?.severity === 'CRITICAL';
  const isHigh = !isNominal && activeIncident?.severity === 'HIGH';
  const isMedium = !isNominal && activeIncident?.severity === 'MEDIUM';
  const isLow = !isNominal && activeIncident?.severity === 'LOW';
  const hasIncident = !isNominal;

  const clusterHealth = systemOverview?.cluster_health || (isCritical ? 'CRITICAL' : isHigh ? 'DEGRADED' : 'OPERATIONAL');
  const criticalCount = systemOverview?.active_incidents?.critical ?? (isCritical ? 1 : 0);
  const highCount = systemOverview?.active_incidents?.high ?? (isHigh ? 1 : 0);
  const totalUnresolved = systemOverview?.active_incidents?.total_unresolved ?? (hasIncident ? 1 : 0);
  const p99Latency = systemOverview?.inference_engine?.p99_latency_ms ?? 38;
  const inferenceModel = systemOverview?.inference_engine?.model || 'Gemini 2.5 Flash';
  const totalRunbooks = systemOverview?.vector_index?.total_runbooks ?? 5;
  const vectorMatchRate = systemOverview?.vector_index?.average_match_rate 
    ? Math.round(systemOverview.vector_index.average_match_rate * 1000) / 10 
    : 98.4;

  return (
    <header
      id="top-executive-bar"
      className="w-full flex-shrink-0 flex items-center gap-2.5 px-4 pt-3 pb-1 select-none overflow-x-auto"
    >
      {/* 1. Platform Brand & Architecture Identifier */}
      <div
        id="aurora-brand"
        className="flex items-center gap-3 bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-4 py-2.5 h-[62px] min-w-[240px] shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300 flex-shrink-0"
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
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[#111312] dark:text-white tracking-wider uppercase leading-tight">
              AURORA SRE
            </span>
            <span className="flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 border border-[#DCFCE7] dark:border-emerald-800/40">
              <span className="w-1 h-1 rounded-full bg-[#16A34A] dark:bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <span className="text-[10px] text-[#606763] dark:text-zinc-400 leading-tight mt-0.5 font-medium">
            Autonomous Incident Engine
          </span>
        </div>
      </div>

      {/* 2. Metric: Cluster Health */}
      <div
        id="metric-system-health"
        className="flex-1 min-w-[150px] bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        {isLoading ? (
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="w-16 h-2.5 rounded skeleton-shimmer" />
            <div className="w-28 h-4 rounded skeleton-shimmer" />
            <div className="w-32 h-2 rounded skeleton-shimmer" />
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
              Cluster Health
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  clusterHealth === 'CRITICAL' ? 'bg-rose-500 animate-ping' : clusterHealth === 'DEGRADED' ? 'bg-amber-500' : 'bg-[#22C55E]'
                }`}
              />
              <span
                className={`text-[12.5px] font-bold tracking-tight ${
                  clusterHealth === 'CRITICAL'
                    ? 'text-rose-600 dark:text-rose-400'
                    : clusterHealth === 'DEGRADED'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[#15803D] dark:text-emerald-400'
                }`}
              >
                {clusterHealth === 'CRITICAL' ? 'CRITICAL / TRIAGING' : clusterHealth === 'DEGRADED' ? 'DEGRADED / GUARDED' : 'OPERATIONAL'}
              </span>
            </div>
            <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono truncate">
              {hasIncident ? `Target: ${activeIncident?.service} (SRE Guardrail)` : 'Envoy Mesh · 99.99% SLO'}
            </span>
          </>
        )}
      </div>

      {/* 3. Metric: Active Incidents */}
      <div
        id="metric-active-incidents"
        className="flex-1 min-w-[150px] bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] relative group transition-colors duration-300"
      >
        {isLoading ? (
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="w-20 h-2.5 rounded skeleton-shimmer" />
            <div className="w-24 h-4 rounded skeleton-shimmer" />
            <div className="w-36 h-2 rounded skeleton-shimmer" />
          </div>
        ) : (
          <>
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
              {criticalCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444] animate-pulse" />
                  <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                    {String(criticalCount).padStart(2, '0')} CRITICAL
                  </span>
                </>
              ) : highCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                    {String(highCount).padStart(2, '0')} HIGH
                  </span>
                </>
              ) : totalUnresolved > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                    {String(totalUnresolved).padStart(2, '0')} ADVISORY
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

            <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono truncate">
              {hasIncident ? `${totalUnresolved} Service Under Triage · 0 Drop` : 'All Systems Nominal · 0 Errors'}
            </span>
          </>
        )}
      </div>

      {/* 4. Metric: Inference Engine Runtime */}
      <div
        id="metric-ai-engine"
        className="flex-1 min-w-[150px] bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        {isLoading ? (
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="w-20 h-2.5 rounded skeleton-shimmer" />
            <div className="w-28 h-4 rounded skeleton-shimmer" />
            <div className="w-32 h-2 rounded skeleton-shimmer" />
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
              Inference Engine
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1] dark:text-indigo-400 fill-[#6366F1] dark:fill-indigo-400" />
              <span className="text-[12.5px] font-bold text-[#6366F1] dark:text-indigo-400 tracking-tight">
                ACTIVE (p99 {p99Latency}ms)
              </span>
            </div>
            <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono truncate">
              {inferenceModel}
            </span>
          </>
        )}
      </div>

      {/* 5. Metric: Semantic Vector Runbook Index */}
      <div
        id="metric-vector-match"
        className="flex-1 min-w-[150px] bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl px-3.5 py-2 h-[62px] flex flex-col justify-center shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors duration-300"
      >
        {isLoading ? (
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="w-24 h-2.5 rounded skeleton-shimmer" />
            <div className="w-20 h-4 rounded skeleton-shimmer" />
            <div className="w-32 h-2 rounded skeleton-shimmer" />
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium leading-none">
              Semantic Runbook Index
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 fill-[#2563EB] dark:fill-blue-400" />
              <span className="text-[12.5px] font-bold text-[#111312] dark:text-white tracking-tight font-mono">
                {hasIncident ? `${activeIncident?.confidence}% Match` : `${vectorMatchRate}% Match`}
              </span>
            </div>
            <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 leading-none mt-0.5 font-mono truncate">
              pgvector HNSW ({totalRunbooks} SOPs)
            </span>
          </>
        )}
      </div>
    </header>
  );
};


