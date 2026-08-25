import React from 'react';
import { ChevronRight, AlertTriangle, AlertCircle, Info, Radio, Activity, Sparkles } from 'lucide-react';
import { IncidentSeverity } from '../../types';
import { chaosExperiments } from '../../data/mockIncidents';

export interface TelemetryAlertItem {
  id: string;
  experimentId: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  metric: string;
  timeAgo: string;
  status: 'ACTIVE' | 'RESOLVING' | 'INVESTIGATING';
}

interface ActiveAlertStreamProps {
  currentExperimentId: string;
  onSelectAlert: (experimentId: string) => void;
  onOpenDossier?: () => void;
}

export const telemetryAlertsList: TelemetryAlertItem[] = [
  {
    id: 'alt-oom',
    experimentId: 'exp-oom',
    severity: 'CRITICAL',
    title: 'V8 Heap Memory Threshold Exceeded (>98%)',
    service: 'checkout-service',
    metric: 'heap_used_bytes: 1.84GB / 2.0GB',
    timeAgo: '2m ago',
    status: 'ACTIVE',
  },
  {
    id: 'alt-db',
    experimentId: 'exp-db',
    severity: 'HIGH',
    title: 'Database Client Pool Saturation >95%',
    service: 'postgresql',
    metric: 'active_connections: 96 / 100',
    timeAgo: '8m ago',
    status: 'INVESTIGATING',
  },
  {
    id: 'alt-security',
    experimentId: 'exp-security',
    severity: 'HIGH',
    title: 'Adversarial SQLi Signature on Edge Ingress',
    service: 'api-gateway',
    metric: 'waf_blocked_rate: 420 req/s',
    timeAgo: '11m ago',
    status: 'INVESTIGATING',
  },
  {
    id: 'alt-disk',
    experimentId: 'exp-disk',
    severity: 'MEDIUM',
    title: 'Disk Volume /var/log Utilization 92%',
    service: 'logging-service',
    metric: 'nvme0n1p1: 92% capacity',
    timeAgo: '14m ago',
    status: 'INVESTIGATING',
  },
  {
    id: 'alt-rag',
    experimentId: 'exp-rag',
    severity: 'LOW',
    title: 'Low Cosine Similarity on Gateway Anomaly (0.24)',
    service: 'user-service',
    metric: 'rag_vector_dist: 0.241',
    timeAgo: '21m ago',
    status: 'INVESTIGATING',
  },
];

export const ActiveAlertStream: React.FC<ActiveAlertStreamProps> = ({
  currentExperimentId,
  onSelectAlert,
  onOpenDossier,
}) => {
  const getSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEE2E2] dark:bg-rose-950/60 text-[#DC2626] dark:text-rose-400 border border-[#FECACA] dark:border-rose-800/40 tracking-wide font-mono">
            CRIT
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 border border-[#FDE68A] dark:border-amber-800/40 tracking-wide font-mono">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF9C3] dark:bg-yellow-950/60 text-[#CA8A04] dark:text-yellow-400 border border-[#FEF08A] dark:border-yellow-800/40 tracking-wide font-mono">
            MED
          </span>
        );
      case 'LOW':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400 border border-[#BAE6FD] dark:border-sky-800/40 tracking-wide font-mono">
            LOW
          </span>
        );
    }
  };

  const getSeverityIcon = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] dark:text-rose-400 fill-[#FEE2E2] dark:fill-rose-950/60" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-400" />;
      case 'MEDIUM':
        return <AlertCircle className="w-3.5 h-3.5 text-[#CA8A04] dark:text-yellow-400" />;
      case 'LOW':
        return <Info className="w-3.5 h-3.5 text-[#0284C7] dark:text-sky-400" />;
    }
  };

  return (
    <div
      id="active-alert-stream-card"
      className="bg-white dark:bg-[#090C14] border border-[#E2E8F0] dark:border-white/[0.08] rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#0F172A] dark:bg-white/[0.08] text-white text-[10px] font-mono font-bold">
            3A
          </span>
          <div>
            <h2 className="text-[11.5px] font-bold text-[#0F172A] dark:text-white tracking-wider uppercase font-sans">
              TELEMETRY ALERTS
            </h2>
            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 font-medium leading-none mt-0.5">
              Click alert to triage scenario
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] dark:text-emerald-400 bg-[#DCFCE7] dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-[#BBF7D0] dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-emerald-400 animate-pulse" />
            Live eBPF
          </span>
        </div>
      </div>

      {/* Alert List Items */}
      <div className="flex flex-col gap-1.5 my-1">
        {telemetryAlertsList.map((alert) => {
          const isSelected = alert.experimentId === currentExperimentId;

          return (
            <button
              type="button"
              key={alert.id}
              id={`alert-row-${alert.id}`}
              onClick={() => onSelectAlert(alert.experimentId)}
              className={`w-full text-left flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group ${
                isSelected
                  ? 'border-[#16A34A] dark:border-emerald-500 bg-[#F0FDF4] dark:bg-emerald-950/30 shadow-[0_0_0_1px_#16A34A] dark:shadow-[0_0_0_1px_#10B981]'
                  : 'border-[#E2E8F0] dark:border-white/[0.08] bg-white dark:bg-[#0E121B] hover:border-[#94A3B8] dark:hover:border-white/[0.18] hover:bg-[#F8FAFC] dark:hover:bg-[#141A26]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex-shrink-0">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-shrink-0">{getSeverityBadge(alert.severity)}</div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold leading-tight truncate ${isSelected ? 'text-[#14532D] dark:text-emerald-300' : 'text-[#0F172A] dark:text-zinc-200'}`}>
                      {alert.title}
                    </span>
                    {isSelected && (
                      <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-[#16A34A] dark:bg-emerald-500 text-white flex-shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9.5px] font-mono text-[#64748B] dark:text-zinc-400 font-medium leading-none">
                      {alert.service}
                    </span>
                    <span className="text-[9px] font-mono text-[#94A3B8] dark:text-zinc-500 leading-none">
                      · {alert.metric}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span className="text-[10px] text-[#64748B] dark:text-zinc-400 font-mono whitespace-nowrap">
                  {alert.timeAgo}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isSelected
                      ? 'text-[#16A34A] dark:text-emerald-400 translate-x-0.5'
                      : 'text-[#94A3B8] dark:text-zinc-500 group-hover:text-[#0F172A] dark:group-hover:text-white'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-1 border-t border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between text-[10px] text-[#64748B] dark:text-zinc-400">
        <span className="font-mono">5 active feeds connected</span>
        <button
          type="button"
          onClick={onOpenDossier}
          className="text-[#0F172A] dark:text-zinc-200 hover:text-[#16A34A] dark:hover:text-emerald-400 font-semibold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
        >
          <span>Open Full Stream</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

