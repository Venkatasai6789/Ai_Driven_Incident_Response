import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Database,
  Cpu,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Flame,
  CheckCircle,
  AlertTriangle,
  Zap,
  Server,
  ShieldCheck,
  Send,
  X,
  Bell,
} from 'lucide-react';
import type { SystemTopologyProps } from '../../types';

interface MeshNode {
  id: string;
  name: string;
  shortName: string;
  iconType: 'gateway' | 'service' | 'database' | 'webhook' | 'ai' | 'guardrail' | 'telegram';
  status: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'ACTIVE';
  latency: number;
  protocol: string;
  throughput: string;
  baseResource: string;
  baseUptime: string;
  errorRate: string;
  namespace: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SystemTopology: React.FC<SystemTopologyProps> = ({
  activeIncident,
  selectedService,
  onSelectService,
  currentStep = 0,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('checkout-service');
  const [viewMode, setViewMode] = useState<'ecosystem' | 'blast-radius' | 'sre-pipeline'>('ecosystem');

  const isNominal = !activeIncident || activeIncident.status === 'RESOLVED';
  const incidentService = !isNominal ? activeIncident?.impactedService || 'checkout-service' : null;

  // 7 Application Architecture Nodes
  const nodes: MeshNode[] = [
    {
      id: 'api-gateway',
      name: 'API Gateway (Envoy)',
      shortName: 'api-gateway',
      iconType: 'gateway',
      status: 'NOMINAL',
      latency: 4,
      protocol: 'HTTPS / TLS 1.3',
      throughput: '12,420 rps',
      baseResource: '18% CPU',
      baseUptime: '99.99%',
      errorRate: '0.00%',
      namespace: 'ingress',
      x: 15,
      y: 20,
      width: 210,
      height: 72,
    },
    {
      id: 'checkout-service',
      name: 'Checkout Service (Node.js)',
      shortName: 'checkout-service',
      iconType: 'service',
      status: isNominal
        ? 'NOMINAL'
        : incidentService === 'checkout-service'
        ? activeIncident?.severity === 'CRITICAL'
          ? 'CRITICAL'
          : 'DEGRADED'
        : 'NOMINAL',
      latency: isNominal ? 18 : 2840,
      protocol: 'gRPC / HTTP 2',
      throughput: isNominal ? '3,210 rps' : '140 rps',
      baseResource: isNominal ? '42% CPU' : '98% Memory',
      baseUptime: isNominal ? '99.95%' : '84.2%',
      errorRate: isNominal ? '0.00%' : '38.4%',
      namespace: 'workloads',
      x: 265,
      y: 20,
      width: 210,
      height: 72,
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL DB (Aurora)',
      shortName: 'postgresql-primary',
      iconType: 'database',
      status: isNominal
        ? 'NOMINAL'
        : incidentService === 'postgresql'
        ? 'CRITICAL'
        : incidentService === 'checkout-service'
        ? 'DEGRADED'
        : 'NOMINAL',
      latency: isNominal ? 6 : 142,
      protocol: 'TCP / PgBouncer',
      throughput: '1,850 qps',
      baseResource: isNominal ? '31% CPU' : '94% CPU',
      baseUptime: '99.99%',
      errorRate: isNominal ? '0.00%' : '14.2%',
      namespace: 'database',
      x: 515,
      y: 20,
      width: 210,
      height: 72,
    },
    {
      id: 'alert-webhook',
      name: 'Alert Ingest (Prometheus)',
      shortName: 'alert-webhook',
      iconType: 'webhook',
      status: !isNominal ? 'ACTIVE' : 'NOMINAL',
      latency: 8,
      protocol: 'eBPF / Webhook',
      throughput: '450 evt/s',
      baseResource: '8% CPU',
      baseUptime: '100.0%',
      errorRate: '0.00%',
      namespace: 'telemetry',
      x: 15,
      y: 135,
      width: 160,
      height: 72,
    },
    {
      id: 'rag-ai-agent',
      name: 'Gemini RAG Agent',
      shortName: 'rag-ai-agent',
      iconType: 'ai',
      status: !isNominal ? 'ACTIVE' : 'NOMINAL',
      latency: 38,
      protocol: 'pgvector / Gemini 2.5',
      throughput: 'Vector Search',
      baseResource: '450ms Embed',
      baseUptime: '100.0%',
      errorRate: '0.00%',
      namespace: 'ai-core',
      x: 200,
      y: 135,
      width: 160,
      height: 72,
    },
    {
      id: 'fastapi-dispatcher',
      name: 'Safety Guardrail (AST)',
      shortName: 'fastapi-dispatcher',
      iconType: 'guardrail',
      status: !isNominal ? 'ACTIVE' : 'NOMINAL',
      latency: 12,
      protocol: 'Python AST / Policy',
      throughput: 'Deterministic',
      baseResource: '12% CPU',
      baseUptime: '100.0%',
      errorRate: '0.00%',
      namespace: 'automation',
      x: 385,
      y: 135,
      width: 160,
      height: 72,
    },
    {
      id: 'telegram-notifier',
      name: 'Telegram SRE Commander',
      shortName: 'telegram-notifier',
      iconType: 'telegram',
      status: !isNominal ? 'ACTIVE' : 'NOMINAL',
      latency: 45,
      protocol: 'MTProto / Webhook',
      throughput: '@AuroraSREBot',
      baseResource: 'Instant Push',
      baseUptime: '100.0%',
      errorRate: '0.00%',
      namespace: 'channels',
      x: 570,
      y: 135,
      width: 155,
      height: 72,
    },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (onSelectService) onSelectService(nodeId);
  };

  // Mathematical SVG Connection Points
  const pGwRight = { x: 225, y: 56 };
  const pCheckoutLeft = { x: 265, y: 56 };
  const pCheckoutRight = { x: 475, y: 56 };
  const pDbLeft = { x: 515, y: 56 };
  const pCheckoutBottom = { x: 370, y: 92 };
  const pAlertTop = { x: 95, y: 135 };
  const pAlertRight = { x: 175, y: 171 };
  const pRagLeft = { x: 200, y: 171 };
  const pRagRight = { x: 360, y: 171 };
  const pGuardrailLeft = { x: 385, y: 171 };
  const pGuardrailRight = { x: 545, y: 171 };
  const pTelegramLeft = { x: 570, y: 171 };
  const pGuardrailTop = { x: 465, y: 135 };

  // SVG Paths
  const pathGwToCheckout = `M ${pGwRight.x} ${pGwRight.y} L ${pCheckoutLeft.x} ${pCheckoutLeft.y}`;
  const pathCheckoutToDb = `M ${pCheckoutRight.x} ${pCheckoutRight.y} L ${pDbLeft.x} ${pDbLeft.y}`;
  const pathCheckoutToAlert = `M ${pCheckoutBottom.x} ${pCheckoutBottom.y} C ${pCheckoutBottom.x} 115, ${pAlertTop.x} 110, ${pAlertTop.x} ${pAlertTop.y}`;
  const pathAlertToRag = `M ${pAlertRight.x} ${pAlertRight.y} L ${pRagLeft.x} ${pRagLeft.y}`;
  const pathRagToGuardrail = `M ${pRagRight.x} ${pRagRight.y} L ${pGuardrailLeft.x} ${pGuardrailLeft.y}`;
  const pathGuardrailToTelegram = `M ${pGuardrailRight.x} ${pGuardrailRight.y} L ${pTelegramLeft.x} ${pTelegramLeft.y}`;
  const pathGuardrailToCheckout = `M ${pGuardrailTop.x} ${pGuardrailTop.y} C ${pGuardrailTop.x} 110, ${pCheckoutRight.x - 40} 115, ${pCheckoutRight.x - 40} ${pCheckoutBottom.y}`;

  const renderIcon = (type: string, isCrit: boolean, isAct: boolean) => {
    const iconClass = `w-3.5 h-3.5 ${
      isCrit
        ? 'text-rose-500'
        : isAct
        ? 'text-indigo-500'
        : 'text-emerald-600 dark:text-emerald-400'
    }`;
    switch (type) {
      case 'gateway':
        return <Globe className={iconClass} />;
      case 'service':
        return <Cpu className={iconClass} />;
      case 'database':
        return <Database className={iconClass} />;
      case 'webhook':
        return <Activity className={iconClass} />;
      case 'ai':
        return <Zap className={iconClass} />;
      case 'guardrail':
        return <ShieldCheck className={iconClass} />;
      case 'telegram':
        return <Send className="w-3.5 h-3.5 text-sky-500" />;
      default:
        return <Server className={iconClass} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-sm relative overflow-hidden transition-colors">
      {/* 1. Header with Title, Mode Pill, and Expand Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                Distributed Service Mesh Topology
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                eBPF Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
              mTLS Encrypted · Real-Time Incident Propagation · Telegram Commander
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          {!isNominal ? (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Incident Alert Active</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Mesh Nominal</span>
            </span>
          )}

          {/* Expand Fullscreen Button */}
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Expand Service Mesh Topology"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive SVG Canvas & Modern Card Overlay */}
      <div className="relative w-full h-[225px] bg-[#F8FAFC]/90 dark:bg-[#070A10]/90 rounded-xl border border-slate-200/60 dark:border-white/[0.04] overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col justify-between p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ) : (
          <>
            {/* SVG Dynamic Conduits & Animated Particles */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 740 225"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="laserNominal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#34D399" stopOpacity="1" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="laserCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserAI" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserTelegram" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
                </linearGradient>

                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. Gateway -> Checkout */}
              <path
                d={pathGwToCheckout}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="dark:stroke-zinc-800"
              />
              <path
                d={pathGwToCheckout}
                fill="none"
                stroke={incidentService === 'checkout-service' ? 'url(#laserCritical)' : 'url(#laserNominal)'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className="animate-laser-flow"
                filter="url(#glowEffect)"
              />
              <circle r="3.5" fill={incidentService === 'checkout-service' ? '#EF4444' : '#10B981'}>
                <animateMotion dur="1.2s" repeatCount="indefinite" path={pathGwToCheckout} />
              </circle>
              <circle cx={(pGwRight.x + pCheckoutLeft.x) / 2} cy={pGwRight.y} r="2" fill="#10B981" />

              {/* 2. Checkout -> PostgreSQL */}
              <path
                d={pathCheckoutToDb}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="dark:stroke-zinc-800"
              />
              <path
                d={pathCheckoutToDb}
                fill="none"
                stroke={incidentService === 'postgresql' ? 'url(#laserCritical)' : 'url(#laserNominal)'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className="animate-laser-flow"
                filter="url(#glowEffect)"
              />
              <circle r="3.5" fill={incidentService === 'postgresql' ? '#EF4444' : '#10B981'}>
                <animateMotion dur="1.4s" repeatCount="indefinite" path={pathCheckoutToDb} />
              </circle>
              <circle cx={(pCheckoutRight.x + pDbLeft.x) / 2} cy={pCheckoutRight.y} r="2" fill="#10B981" />

              {/* 3. Incident Telemetry Conduit: Checkout -> Alert Webhook */}
              <path
                d={pathCheckoutToAlert}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="dark:stroke-zinc-800"
              />
              {!isNominal && (
                <>
                  <path
                    d={pathCheckoutToAlert}
                    fill="none"
                    stroke="url(#laserCritical)"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="3.5" fill="#EF4444">
                    <animateMotion dur="0.9s" repeatCount="indefinite" path={pathCheckoutToAlert} />
                  </circle>
                </>
              )}

              {/* 4. Alert Ingest -> Gemini RAG Agent */}
              <path
                d={pathAlertToRag}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                className="dark:stroke-zinc-800"
              />
              <path
                d={pathAlertToRag}
                fill="none"
                stroke={!isNominal ? 'url(#laserAI)' : '#CBD5E1'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <circle r="3.5" fill="#6366F1">
                  <animateMotion dur="0.8s" repeatCount="indefinite" path={pathAlertToRag} />
                </circle>
              )}
              <circle cx={(pAlertRight.x + pRagLeft.x) / 2} cy={pAlertRight.y} r="2" fill="#6366F1" />

              {/* 5. Gemini RAG Agent -> Safety Guardrail */}
              <path
                d={pathRagToGuardrail}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                className="dark:stroke-zinc-800"
              />
              <path
                d={pathRagToGuardrail}
                fill="none"
                stroke={!isNominal ? 'url(#laserAI)' : '#CBD5E1'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <circle r="3.5" fill="#10B981">
                  <animateMotion dur="0.8s" repeatCount="indefinite" path={pathRagToGuardrail} />
                </circle>
              )}
              <circle cx={(pRagRight.x + pGuardrailLeft.x) / 2} cy={pRagRight.y} r="2" fill="#10B981" />

              {/* 6. Safety Guardrail -> Telegram Notifier (@AuroraSREBot) */}
              <path
                d={pathGuardrailToTelegram}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                className="dark:stroke-zinc-800"
              />
              <path
                d={pathGuardrailToTelegram}
                fill="none"
                stroke={!isNominal ? 'url(#laserTelegram)' : '#CBD5E1'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <circle r="4" fill="#0EA5E9">
                  <animateMotion dur="0.7s" repeatCount="indefinite" path={pathGuardrailToTelegram} />
                </circle>
              )}
              <circle cx={(pGuardrailRight.x + pTelegramLeft.x) / 2} cy={pGuardrailRight.y} r="2.5" fill="#0EA5E9" />

              {/* 7. Remediation Feedback Loop: Safety Guardrail -> Checkout Service */}
              {viewMode !== 'blast-radius' && (
                <>
                  <path d={pathGuardrailToCheckout} fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" className="dark:stroke-zinc-800" />
                  {currentStep >= 4 && (
                    <>
                      <path
                        d={pathGuardrailToCheckout}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="animate-laser-flow"
                      />
                      <circle r="3" fill="#10B981">
                        <animateMotion dur="0.9s" repeatCount="indefinite" path={pathGuardrailToCheckout} />
                      </circle>
                    </>
                  )}
                </>
              )}
            </svg>

            {/* DOM Node Cards (Positioned over SVG with Reference Design Aesthetic) */}
            <div className="absolute inset-0 pointer-events-auto">
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isCrit = node.status === 'CRITICAL';
                const isDeg = node.status === 'DEGRADED';
                const isAct = node.status === 'ACTIVE';

                return (
                  <motion.div
                    key={node.id}
                    onClick={() => handleNodeClick(node.id)}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                    }}
                    className={`absolute rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                      isCrit
                        ? 'bg-white dark:bg-[#12080C] border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/40'
                        : isDeg
                        ? 'bg-white dark:bg-[#120D08] border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : isAct && node.id === 'telegram-notifier'
                        ? 'bg-white dark:bg-[#080E14] border-2 border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.35)] ring-2 ring-sky-400/40 animate-pulse'
                        : isAct
                        ? 'bg-white dark:bg-[#0A0D18] border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-2 ring-indigo-400/30'
                        : isSelected
                        ? 'bg-white dark:bg-[#0B0F17] border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
                        : 'bg-white/95 dark:bg-[#0E121B]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.18]'
                    }`}
                  >
                    {/* Top Row: Icon Badge + Node Title + Status Pill */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCrit
                              ? 'bg-rose-100 dark:bg-rose-950/80'
                              : isAct && node.id === 'telegram-notifier'
                              ? 'bg-sky-100 dark:bg-sky-950/80'
                              : isAct
                              ? 'bg-indigo-100 dark:bg-indigo-950/80'
                              : 'bg-emerald-50 dark:bg-emerald-950/60'
                          }`}
                        >
                          {renderIcon(node.iconType, isCrit, isAct)}
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          {node.shortName}
                        </span>
                      </div>

                      {/* Status indicator pill */}
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                          isCrit
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isDeg
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isAct
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {node.latency}ms
                      </span>
                    </div>

                    {/* Bottom Row: Protocol / Runtime Chip + Telemetry Tag */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.06] text-[9px] font-mono">
                      <span className="text-slate-500 dark:text-zinc-400 truncate">
                        {node.protocol}
                      </span>
                      <span
                        className={`font-semibold ${
                          isCrit
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : isAct && node.id === 'telegram-notifier'
                            ? 'text-sky-600 dark:text-sky-400 font-bold animate-pulse'
                            : 'text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {isCrit ? node.errorRate : node.status === 'NOMINAL' ? 'Nominal' : node.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. Bottom Selected Node Telemetry Strip */}
      <div className="mt-2 bg-slate-900 dark:bg-[#070A10] border border-slate-800 dark:border-white/[0.08] text-white rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            {renderIcon(selectedNode.iconType, selectedNode.status === 'CRITICAL', selectedNode.status === 'ACTIVE')}
          </div>
          <div className="truncate">
            <span className="font-bold text-slate-100">{selectedNode.name}</span>
            <span className="text-[10px] text-slate-400 font-mono ml-2">[{selectedNode.namespace}]</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10.5px] font-mono flex-shrink-0">
          <span className="text-slate-400">
            Latency: <b className="text-emerald-400">{selectedNode.latency}ms</b>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Throughput: <b className="text-slate-200">{selectedNode.throughput}</b>
          </span>
          <span className="text-slate-400 hidden md:inline">
            Resource: <b className="text-slate-200">{selectedNode.baseResource}</b>
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
              selectedNode.status === 'CRITICAL'
                ? 'bg-rose-500 text-white'
                : selectedNode.status === 'DEGRADED'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {selectedNode.status}
          </span>
        </div>
      </div>

      {/* 4. High-Craft Simplified Fullscreen Expand Modal */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-xs"
            />

            {/* Modal Canvas Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-5xl h-[80vh] bg-white dark:bg-[#090C14] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Distributed Service Mesh Architecture
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Live eBPF Telemetry · Real-Time Incident Propagation · Telegram Commander Dispatch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">Press ESC to close</span>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Spacious Topology Canvas */}
              <div className="flex-1 relative overflow-hidden bg-[#FAFBFC] dark:bg-[#070A10] p-6 flex items-center justify-center">
                <div className="w-full max-w-4xl h-[420px] relative">
                  {/* Reuse SVG & Conduits scaled up nicely */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 740 230" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="expNominal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#34D399" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="expCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.9" />
                      </linearGradient>
                      <linearGradient id="expAI" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>

                    {/* Conduits */}
                    <path d={pathGwToCheckout} fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-zinc-800" />
                    <path d={pathGwToCheckout} fill="none" stroke={incidentService === 'checkout-service' ? 'url(#expCritical)' : 'url(#expNominal)'} strokeWidth="3" strokeDasharray="6 6" className="animate-laser-flow" />
                    <circle r="4" fill={incidentService === 'checkout-service' ? '#EF4444' : '#10B981'}>
                      <animateMotion dur="1.2s" repeatCount="indefinite" path={pathGwToCheckout} />
                    </circle>

                    <path d={pathCheckoutToDb} fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-zinc-800" />
                    <path d={pathCheckoutToDb} fill="none" stroke={incidentService === 'postgresql' ? 'url(#expCritical)' : 'url(#expNominal)'} strokeWidth="3" strokeDasharray="6 6" className="animate-laser-flow" />
                    <circle r="4" fill={incidentService === 'postgresql' ? '#EF4444' : '#10B981'}>
                      <animateMotion dur="1.4s" repeatCount="indefinite" path={pathCheckoutToDb} />
                    </circle>

                    <path d={pathCheckoutToAlert} fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="4 4" className="dark:stroke-zinc-800" />
                    {!isNominal && (
                      <circle r="3.5" fill="#EF4444">
                        <animateMotion dur="0.9s" repeatCount="indefinite" path={pathCheckoutToAlert} />
                      </circle>
                    )}

                    <path d={pathAlertToRag} fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-zinc-800" />
                    <path d={pathAlertToRag} fill="none" stroke="url(#expAI)" strokeWidth="3" strokeDasharray="6 6" className="animate-laser-flow" />
                    <circle r="4" fill="#6366F1">
                      <animateMotion dur="0.8s" repeatCount="indefinite" path={pathAlertToRag} />
                    </circle>

                    <path d={pathRagToGuardrail} fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-zinc-800" />
                    <path d={pathRagToGuardrail} fill="none" stroke="url(#expAI)" strokeWidth="3" strokeDasharray="6 6" className="animate-laser-flow" />
                    <circle r="4" fill="#10B981">
                      <animateMotion dur="0.8s" repeatCount="indefinite" path={pathRagToGuardrail} />
                    </circle>

                    <path d={pathGuardrailToTelegram} fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-zinc-800" />
                    <path d={pathGuardrailToTelegram} fill="none" stroke="url(#expAI)" strokeWidth="3" strokeDasharray="6 6" className="animate-laser-flow" />
                    <circle r="4" fill="#0EA5E9">
                      <animateMotion dur="0.7s" repeatCount="indefinite" path={pathGuardrailToTelegram} />
                    </circle>
                  </svg>

                  {/* DOM Nodes in Expanded Canvas */}
                  <div className="absolute inset-0 pointer-events-auto">
                    {nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const isCrit = node.status === 'CRITICAL';
                      const isAct = node.status === 'ACTIVE';

                      return (
                        <div
                          key={'exp-' + node.id}
                          onClick={() => handleNodeClick(node.id)}
                          style={{
                            left: `${node.x}px`,
                            top: `${node.y}px`,
                            width: `${node.width}px`,
                            height: `${node.height}px`,
                          }}
                          className={`absolute rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
                            isCrit
                              ? 'bg-white dark:bg-[#12080C] border-2 border-rose-500 shadow-xl ring-2 ring-rose-400/40'
                              : isAct && node.id === 'telegram-notifier'
                              ? 'bg-white dark:bg-[#080E14] border-2 border-sky-500 shadow-xl ring-2 ring-sky-400/40'
                              : isSelected
                              ? 'bg-white dark:bg-[#0B0F17] border-2 border-emerald-500 shadow-lg ring-2 ring-emerald-400/20'
                              : 'bg-white dark:bg-[#0E121B] border border-slate-200 dark:border-white/[0.08] shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                                {renderIcon(node.iconType, isCrit, isAct)}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {node.shortName}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {node.latency}ms
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.06] text-[9.5px] font-mono text-slate-500 dark:text-zinc-400">
                            <span>{node.protocol}</span>
                            <span className="font-semibold">{node.throughput}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer: Clean Selected Node Bar */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-[#070A10] border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">{selectedNode.name}</span>
                  <span className="text-slate-500 font-mono">[{selectedNode.namespace}]</span>
                  <span className="text-slate-500">Uptime: <b className="text-slate-800 dark:text-zinc-200">{selectedNode.baseUptime}</b></span>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
