import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Shield,
  Key,
  RefreshCw,
  UserCheck,
  Activity,
  Layers,
  Sparkles,
  LogOut,
  ExternalLink,
  Flame,
  Radio,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickRailProps {
  onToggleTheme?: () => void;
  isDark?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const QuickRail: React.FC<QuickRailProps> = ({
  onToggleTheme,
  isDark = false,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <motion.aside
      id="quick-rail"
      animate={{ width: isExpanded ? 240 : 68 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="flex-shrink-0 h-screen bg-white dark:bg-[#07090E] border-r border-[#E5E8E5] dark:border-white/[0.08] flex flex-col justify-between py-3.5 px-2 select-none z-30 relative transition-colors duration-300 shadow-sm"
      aria-label="Navigation rail"
    >
      {/* Top section: Header & Collapse Toggle */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Header Bar */}
        <div className={`flex items-center ${isExpanded ? 'justify-between px-1' : 'justify-center'} w-full`}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] dark:bg-emerald-950/40 border border-[#DCFCE7] dark:border-emerald-800/40 flex items-center justify-center flex-shrink-0">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-[1.5px] bg-[#16A34A] dark:bg-emerald-400" />
                  <div className="w-1.5 h-1.5 rounded-[1.5px] bg-[#22C55E] dark:bg-emerald-500" />
                  <div className="w-1.5 h-1.5 rounded-[1.5px] bg-[#4ADE80] dark:bg-emerald-300" />
                  <div className="w-1.5 h-1.5 rounded-[1.5px] bg-[#15803D] dark:bg-emerald-600" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-[#111312] dark:text-white tracking-wider uppercase leading-none">
                  AURORA
                </span>
                <span className="text-[9px] text-[#606763] dark:text-zinc-400 font-medium leading-tight">
                  Incident Engine
                </span>
              </div>
            </motion.div>
          )}

          {/* Collapse/Expand button */}
          <button
            id="collapse-sidebar-btn"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isExpanded ? 'Collapse sidebar (Compact)' : 'Expand sidebar'}
            className="w-8 h-8 flex items-center justify-center text-[#606763] dark:text-zinc-400 hover:text-[#111312] dark:hover:text-white hover:bg-[#F7F8F7] dark:hover:bg-white/[0.06] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#E5E8E5] dark:hover:border-white/[0.08]"
          >
            {isExpanded ? (
              <ChevronsLeft className="w-4 h-4" />
            ) : (
              <ChevronsRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Quick Links (Expanded view) */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-1 w-full pt-1 border-t border-[#F0F2F0] dark:border-white/[0.06]"
          >
            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#929894] dark:text-zinc-500">
              Navigation
            </div>
            <a
              href="#topology-card"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/30 text-[#15803D] dark:text-emerald-400 text-[11px] font-semibold border border-[#DCFCE7] dark:border-emerald-800/30 shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Service Mesh</span>
            </a>
            <a
              href="#chaos-lab-card"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[#606763] dark:text-zinc-400 hover:text-[#111312] dark:hover:text-white hover:bg-[#F7F8F7] dark:hover:bg-white/[0.04] text-[11px] font-medium transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Chaos Lab</span>
            </a>
            <a
              href="#active-alert-stream-card"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[#606763] dark:text-zinc-400 hover:text-[#111312] dark:hover:text-white hover:bg-[#F7F8F7] dark:hover:bg-white/[0.04] text-[11px] font-medium transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <span>eBPF Telemetry</span>
            </a>
            <a
              href="#pipeline-stepper-card"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[#606763] dark:text-zinc-400 hover:text-[#111312] dark:hover:text-white hover:bg-[#F7F8F7] dark:hover:bg-white/[0.04] text-[11px] font-medium transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>AI Remediation</span>
            </a>
          </motion.div>
        )}
      </div>

      {/* Middle section: Health Status Indicator & Theme */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* System Status Pill / Widget */}
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/40 rounded-2xl p-2.5 flex flex-col gap-1 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] dark:bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-[#15803D] dark:text-emerald-400 uppercase tracking-wider">
                  HEALTHY
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#15803D] dark:text-emerald-400 font-semibold bg-[#DCFCE7] dark:bg-emerald-900/50 px-1 rounded">
                99.99%
              </span>
            </div>
            <span className="text-[9.5px] text-[#606763] dark:text-zinc-400 leading-tight">
              All 6 Microservices Operational
            </span>
          </motion.div>
        ) : (
          <div
            id="system-status-indicator"
            className="flex flex-col items-center justify-center py-2.5 px-1 bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/40 rounded-2xl text-center w-[54px] cursor-default transition-all hover:shadow-xs"
            title="All Systems Operational · 99.99% SLO"
          >
            <span className="w-2 h-2 rounded-full bg-[#22C55E] dark:bg-emerald-400 mb-1.5 animate-pulse inline-block" />
            <span className="text-[9px] font-bold text-[#15803D] dark:text-emerald-400 uppercase tracking-wider leading-tight">
              HEALTHY
            </span>
            <span className="text-[7.5px] font-medium text-[#606763] dark:text-zinc-400 leading-tight text-center mt-1 px-0.5">
              All Systems<br />Operational
            </span>
          </div>
        )}

        {/* Tactile Theme Toggle Switch */}
        {isExpanded ? (
          <div className="w-full bg-[#F0F2F0] dark:bg-[#12151E] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#606763] dark:text-zinc-400 pl-2">
              Appearance
            </span>
            <button
              id="theme-toggle-btn-expanded"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-black border border-[#E5E8E5] dark:border-white/[0.1] shadow-2xs cursor-pointer"
            >
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  !isDark
                    ? 'bg-amber-50 text-amber-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Light</span>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  isDark
                    ? 'bg-zinc-800 text-white shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Moon className="w-3 h-3 text-indigo-400" />
                <span>OLED</span>
              </div>
            </button>
          </div>
        ) : (
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title={isDark ? 'Switch to Light theme' : 'Switch to OLED Dark theme'}
            className="flex items-center gap-1.5 p-1 rounded-full bg-[#F0F2F0] dark:bg-[#12151E] border border-[#E5E8E5] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.2] transition-all cursor-pointer relative"
          >
            <div
              className={`p-1 rounded-full transition-all duration-300 ${
                !isDark
                  ? 'bg-white shadow-xs text-[#F59E0B] scale-105'
                  : 'text-[#929894] dark:text-zinc-500'
              }`}
            >
              <Sun className="w-3.5 h-3.5 transition-transform duration-300" />
            </div>
            <div
              className={`p-1 rounded-full transition-all duration-300 ${
                isDark
                  ? 'bg-black text-indigo-400 shadow-xs border border-white/[0.1] scale-105'
                  : 'text-[#929894] dark:text-zinc-500'
              }`}
            >
              <Moon className="w-3.5 h-3.5 transition-transform duration-300" />
            </div>
          </button>
        )}
      </div>

      {/* Bottom section: User Profile badge & Expandable Popover */}
      <div className="flex flex-col items-center gap-2.5 w-full relative" ref={profileRef}>
        {/* User Profile trigger card/button */}
        {isExpanded ? (
          <button
            id="user-profile-badge-trigger-expanded"
            onClick={() => setIsProfileExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-2xl bg-[#FAFAFA] dark:bg-[#0D1017] border border-[#E5E8E5] dark:border-white/[0.08] hover:border-emerald-500/50 hover:bg-[#F0FDF4]/30 dark:hover:bg-emerald-950/20 transition-all cursor-pointer text-left group shadow-2xs"
            aria-expanded={isProfileExpanded}
            aria-haspopup="true"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full border-2 border-[#22C55E] p-0.5 overflow-hidden flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Admin User"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#22C55E] ring-1 ring-white dark:ring-black" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-[#111312] dark:text-white leading-tight truncate">
                  Admin User
                </span>
                <span className="text-[9px] text-[#929894] dark:text-zinc-400 leading-tight truncate">
                  SRE Superuser
                </span>
              </div>
            </div>
            <div className="w-5 h-5 rounded-md bg-white dark:bg-[#161B26] border border-[#E5E8E5] dark:border-white/[0.08] flex items-center justify-center text-[#606763] dark:text-zinc-400 group-hover:text-emerald-600 transition-colors">
              <Shield className="w-3 h-3" />
            </div>
          </button>
        ) : (
          <button
            id="user-profile-badge-trigger"
            onClick={() => setIsProfileExpanded((prev) => !prev)}
            className="group flex flex-col items-center cursor-pointer focus:outline-none w-full"
            aria-expanded={isProfileExpanded}
            aria-haspopup="true"
            title="Admin SRE Operator Profile"
          >
            <div className="relative w-9 h-9 rounded-full border-2 border-[#22C55E] p-0.5 overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#F0F2F0] dark:bg-zinc-800">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Admin User"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-white dark:ring-[#07090E]" />
            </div>
            <div className="flex flex-col items-center mt-1 w-full px-0.5">
              <span className="text-[9.5px] font-bold text-[#111312] dark:text-zinc-200 leading-tight text-center truncate max-w-[60px]">
                Admin
              </span>
              <span className="text-[8px] text-[#929894] dark:text-zinc-400 leading-tight text-center truncate max-w-[60px]">
                SRE Lead
              </span>
            </div>
          </button>
        )}

        {/* Dynamic Expandable Profile Popover (High-Fidelity Modal / Popover) */}
        <AnimatePresence>
          {isProfileExpanded && (
            <motion.div
              id="expanded-profile-popover"
              initial={{ opacity: 0, scale: 0.94, x: isExpanded ? 0 : 12, y: isExpanded ? -8 : 0 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, x: isExpanded ? 0 : 12, y: isExpanded ? -8 : 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 340 }}
              className={`absolute ${
                isExpanded ? 'left-0 bottom-[60px] w-full' : 'left-[74px] bottom-1 w-[290px]'
              } bg-white dark:bg-[#0C0F17] border border-[#E5E8E5] dark:border-white/[0.1] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15),0_10px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(16,185,129,0.05)] z-50 flex flex-col gap-3.5 backdrop-blur-xl select-text`}
            >
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#F0F2F0] dark:border-white/[0.08]">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#E5E8E5] dark:border-white/[0.1] bg-[#F0F2F0] dark:bg-zinc-800 flex-shrink-0 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Admin User"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#22C55E] ring-2 ring-white dark:ring-[#0C0F17]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-[#111312] dark:text-white leading-tight truncate">
                    Admin SRE Operator
                  </span>
                  <span className="text-[10px] text-[#606763] dark:text-zinc-400 leading-none mt-0.5 truncate font-mono">
                    p.venkatsai333@gmail.com
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="px-1.5 py-0.5 bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 text-[9.5px] font-bold rounded-md flex items-center gap-0.5 border border-[#BBF7D0] dark:border-emerald-800/40">
                      <Shield className="w-2.5 h-2.5" />
                      Superuser
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-[9.5px] font-semibold rounded-md border border-blue-200 dark:border-blue-800/30 font-mono">
                      Zone: us-east1
                    </span>
                  </div>
                </div>
              </div>

              {/* Duty Details & Shift Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10.5px] bg-[#FAFAFA] dark:bg-[#121622] p-2.5 rounded-xl border border-[#F0F2F0] dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[#606763] dark:text-zinc-400">
                    <UserCheck className="w-3.5 h-3.5 text-[#15803D] dark:text-emerald-400" />
                    <span>Active Shift</span>
                  </div>
                  <span className="font-bold text-[#111312] dark:text-zinc-200 font-mono">08:00 - 16:00 UTC</span>
                </div>

                <div className="flex items-center justify-between text-[10.5px] bg-[#FAFAFA] dark:bg-[#121622] p-2.5 rounded-xl border border-[#F0F2F0] dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[#606763] dark:text-zinc-400">
                    <Key className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                    <span>GCP Credentials</span>
                  </div>
                  <span className="font-semibold text-[#15803D] dark:text-emerald-400 bg-[#ECFDF3] dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-[#DCFCE7] dark:border-emerald-800/40 text-[9px] font-mono">
                    Active (mTLS)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-[#F0F2F0] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsProfileExpanded(false)}
                  className="w-full py-2 bg-white dark:bg-[#161B28] hover:bg-[#F7F8F7] dark:hover:bg-[#1F2536] border border-[#E5E8E5] dark:border-white/[0.08] text-[#111312] dark:text-zinc-200 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3 text-[#606763] dark:text-zinc-400" />
                  <span>Request Shift Handoff</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version label */}
        <span className="text-[9.5px] text-[#929894] dark:text-zinc-500 font-mono tracking-tight">
          v1.0.0
        </span>
      </div>
    </motion.aside>
  );
};

