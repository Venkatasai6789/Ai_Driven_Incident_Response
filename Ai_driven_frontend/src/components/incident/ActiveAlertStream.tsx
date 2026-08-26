import React, { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle, AlertCircle, Info, Radio, Activity, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { IncidentSeverity } from '../../types';
import { ApiService } from '../../services/api';

export interface TelemetryAlertItem {
  id: string;
  incident_id?: string;
  experimentId: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  metric: string;
  timeAgo: string;
  status: 'ACTIVE' | 'FIRING' | 'RESOLVING' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  source?: string;
}

interface ActiveAlertStreamProps {
  currentExperimentId: string;
  onSelectAlert: (experimentId: string, incidentId?: string, alertStatus?: string) => void;
  onOpenDossier?: () => void;
}

export const ActiveAlertStream: React.FC<ActiveAlertStreamProps> = ({
  currentExperimentId,
  onSelectAlert,
  onOpenDossier,
}) => {
  const [alerts, setAlerts] = useState<TelemetryAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const fetchDynamicAlerts = async () => {
    try {
      setIsRefreshing(true);
      const data = await ApiService.getAlerts();
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (err) {
      console.debug('Dynamic alerts fetch notice:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDynamicAlerts();
    const interval = setInterval(fetchDynamicAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

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
      default:
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
      default:
        return <Info className="w-3.5 h-3.5 text-[#0284C7] dark:text-sky-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'FIRING').toUpperCase();
    if (s === 'RESOLVED' || s === 'CLOSED' || s === 'NOMINAL') {
      return (
        <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 flex-shrink-0">
          CLOSED
        </span>
      );
    }
    if (s === 'INVESTIGATING' || s === 'TRIAGING') {
      return (
        <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-sky-600 text-white flex-shrink-0">
          INVESTIGATING
        </span>
      );
    }
    if (s === 'ACTIVE' || s === 'FIRING' || s === 'OPEN') {
      return (
        <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-rose-600 text-white flex-shrink-0">
          FIRING
        </span>
      );
    }
    return (
      <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex-shrink-0">
        {s}
      </span>
    );
  };

  return (
    <div
      id="active-alert-stream-card"
      className="bg-white dark:bg-[#090C14] border border-[#E2E8F0] dark:border-white/[0.08] rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-colors duration-300 min-h-[300px]"
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
              Live database stream from Prometheus & Webhooks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fetchDynamicAlerts}
            title="Refresh alerts from database"
            className="p-1 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] dark:text-emerald-400 bg-[#DCFCE7] dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-[#BBF7D0] dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-emerald-400 animate-pulse" />
            Live DB Feed
          </span>
        </div>
      </div>

      {/* Alert List Items */}
      <div className="flex flex-col gap-1.5 my-1 flex-1 justify-center">
        {isLoading ? (
          <div className="py-8 text-center text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
            Loading alerts from PostgreSQL...
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <span className="text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300">
              No Active Firing Alerts
            </span>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-mono mt-0.5 max-w-[260px]">
              PostgreSQL alerts table is nominal. Inbound webhook alerts will appear here in real time.
            </p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => {
            const isSelected = alert.id === selectedAlertId || alert.experimentId === currentExperimentId;

            return (
              <button
                type="button"
                key={alert.id}
                id={`alert-row-${alert.id}`}
                onClick={() => {
                  setSelectedAlertId(alert.id);
                  onSelectAlert(alert.experimentId, alert.incident_id || alert.id, alert.status);
                }}
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
                      {getStatusBadge(alert.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9.5px] font-mono text-[#64748B] dark:text-zinc-400 font-medium leading-none">
                        {alert.service}
                      </span>
                      <span className="text-[9px] font-mono text-[#94A3B8] dark:text-zinc-500 leading-none truncate max-w-[140px]">
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
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-1 border-t border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between text-[10px] text-[#64748B] dark:text-zinc-400">
        <span className="font-mono">{alerts.length} alerts loaded from database</span>
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
