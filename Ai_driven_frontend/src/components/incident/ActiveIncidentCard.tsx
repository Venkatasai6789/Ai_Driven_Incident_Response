import React from 'react';
import { AlertTriangle, Clock, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ActiveIncidentState } from '../../types';

interface ActiveIncidentCardProps {
  activeIncident: ActiveIncidentState;
  onInvestigate: () => void;
}

export const ActiveIncidentCard: React.FC<ActiveIncidentCardProps> = ({
  activeIncident,
  onInvestigate,
}) => {
  const isClosed = 
    activeIncident.status === 'CLOSED' ||
    activeIncident.status === 'RESOLVED' ||
    !activeIncident.incidentId ||
    activeIncident.incidentId === 'INC-NOMINAL-000' ||
    activeIncident.incidentId === 'nominal' ||
    activeIncident.title.includes('Operational') ||
    activeIncident.title.includes('0 Errors');

  const isCritical = !isClosed && activeIncident.severity === 'CRITICAL';
  const isHigh = !isClosed && activeIncident.severity === 'HIGH';

  return (
    <div
      id="active-incident-spotlight-card"
      className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] flex flex-col justify-between transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-[#F0F2F0] dark:bg-white/[0.08] text-[#111312] dark:text-white text-[10px] font-bold flex items-center justify-center">
            4
          </span>
          <h2 className="text-[12px] font-bold text-[#111312] dark:text-white tracking-wider uppercase">
            {isClosed ? 'INCIDENT MONITOR' : 'ACTIVE INCIDENT MONITOR'}
          </h2>
        </div>

        <button
          id="view-incident-details-link"
          onClick={onInvestigate}
          className="text-[11px] font-semibold text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer transition-colors"
        >
          View Post-Mortem
        </button>
      </div>

      {/* Incident Box Container */}
      <div
        className={`rounded-xl p-3 flex flex-col gap-2 transition-all ${
          isClosed
            ? 'border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0E121B]'
            : isCritical
            ? 'border border-[#FDA4AF] dark:border-rose-900/50 bg-[#FFF5F5] dark:bg-rose-950/20'
            : isHigh
            ? 'border border-[#FDE68A] dark:border-amber-900/50 bg-[#FFFBEB] dark:bg-amber-950/20'
            : 'border border-[#BAE6FD] dark:border-sky-900/50 bg-[#F0F9FF] dark:bg-sky-950/20'
        }`}
      >
        {/* Top Row: Status / Severity Badge + ID + Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isClosed ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold border border-slate-300 dark:border-zinc-700 font-mono">
                <CheckCircle2 className="w-3 h-3 text-slate-600 dark:text-zinc-400" />
                CLOSED
              </span>
            ) : (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                  isCritical
                    ? 'bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border border-transparent dark:border-rose-800/40'
                    : isHigh
                    ? 'bg-[#FEF3C7] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 border border-transparent dark:border-amber-800/40'
                    : 'bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400 border border-transparent dark:border-sky-800/40'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {activeIncident.severity}
              </span>
            )}

            <span className="text-[11px] font-mono font-bold text-[#111312] dark:text-zinc-200">
              {activeIncident.incidentId || 'INC-NOMINAL-000'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[#606763] dark:text-zinc-400 font-medium font-mono">
            <Clock className="w-3 h-3 text-[#606763] dark:text-zinc-400" />
            <span>{activeIncident.timeAgo || 'Live'}</span>
          </div>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="text-[13px] font-bold text-[#111312] dark:text-white leading-snug">
            {activeIncident.title}
          </h3>
          <p className="text-[11px] text-[#475569] dark:text-zinc-400 mt-0.5 leading-normal">
            {activeIncident.description}
          </p>
        </div>

        {/* 4 Metric Blocks */}
        <div className="grid grid-cols-4 gap-2 pt-0.5">
          {/* Block 1 */}
          <div className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              Confidence
            </span>
            <span className="text-[12.5px] font-bold text-[#15803D] dark:text-emerald-400 leading-tight font-mono">
              {activeIncident.confidence}%
            </span>
          </div>

          {/* Block 2 */}
          <div className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              Runbook
            </span>
            <span className="text-[10.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight truncate font-mono">
              {activeIncident.sopMatched}
            </span>
          </div>

          {/* Block 3 */}
          <div className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              MTTR
            </span>
            <span className="text-[11.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight font-mono">
              {activeIncident.duration}
            </span>
          </div>

          {/* Block 4 */}
          <div className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              Blast Radius
            </span>
            <span className="text-[10.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight truncate font-mono">
              {activeIncident.blastRadius}
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          id="investigate-incident-btn"
          onClick={onInvestigate}
          className="w-full py-1.5 bg-white dark:bg-[#151924] hover:bg-[#FAFAFA] dark:hover:bg-[#1E2433] border border-[#E5E8E5] dark:border-white/[0.08] text-[#111312] dark:text-zinc-200 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <span>Open Post-Mortem Dossier</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#111312] dark:text-zinc-200" />
        </button>
      </div>
    </div>
  );
};

