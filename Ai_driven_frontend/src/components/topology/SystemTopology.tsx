import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Database,
  Cpu,
  Layers,
  Activity,
  Flame,
  CheckCircle,
  Zap,
  Server,
  ShieldCheck,
  Send,
  Radio,
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
  subTag: string;
  leftPercent: string;
  topPx: number;
  widthPercent: string;
  heightPx: number;
}

export const SystemTopology: React.FC<SystemTopologyProps> = ({
  activeIncident,
  selectedService,
  onSelectService,
  currentStep = 0,
  isLoading = false,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('checkout-service');

  const isNominal = !activeIncident || activeIncident.status === 'RESOLVED';
  const incidentService = !isNominal ? activeIncident?.impactedService || 'checkout-service' : null;

  // 7 Application Architecture Nodes with responsive percentage positioning
  const nodes: MeshNode[] = [
    // Top Row: Workload Layer (3 Nodes)
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
      subTag: 'Nominal (4ms)',
      leftPercent: '2%',
      topPx: 16,
      widthPercent: '28%',
      heightPx: 82,
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
      subTag: isNominal ? 'Nominal (18ms)' : 'DEGRADED · 2840ms',
      leftPercent: '36%',
      topPx: 16,
      widthPercent: '28%',
      heightPx: 82,
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
      subTag: isNominal ? 'Nominal (6ms)' : 'DEGRADED · 142ms',
      leftPercent: '70%',
      topPx: 16,
      widthPercent: '28%',
      heightPx: 82,
    },

    // Bottom Row: Telemetry, Gemini RAG, AST Guardrail & Telegram Dispatch (4 Nodes)
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
      subTag: !isNominal ? 'Ingesting Stream' : 'Listening',
      leftPercent: '2%',
      topPx: 142,
      widthPercent: '22%',
      heightPx: 82,
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
      subTag: !isNominal ? 'pgvector RAG Live' : 'Standby SOPs',
      leftPercent: '26.5%',
      topPx: 142,
      widthPercent: '22%',
      heightPx: 82,
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
      subTag: !isNominal ? 'AST Verified (0 Blast)' : 'Enforced',
      leftPercent: '51%',
      topPx: 142,
      widthPercent: '22%',
      heightPx: 82,
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
      subTag: !isNominal ? 'Alert Dispatched' : '@AuroraSREBot',
      leftPercent: '75.5%',
      topPx: 142,
      widthPercent: '22.5%',
      heightPx: 82,
    },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (onSelectService) onSelectService(nodeId);
  };

  // Mathematical SVG Connection Coordinates in a 1000 x 240 canvas
  const pathGwToCheckout = 'M 300 57 L 360 57';
  const pathCheckoutToDb = 'M 640 57 L 700 57';
  const pathCheckoutToAlert = 'M 500 98 C 500 126, 130 116, 130 142';
  const pathAlertToRag = 'M 240 183 L 265 183';
  const pathRagToGuardrail = 'M 485 183 L 510 183';
  const pathGuardrailToTelegram = 'M 730 183 L 755 183';
  const pathGuardrailToCheckout = 'M 620 142 C 620 120, 560 120, 560 98';

  const renderIcon = (type: string, isCrit: boolean, isAct: boolean) => {
    const iconClass = `w-4 h-4 ${
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
        return <Send className="w-4 h-4 text-sky-500" />;
      default:
        return <Server className={iconClass} />;
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-4.5 shadow-sm relative overflow-hidden transition-colors">
      {/* 1. Header with Title & Live Status Indicator */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/[0.06] mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shadow-xs">
            <Layers className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                DISTRIBUTED SERVICE MESH TOPOLOGY
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                eBPF Live
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
              mTLS Encrypted · Real-Time Incident Propagation · Telegram SRE Commander
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNominal ? (
            <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse shadow-xs">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Incident Alert Active</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Mesh 100% Nominal</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Responsive Topology Canvas */}
      <div className="relative w-full h-[245px] bg-[#F8FAFC]/90 dark:bg-[#070A10]/90 rounded-xl border border-slate-200/60 dark:border-white/[0.04] overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col justify-between p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
            </div>
          </div>
        ) : (
          <>
            {/* SVG Dynamic Conduits & Animated Particle Laser Flows */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 240"
              preserveAspectRatio="none"
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
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserGuardrail" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserTelegram" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#0EA5E9" stopOpacity="1" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
                </linearGradient>

                <filter id="glowEffect" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
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
              <circle cx="300" cy="57" r="2.5" fill={incidentService === 'checkout-service' ? '#EF4444' : '#10B981'} />
              <circle cx="360" cy="57" r="2.5" fill={incidentService === 'checkout-service' ? '#EF4444' : '#10B981'} />

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
              <circle cx="640" cy="57" r="2.5" fill={incidentService === 'postgresql' ? '#EF4444' : '#10B981'} />
              <circle cx="700" cy="57" r="2.5" fill={incidentService === 'postgresql' ? '#EF4444' : '#10B981'} />

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
                    strokeWidth="3"
                    strokeDasharray="5 5"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="4" fill="#EF4444">
                    <animateMotion dur="0.9s" repeatCount="indefinite" path={pathCheckoutToAlert} />
                  </circle>
                  <circle r="2.5" fill="#F87171">
                    <animateMotion dur="0.9s" begin="0.45s" repeatCount="indefinite" path={pathCheckoutToAlert} />
                  </circle>
                </>
              )}
              <circle cx="500" cy="98" r="3" fill={!isNominal ? '#EF4444' : '#94A3B8'} />
              <circle cx="130" cy="142" r="3" fill={!isNominal ? '#EF4444' : '#94A3B8'} />

              {/* 4. Alert Ingest -> Gemini RAG Agent (Live SOP Vector Search Flow) */}
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
                strokeWidth={!isNominal ? '3.5' : '2'}
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <>
                  <circle r="4.5" fill="#8B5CF6">
                    <animateMotion dur="0.75s" repeatCount="indefinite" path={pathAlertToRag} />
                  </circle>
                  <circle r="3" fill="#C084FC">
                    <animateMotion dur="0.75s" begin="0.37s" repeatCount="indefinite" path={pathAlertToRag} />
                  </circle>
                </>
              )}
              <circle cx="240" cy="183" r="3" fill={!isNominal ? '#8B5CF6' : '#94A3B8'} />
              <circle cx="265" cy="183" r="3" fill={!isNominal ? '#8B5CF6' : '#94A3B8'} />

              {/* 5. Gemini RAG Agent -> Safety Guardrail (AST Verification Flow) */}
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
                stroke={!isNominal ? 'url(#laserGuardrail)' : '#CBD5E1'}
                strokeWidth={!isNominal ? '3.5' : '2'}
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <>
                  <circle r="4.5" fill="#10B981">
                    <animateMotion dur="0.75s" repeatCount="indefinite" path={pathRagToGuardrail} />
                  </circle>
                  <circle r="3" fill="#6EE7B7">
                    <animateMotion dur="0.75s" begin="0.37s" repeatCount="indefinite" path={pathRagToGuardrail} />
                  </circle>
                </>
              )}
              <circle cx="485" cy="183" r="3" fill={!isNominal ? '#10B981' : '#94A3B8'} />
              <circle cx="510" cy="183" r="3" fill={!isNominal ? '#10B981' : '#94A3B8'} />

              {/* 6. Safety Guardrail -> Telegram Notifier (@AuroraSREBot Alert Push) */}
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
                strokeWidth={!isNominal ? '4' : '2'}
                strokeDasharray="5 5"
                className={!isNominal ? 'animate-laser-flow' : ''}
                filter={!isNominal ? 'url(#glowEffect)' : undefined}
              />
              {!isNominal && (
                <>
                  <circle r="5" fill="#0EA5E9">
                    <animateMotion dur="0.65s" repeatCount="indefinite" path={pathGuardrailToTelegram} />
                  </circle>
                  <circle r="3.5" fill="#7DD3FC">
                    <animateMotion dur="0.65s" begin="0.32s" repeatCount="indefinite" path={pathGuardrailToTelegram} />
                  </circle>
                </>
              )}
              <circle cx="730" cy="183" r="3.5" fill={!isNominal ? '#0EA5E9' : '#94A3B8'} />
              <circle cx="755" cy="183" r="3.5" fill={!isNominal ? '#0EA5E9' : '#94A3B8'} />

              {/* 7. Remediation Feedback Loop: Safety Guardrail -> Checkout Service */}
              {currentStep >= 4 && (
                <>
                  <path
                    d={pathGuardrailToCheckout}
                    fill="none"
                    stroke="url(#laserNominal)"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="4" fill="#10B981">
                    <animateMotion dur="0.85s" repeatCount="indefinite" path={pathGuardrailToCheckout} />
                  </circle>
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
                      left: node.leftPercent,
                      top: `${node.topPx}px`,
                      width: node.widthPercent,
                      height: `${node.heightPx}px`,
                    }}
                    className={`absolute rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                      isCrit
                        ? 'bg-white dark:bg-[#12080C] border-2 border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.45)] ring-2 ring-rose-400/40'
                        : isDeg
                        ? 'bg-white dark:bg-[#120D08] border-2 border-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                        : isAct && node.id === 'telegram-notifier'
                        ? 'bg-white dark:bg-[#080E14] border-2 border-sky-500 shadow-[0_0_24px_rgba(14,165,233,0.45)] ring-2 ring-sky-400/50'
                        : isAct && node.id === 'rag-ai-agent'
                        ? 'bg-white dark:bg-[#0E0A18] border-2 border-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.4)] ring-2 ring-purple-400/40'
                        : isAct
                        ? 'bg-white dark:bg-[#0A0D18] border-2 border-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.35)] ring-2 ring-indigo-400/30'
                        : isSelected
                        ? 'bg-white dark:bg-[#0B0F17] border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
                        : 'bg-white/95 dark:bg-[#0E121B]/95 border border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-white/[0.18]'
                    }`}
                  >
                    {/* Top Row: Icon Badge + Node Title + Status Pill */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
                            isCrit
                              ? 'bg-rose-100 dark:bg-rose-950/80'
                              : isAct && node.id === 'telegram-notifier'
                              ? 'bg-sky-100 dark:bg-sky-950/80'
                              : isAct && node.id === 'rag-ai-agent'
                              ? 'bg-purple-100 dark:bg-purple-950/80'
                              : isAct
                              ? 'bg-indigo-100 dark:bg-indigo-950/80'
                              : 'bg-emerald-50 dark:bg-emerald-950/60'
                          }`}
                        >
                          {renderIcon(node.iconType, isCrit, isAct)}
                          {isAct && node.id === 'telegram-notifier' && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping" />
                          )}
                          {isAct && node.id === 'rag-ai-agent' && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {node.shortName}
                        </span>
                      </div>

                      {/* Latency / Response Pill */}
                      <span
                        className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                          isCrit
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isDeg
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isAct && node.id === 'telegram-notifier'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            : isAct
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {node.latency}ms
                      </span>
                    </div>

                    {/* Bottom Row: Protocol / Runtime Chip + Telemetry Tag */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.06] text-[10px] font-mono">
                      <span className="text-slate-500 dark:text-zinc-400 truncate">
                        {node.protocol}
                      </span>
                      <span
                        className={`font-semibold ${
                          isCrit
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : isAct && node.id === 'telegram-notifier'
                            ? 'text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1'
                            : isAct && node.id === 'rag-ai-agent'
                            ? 'text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1'
                            : isDeg
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {node.subTag}
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
      <div className="mt-3 bg-slate-900 dark:bg-[#070A10] border border-slate-800 dark:border-white/[0.08] text-white rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            {renderIcon(selectedNode.iconType, selectedNode.status === 'CRITICAL', selectedNode.status === 'ACTIVE')}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-100 truncate">{selectedNode.name}</span>
            <span className="text-[10.5px] text-slate-400 font-mono">[{selectedNode.namespace}]</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono flex-shrink-0">
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
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
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
    </div>
  );
};
