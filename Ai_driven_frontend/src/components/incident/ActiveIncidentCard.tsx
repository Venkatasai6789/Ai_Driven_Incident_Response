import React from 'react';
import { AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';
import { ActiveIncidentState } from '../../types';

interface ActiveIncidentCardProps {
  activeIncident: ActiveIncidentState;
  onInvestigate: () => void;
}

export const ActiveIncidentCard: React.FC<ActiveIncidentCardProps> = ({
  activeIncident,
  onInvestigate,
}) => {
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
            ACTIVE INCIDENT MONITOR
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
      <div className="border border-[#FDA4AF] dark:border-rose-900/50 bg-[#FFF5F5] dark:bg-rose-950/20 rounded-xl p-3 flex flex-col gap-2 transition-colors">
        {/* Top Row: Severity Badge + ID + Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 text-[10px] font-bold border border-transparent dark:border-rose-800/40 font-mono">
              <AlertTriangle className="w-3 h-3 fill-[#E11D48] dark:fill-rose-400 text-[#FFE4E6] dark:text-rose-950" />
              {activeIncident.severity}
            </span>
            <span className="text-[11px] font-mono font-bold text-[#111312] dark:text-zinc-200">
              {activeIncident.incidentId}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[#606763] dark:text-zinc-400 font-medium font-mono">
            <Clock className="w-3 h-3 text-[#606763] dark:text-zinc-400" />
            <span>{activeIncident.timeAgo}</span>
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
          <div className="bg-white dark:bg-[#0E121B] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              Confidence
            </span>
            <span className="text-[12.5px] font-bold text-[#15803D] dark:text-emerald-400 leading-tight font-mono">
              {activeIncident.confidence}%
            </span>
          </div>

          {/* Block 2 */}
          <div className="bg-white dark:bg-[#0E121B] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              Runbook
            </span>
            <span className="text-[10.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight truncate font-mono">
              {activeIncident.sopMatched}
            </span>
          </div>

          {/* Block 3 */}
          <div className="bg-white dark:bg-[#0E121B] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
            <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mb-1">
              MTTR
            </span>
            <span className="text-[11.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight font-mono">
              {activeIncident.duration}
            </span>
          </div>

          {/* Block 4 */}
          <div className="bg-white dark:bg-[#0E121B] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg p-1.5 flex flex-col">
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

