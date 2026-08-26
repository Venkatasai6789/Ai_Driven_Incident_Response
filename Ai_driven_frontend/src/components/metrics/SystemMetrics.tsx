import React, { useState } from 'react';
import { ChevronDown, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { SLOMetricsData } from '../../types';

interface SystemMetricsProps {
  sloMetrics?: SLOMetricsData | null;
  isLoading?: boolean;
  onRangeChange?: (range: string) => void;
  currentRange?: string;
}

const fallbackHistory = [
  { time: '10:30', mttr: 1.8, accuracy: 96.2, volume: 8 },
  { time: '10:40', mttr: 1.6, accuracy: 96.5, volume: 12 },
  { time: '10:50', mttr: 2.1, accuracy: 95.8, volume: 18 },
  { time: '11:00', mttr: 1.4, accuracy: 97.1, volume: 24 },
  { time: '11:10', mttr: 1.3, accuracy: 97.4, volume: 15 },
  { time: '11:20', mttr: 1.5, accuracy: 96.9, volume: 22 },
  { time: '11:30', mttr: 1.4, accuracy: 98.4, volume: 24 },
];

export const SystemMetrics: React.FC<SystemMetricsProps> = ({
  sloMetrics,
  isLoading = false,
  onRangeChange,
  currentRange = '1h',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const rangeLabels: Record<string, string> = {
    '1h': 'Last 1 Hour',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
  };

  const currentLabel = rangeLabels[currentRange] || 'Last 1 Hour';

  const chartData = (sloMetrics?.timeseries && sloMetrics.timeseries.length > 0)
    ? sloMetrics.timeseries
    : fallbackHistory;

  const mttrAvg = sloMetrics?.mttr_avg_seconds ?? 1.4;
  const autoResolve = sloMetrics?.auto_resolve_pct ?? 98.4;
  const incidentsCount = sloMetrics?.incidents_resolved_count ?? 24;
  const triagePrecision = sloMetrics?.triage_precision_pct ?? 96.7;

  return (
    <div
      id="system-metrics-card"
      className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] flex flex-col justify-between flex-1 min-h-[220px] transition-colors duration-300 relative"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-[#0F172A] dark:bg-white/[0.08] text-white text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
            6
          </span>
          <div>
            <h2 className="text-[12px] font-bold text-[#0F172A] dark:text-white tracking-wider uppercase truncate">
              SLO & PLATFORM MTTR METRICS
            </h2>
            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 font-medium leading-tight truncate mt-0.5">
              Automated incident resolution velocity & precision analytics
            </p>
          </div>
        </div>

        {/* Header Right: Live Badge + Time Range Selector Dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            99.99% SLO Availability
          </span>

          <div className="relative">
            <button
              id="time-range-selector-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#111312] dark:text-zinc-200 bg-white dark:bg-[#121622] border border-[#E5E8E5] dark:border-white/[0.08] rounded-lg hover:bg-[#F7F8F7] dark:hover:bg-[#1B2130] transition-colors cursor-pointer shadow-2xs"
            >
              <span>{currentLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#606763] dark:text-zinc-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#0E121B] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-lg z-30 py-1 text-[11px]">
                {(['1h', '24h', '7d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      if (onRangeChange) onRangeChange(r);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 transition-colors ${
                      currentRange === r
                        ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {rangeLabels[r]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
        {isLoading ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#FAFAFA] dark:bg-[#0E121B] border border-[#F0F2F0] dark:border-white/[0.08] rounded-xl p-3 flex flex-col gap-2"
            >
              <div className="w-14 h-2.5 rounded skeleton-shimmer" />
              <div className="w-16 h-5 rounded skeleton-shimmer" />
              <div className="w-20 h-2.5 rounded skeleton-shimmer" />
            </div>
          ))
        ) : (
          <>
            {/* Metric 1: MTTR */}
            <div className="bg-[#FAFAFA] dark:bg-[#0E121B] border border-[#F0F2F0] dark:border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-bold uppercase tracking-wider">
                MTTR Target
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#111312] dark:text-white font-mono leading-tight">{mttrAvg}s</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#15803D] dark:text-emerald-400 font-bold mt-1 font-mono">
                <ArrowDownRight className="w-3 h-3 text-[#15803D] dark:text-emerald-400" />
                <span>-32% vs 24h</span>
              </div>
            </div>

            {/* Metric 2: Success Rate */}
            <div className="bg-[#FAFAFA] dark:bg-[#0E121B] border border-[#F0F2F0] dark:border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-bold uppercase tracking-wider">
                Auto-Resolve
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#111312] dark:text-white font-mono leading-tight">{autoResolve}%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#15803D] dark:text-emerald-400 font-bold mt-1 font-mono">
                <ArrowUpRight className="w-3 h-3 text-[#15803D] dark:text-emerald-400" />
                <span>+4.2% vs 24h</span>
              </div>
            </div>

            {/* Metric 3: Incidents Resolved */}
            <div className="bg-[#FAFAFA] dark:bg-[#0E121B] border border-[#F0F2F0] dark:border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-bold uppercase tracking-wider">
                Incidents Resolved
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#111312] dark:text-white font-mono leading-tight">{incidentsCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#15803D] dark:text-emerald-400 font-bold mt-1 font-mono">
                <ArrowUpRight className="w-3 h-3 text-[#15803D] dark:text-emerald-400" />
                <span>+14 vs 24h</span>
              </div>
            </div>

            {/* Metric 4: Triage Accuracy */}
            <div className="bg-[#FAFAFA] dark:bg-[#0E121B] border border-[#F0F2F0] dark:border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-[#606763] dark:text-zinc-400 font-bold uppercase tracking-wider">
                Triage Precision
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#111312] dark:text-white font-mono leading-tight">{triagePrecision}%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#15803D] dark:text-emerald-400 font-bold mt-1 font-mono">
                <ArrowUpRight className="w-3 h-3 text-[#15803D] dark:text-emerald-400" />
                <span>+3.1% vs 24h</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Real-time MTTR Resolution Velocity Sparkline */}
      <div className="h-[135px] w-full bg-[#FAFAFA] dark:bg-[#0E121B] rounded-xl border border-[#F0F2F0] dark:border-white/[0.08] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between px-1 text-[10px] text-[#606763] dark:text-zinc-400 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111312] dark:text-white">MTTR Resolution Curve (Seconds)</span>
            <span className="text-[9px] text-slate-400 font-mono">Continuous Telemetry Ingest</span>
          </div>
          <span className="text-[#15803D] dark:text-emerald-400 font-bold font-mono">● p99 {mttrAvg}s Nominal</span>
        </div>

        {isLoading ? (
          <div className="h-[95px] w-full rounded-lg skeleton-shimmer" />
        ) : (
          <div className="h-[95px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="mttrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#929894"
                  fontSize={9.5}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#929894"
                  fontSize={9.5}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 3]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#111312] dark:bg-black text-white px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono shadow-md border border-zinc-800">
                          <span>{payload[0].payload.time}: </span>
                          <strong className="text-[#4ADE80]">{payload[0].value}s MTTR</strong>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mttr"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#mttrGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};


