import React from 'react';
import { Bug, Database, HardDrive, ShieldAlert, Search } from 'lucide-react';
import { ChaosExperiment } from '../../types';
import { chaosExperiments } from '../../data/mockIncidents';
import { motion } from 'motion/react';

interface ChaosLabProps {
  currentExperimentId: string;
  onTriggerExperiment: (exp: ChaosExperiment) => void;
}

export const ChaosLab: React.FC<ChaosLabProps> = ({
  currentExperimentId,
  onTriggerExperiment,
}) => {
  return (
    <div
      id="chaos-lab-card"
      className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] flex flex-col justify-between transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-[#F0F2F0] dark:bg-white/[0.08] text-[#111312] dark:text-white text-[10px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-[12px] font-bold text-[#111312] dark:text-white tracking-wider uppercase">
            FAULT INJECTION SUITE — Disaster Recovery Simulation
          </h2>
        </div>

        <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-medium hidden sm:inline">
          5 Failure Scenarios
        </span>
      </div>

      <p className="text-[10.5px] text-[#606763] dark:text-zinc-400 mb-2">
        Inject simulated cluster failures to validate automated runbook resolution & guardrail policies
      </p>

      {/* 5 Chaos Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {chaosExperiments.map((exp) => {
          const isActive = exp.id === currentExperimentId;

          let icon = <Bug className="w-3.5 h-3.5 text-[#EF4444] dark:text-rose-400" />;
          let iconBg = 'bg-[#FEE2E2] dark:bg-rose-950/50';
          if (exp.type === 'db') {
            icon = <Database className="w-3.5 h-3.5 text-[#F97316] dark:text-orange-400" />;
            iconBg = 'bg-[#FFEDD5] dark:bg-orange-950/50';
          } else if (exp.type === 'disk') {
            icon = <HardDrive className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-400" />;
            iconBg = 'bg-[#FEF3C7] dark:bg-amber-950/50';
          } else if (exp.type === 'security') {
            icon = <ShieldAlert className="w-3.5 h-3.5 text-[#9333EA] dark:text-purple-400" />;
            iconBg = 'bg-[#F3E8FF] dark:bg-purple-950/50';
          } else if (exp.type === 'rag') {
            icon = <Search className="w-3.5 h-3.5 text-[#0284C7] dark:text-sky-400" />;
            iconBg = 'bg-[#E0F2FE] dark:bg-sky-950/50';
          }

          return (
            <motion.button
              key={exp.id}
              id={`trigger-${exp.id}`}
              onClick={() => onTriggerExperiment(exp)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                isActive
                  ? 'border-[#22C55E] dark:border-emerald-500 ring-2 ring-[#DCFCE7] dark:ring-emerald-900/50 bg-[#F0FDF4] dark:bg-emerald-950/30 shadow-xs'
                  : 'border-[#E5E8E5] dark:border-white/[0.08] bg-white dark:bg-[#0E121B] hover:border-[#CBD5E1] dark:hover:border-white/[0.18] hover:bg-[#FAFAFA] dark:hover:bg-[#141A26] shadow-xs'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
              >
                {icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight truncate">
                  {exp.title}
                </span>
                <span className="text-[9px] text-[#929894] dark:text-zinc-500 font-medium leading-none mt-0.5 truncate font-mono">
                  {exp.sop}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

