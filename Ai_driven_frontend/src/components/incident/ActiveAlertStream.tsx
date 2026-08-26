import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Activity,
} from 'lucide-react';
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

  const handleClearAlerts = async () => {
    try {
      setIsRefreshing(true);
      await ApiService.clearAlerts();
      setAlerts([]);
      setSelectedAlertId(null);
      onSelectAlert('nominal', undefined, 'NOMINAL');
    } catch (err) {
      console.debug('Failed to clear alerts from DB:', err);
      setAlerts([]);
      setSelectedAlertId(null);
      onSelectAlert('nominal', undefined, 'NOMINAL');
    } finally {
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
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 tracking-wider font-mono uppercase">
            CRIT
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 tracking-wider font-mono uppercase">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-yellow-100 dark:bg-yellow-950/70 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/40 tracking-wider font-mono uppercase">
            MED
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 tracking-wider font-mono uppercase">
            LOW
          </span>
        );
    }
  };

  const getSeverityIcon = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
      case 'MEDIUM':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />;
      case 'LOW':
      default:
        return <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'FIRING').toUpperCase();
    if (s === 'RESOLVED' || s === 'CLOSED' || s === 'NOMINAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 flex-shrink-0">
          CLOSED
        </span>
      );
    }
    if (s === 'INVESTIGATING' || s === 'TRIAGING') {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          INVESTIGATING
        </span>
      );
    }
    if (s === 'ACTIVE' || s === 'FIRING' || s === 'OPEN') {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-rose-600 text-white shadow-2xs flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          FIRING
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex-shrink-0">
        {s}
      </span>
    );
  };

  return (
    <div
      id="active-alert-stream-card"
      className="bg-white dark:bg-[#090C14] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors duration-300 min-h-[300px] h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-[#0F172A] dark:bg-white/[0.08] text-white text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
            3A
          </span>
          <div className="min-w-0">
            <h2 className="text-[12px] font-bold text-[#0F172A] dark:text-white tracking-wider uppercase truncate">
              TELEMETRY ALERTS
            </h2>
            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 font-medium leading-tight truncate mt-0.5">
              Live database stream from Prometheus & Webhooks
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {alerts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAlerts}
              title="Clear all alerts from database"
              className="px-2 py-1 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
            >
              <Trash2 className="w-3 h-3" />
              <span className="font-mono text-[9.5px] font-semibold hidden sm:inline">Clear</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchDynamicAlerts}
            title="Refresh alerts from database"
            className="p-1 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live DB Feed
          </span>
        </div>
      </div>

      {/* Alert List Container */}
      <div className="flex flex-col gap-2 my-1 flex-1 justify-center overflow-y-auto max-h-[220px] pr-0.5">
        {isLoading ? (
          <div className="flex flex-col gap-2 w-full">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0E121B]"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full skeleton-shimmer flex-shrink-0" />
                  <div className="w-10 h-4 rounded skeleton-shimmer flex-shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-3 rounded skeleton-shimmer" />
                      <div className="w-12 h-3 rounded skeleton-shimmer" />
                    </div>
                    <div className="w-24 h-2 rounded skeleton-shimmer" />
                  </div>
                </div>
                <div className="w-10 h-3 rounded skeleton-shimmer ml-2 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-5 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10">
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
            const isSelected = alert.id === selectedAlertId;
            const isCrit = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';

            return (
              <button
                type="button"
                key={alert.id}
                id={`alert-row-${alert.id}`}
                onClick={() => {
                  setSelectedAlertId(alert.id);
                  onSelectAlert(alert.experimentId, alert.incident_id || alert.id, alert.status);
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer group flex flex-col gap-1.5 relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
                    : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0E121B] hover:border-slate-300 dark:hover:border-white/[0.18] hover:bg-slate-50 dark:hover:bg-[#141A26] shadow-2xs'
                }`}
              >
                {/* Left Severity Accent Stripe */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                    isCrit
                      ? 'bg-rose-500'
                      : isHigh
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                />

                {/* Top Row: Severity + Title + Status Badge + Timestamp */}
                <div className="flex items-center justify-between gap-2 pl-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {getSeverityIcon(alert.severity)}
                    {getSeverityBadge(alert.severity)}
                    <span
                      title={alert.title}
                      className={`text-[11.5px] font-bold leading-tight truncate ${
                        isSelected
                          ? 'text-emerald-950 dark:text-emerald-200'
                          : 'text-slate-900 dark:text-zinc-100'
                      }`}
                    >
                      {alert.title}
                    </span>
                    {getStatusBadge(alert.status)}
                  </div>

                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap flex-shrink-0">
                    {alert.timeAgo}
                  </span>
                </div>

                {/* Bottom Row: Service Chip + Metric Detail + Chevron */}
                <div className="flex items-center justify-between gap-2 pl-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[9.5px] font-medium truncate flex-shrink-0">
                      {alert.service}
                    </span>
                    <span
                      title={alert.metric}
                      className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400 truncate leading-none"
                    >
                      {alert.metric}
                    </span>
                  </div>

                  <ChevronRight
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                      isSelected
                        ? 'text-emerald-600 dark:text-emerald-400 translate-x-0.5'
                        : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                    }`}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-auto border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[10.5px] text-slate-500 dark:text-zinc-400">
        <span className={`font-mono ${alerts.length === 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
          {alerts.length} active alerts in DB {alerts.length === 0 ? '· 100% Nominal' : ''}
        </span>
        <button
          type="button"
          onClick={onOpenDossier}
          className="text-slate-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
        >
          <span>Open Full Stream</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

