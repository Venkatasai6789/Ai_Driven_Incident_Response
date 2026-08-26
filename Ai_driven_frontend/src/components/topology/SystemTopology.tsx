import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  X,
  Radio,
  Cpu,
  Bot,
  ShieldCheck,
  Database,
  ArrowRight,
  Activity,
  AlertTriangle,
  Server,
  Zap,
  CheckCircle2,
  Flame,
  Globe,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Terminal,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { ActiveIncidentState, TopologyEdge, TopologyNode } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface SystemTopologyProps {
  topologyData?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  activeIncident?: ActiveIncidentState;
  onInvestigate?: () => void;
  onSelectService?: (serviceId: string) => void;
}

export type ViewMode = 'ecosystem' | 'blast-radius' | 'sre-pipeline';

interface ServiceNodeDefinition {
  id: string;
  name: string;
  shortName: string;
  category: 'ingress' | 'service' | 'database' | 'ai' | 'guardrail' | 'telemetry' | 'executor';
  protocol: string;
  namespace: string;
  baseLatency: number;
  baseThroughput: string;
  baseUptime: string;
  baseResource: string;
  baseErrorRate: string;
  iconType: 'radio' | 'cpu' | 'bot' | 'shield' | 'database' | 'server' | 'globe' | 'terminal';
  x: number;
  y: number;
}

const CARD_WIDTH = 194;
const CARD_HEIGHT = 66;

const BASE_NODES: ServiceNodeDefinition[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway / Ingress',
    shortName: 'API Gateway',
    category: 'ingress',
    protocol: 'Envoy / HTTP/2',
    namespace: 'prod-edge-01',
    baseLatency: 4,
    baseThroughput: '1.4k req/s',
    baseUptime: '99.99%',
    baseResource: '18% CPU',
    baseErrorRate: '0.01%',
    iconType: 'globe',
    x: 18,
    y: 18,
  },
  {
    id: 'checkout-service',
    name: 'Checkout Service',
    shortName: 'Checkout Service',
    category: 'service',
    protocol: 'Node.js / Express',
    namespace: 'prod-core-v8',
    baseLatency: 18,
    baseThroughput: '340 ops/s',
    baseUptime: '99.95%',
    baseResource: '42% Mem',
    baseErrorRate: '0.00%',
    iconType: 'server',
    x: 238,
    y: 18,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL Database',
    shortName: 'Postgres DB',
    category: 'database',
    protocol: 'PgBouncer / TCP',
    namespace: 'prod-db-primary',
    baseLatency: 6,
    baseThroughput: '820 qps',
    baseUptime: '99.99%',
    baseResource: '28% Pool',
    baseErrorRate: '0.00%',
    iconType: 'database',
    x: 458,
    y: 18,
  },
  {
    id: 'alert-webhook',
    name: 'eBPF Alert Ingress',
    shortName: 'Alert Ingest',
    category: 'telemetry',
    protocol: 'Prometheus / eBPF',
    namespace: 'sre-telemetry',
    baseLatency: 8,
    baseThroughput: '120 events/s',
    baseUptime: '100%',
    baseResource: '12% CPU',
    baseErrorRate: '0.00%',
    iconType: 'radio',
    x: 18,
    y: 130,
  },
  {
    id: 'rag-ai-agent',
    name: 'Gemini SRE Reasoning Agent',
    shortName: 'Gemini RAG Agent',
    category: 'ai',
    protocol: 'Gemini 2.0 / pgvector',
    namespace: 'sre-reasoning',
    baseLatency: 38,
    baseThroughput: '24 triages/s',
    baseUptime: '99.98%',
    baseResource: 'GPU Active',
    baseErrorRate: '0.00%',
    iconType: 'bot',
    x: 238,
    y: 130,
  },
  {
    id: 'fastapi-dispatcher',
    name: 'FastAPI Safety Guardrail',
    shortName: 'Safety Guardrail',
    category: 'guardrail',
    protocol: 'FastAPI / AST Policy',
    namespace: 'sre-guardrail-v1',
    baseLatency: 12,
    baseThroughput: '100% Verified',
    baseUptime: '100%',
    baseResource: 'Zero-Blast Radius',
    baseErrorRate: '0.00%',
    iconType: 'shield',
    x: 458,
    y: 130,
  },
];

export const SystemTopology: React.FC<SystemTopologyProps> = ({
  topologyData,
  activeIncident,
  onInvestigate,
  onSelectService,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ecosystem');

  // Keyboard shortcut: Escape closes expanded view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Determine active incident details
  const isClosedOrResolved = 
    activeIncident?.status === 'CLOSED' || 
    activeIncident?.status === 'RESOLVED' || 
    activeIncident?.status === 'NOMINAL';

  const isNominal = 
    !activeIncident || 
    isClosedOrResolved ||
    activeIncident.incidentId === 'INC-NOMINAL-000' || 
    activeIncident.incidentId === 'nominal' || 
    activeIncident.title.includes('Operational') ||
    activeIncident.title.includes('0 Errors');
  const incidentService = isNominal ? null : (activeIncident ? activeIncident.service : null);
  const incidentSeverity = isNominal ? 'NOMINAL' : (activeIncident ? activeIncident.severity : 'NOMINAL');
  const currentStep = isNominal ? -1 : (activeIncident?.currentStepIndex ?? -1);

  const isIngestActive = !isNominal && currentStep === 0;
  const isTriageActive = !isNominal && (currentStep === 1 || currentStep === 2);
  const isSafetyActive = !isNominal && currentStep === 3;
  const isGateActive = !isNominal && currentStep === 4;
  const isVerifyActive = !isNominal && currentStep === 5;

  // Helper to dynamically calculate node status & positioning based on viewMode
  const getNodeState = (node: ServiceNodeDefinition) => {
    const isDirectIncident =
      node.id === incidentService ||
      (incidentService === 'logging-service' && node.id === 'checkout-service') ||
      (incidentService === 'user-service' && node.id === 'checkout-service');

    const isUpstreamDegraded =
      (incidentService === 'checkout-service' && node.id === 'api-gateway') ||
      (incidentService === 'postgresql' && (node.id === 'checkout-service' || node.id === 'api-gateway'));

    const isAiTriageActive = node.id === 'rag-ai-agent' && isTriageActive;
    const isSafetyGuardrailActive = node.id === 'fastapi-dispatcher' && isSafetyActive;
    const isTelemetryActive = node.id === 'alert-webhook' && (isIngestActive || isTriageActive || isSafetyActive);

    let status: 'CRITICAL' | 'DEGRADED' | 'ACTIVE' | 'NOMINAL' = 'NOMINAL';
    let statusLabel = 'Nominal';
    let latency = node.baseLatency;
    let resource = node.baseResource;
    let errorRate = node.baseErrorRate;
    let displayTitle = node.shortName;

    // Adapt display title for active non-standard incident services
    if (node.id === 'checkout-service') {
      if (incidentService === 'logging-service') {
        displayTitle = 'Logging Service';
      } else if (incidentService === 'user-service') {
        displayTitle = 'User Service';
      }
    }

    if (isDirectIncident) {
      status = incidentSeverity === 'CRITICAL' ? 'CRITICAL' : 'DEGRADED';
      if (incidentService === 'checkout-service') {
        statusLabel = 'CRITICAL · 98.4% MEM';
        latency = 480;
        resource = '98.4% V8 Heap';
        errorRate = '8.4%';
      } else if (incidentService === 'postgresql') {
        statusLabel = 'HIGH · POOL FULL';
        latency = 340;
        resource = '96.2% Sockets';
        errorRate = '4.1%';
      } else if (incidentService === 'api-gateway') {
        statusLabel = 'HIGH · WAF ATTACK';
        latency = 190;
        resource = 'Adversarial SQLi';
        errorRate = '12.8%';
      } else if (incidentService === 'logging-service') {
        statusLabel = 'MED · 92% DISK';
        latency = 85;
        resource = '92% /var/log';
        errorRate = '0.2%';
      } else if (incidentService === 'user-service') {
        statusLabel = 'LOW · ANOMALY';
        latency = 620;
        resource = 'Out-of-Domain';
        errorRate = '2.1%';
      }
    } else if (isUpstreamDegraded) {
      status = 'DEGRADED';
      statusLabel = 'Degraded · Retries';
      latency = Math.round(node.baseLatency * 4.5);
      errorRate = '2.3%';
    } else if (isAiTriageActive) {
      status = 'ACTIVE';
      statusLabel = 'Triaging · Gemini 2.0';
      resource = 'pgvector Cosine 0.948';
    } else if (isSafetyGuardrailActive) {
      status = 'ACTIVE';
      statusLabel = 'Guardrail · Verifying';
      resource = 'AST Policy Passed';
    } else if (isTelemetryActive) {
      status = 'ACTIVE';
      statusLabel = 'Live eBPF Feed';
    }

    // Dynamic View Mode Positioning & Visibility
    let dynamicX = node.x;
    let dynamicY = node.y;
    let isDimmed = false;

    if (viewMode === 'blast-radius') {
      if (node.id === 'checkout-service') {
        dynamicX = 238;
        dynamicY = 65;
      } else if (node.id === 'api-gateway') {
        dynamicX = 18;
        dynamicY = 65;
      } else if (node.id === 'postgresql') {
        dynamicX = 458;
        dynamicY = 65;
      } else {
        isDimmed = true;
      }
    } else if (viewMode === 'sre-pipeline') {
      if (node.id === 'alert-webhook') {
        dynamicX = 18;
        dynamicY = 65;
      } else if (node.id === 'rag-ai-agent') {
        dynamicX = 238;
        dynamicY = 65;
      } else if (node.id === 'fastapi-dispatcher') {
        dynamicX = 458;
        dynamicY = 65;
      } else {
        isDimmed = true;
      }
    }

    return {
      ...node,
      name: displayTitle,
      status,
      statusLabel,
      latency,
      resource,
      errorRate,
      isIncident: status === 'CRITICAL' || status === 'DEGRADED',
      isActiveEngine: status === 'ACTIVE',
      dynamicX,
      dynamicY,
      isDimmed,
    };
  };

  const nodes = BASE_NODES.map(getNodeState);
  const activeCriticalCount = nodes.filter((n) => n.status === 'CRITICAL').length;
  const activeDegradedCount = nodes.filter((n) => n.status === 'DEGRADED').length;

  const defaultSelected = nodes.find((n) => n.status === 'CRITICAL') || nodes[1];
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) || defaultSelected
    : defaultSelected;

  // Node Map and Dynamic Port Positioning
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const getNode = (id: string) => nodeMap.get(id);

  const getRightPort = (id: string) => {
    const n = getNode(id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.dynamicX + CARD_WIDTH, y: n.dynamicY + CARD_HEIGHT / 2 };
  };

  const getLeftPort = (id: string) => {
    const n = getNode(id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.dynamicX, y: n.dynamicY + CARD_HEIGHT / 2 };
  };

  const getBottomPort = (id: string) => {
    const n = getNode(id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.dynamicX + CARD_WIDTH / 2, y: n.dynamicY + CARD_HEIGHT };
  };

  const getTopPort = (id: string) => {
    const n = getNode(id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.dynamicX + CARD_WIDTH / 2, y: n.dynamicY };
  };

  // Compute live SVG connecting line paths
  const lineGwToCheckout = `M ${getRightPort('api-gateway').x} ${getRightPort('api-gateway').y} L ${getLeftPort('checkout-service').x} ${getLeftPort('checkout-service').y}`;
  const lineCheckoutToDb = `M ${getRightPort('checkout-service').x} ${getRightPort('checkout-service').y} L ${getLeftPort('postgresql').x} ${getLeftPort('postgresql').y}`;
  const lineCheckoutToRag = `M ${getBottomPort('checkout-service').x} ${getBottomPort('checkout-service').y} L ${getTopPort('rag-ai-agent').x} ${getTopPort('rag-ai-agent').y}`;
  const lineAlertToRag = `M ${getRightPort('alert-webhook').x} ${getRightPort('alert-webhook').y} L ${getLeftPort('rag-ai-agent').x} ${getLeftPort('rag-ai-agent').y}`;
  const lineRagToGuardrail = `M ${getRightPort('rag-ai-agent').x} ${getRightPort('rag-ai-agent').y} L ${getLeftPort('fastapi-dispatcher').x} ${getLeftPort('fastapi-dispatcher').y}`;

  const renderNodeIcon = (iconType: ServiceNodeDefinition['iconType'], status: string) => {
    const isCrit = status === 'CRITICAL';
    const isDeg = status === 'DEGRADED';
    const isAct = status === 'ACTIVE';

    if (isCrit) {
      return <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />;
    }
    if (isDeg) {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />;
    }
    if (isAct) {
      return <Zap className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />;
    }

    switch (iconType) {
      case 'globe':
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
      case 'server':
        return <Server className="w-3.5 h-3.5 text-emerald-600" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-emerald-600" />;
      case 'radio':
        return <Radio className="w-3.5 h-3.5 text-blue-600" />;
      case 'bot':
        return <Bot className="w-3.5 h-3.5 text-indigo-600" />;
      case 'shield':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getNodeStyling = (node: ReturnType<typeof getNodeState>, isSelected: boolean) => {
    if (node.isDimmed) {
      return 'bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-white/[0.04] opacity-25 grayscale pointer-events-none';
    }
    if (node.status === 'CRITICAL') {
      return isSelected
        ? 'bg-rose-50/95 dark:bg-rose-950/40 border-2 border-rose-600 shadow-[0_0_24px_rgba(244,63,94,0.45)] ring-4 ring-rose-200/60 dark:ring-rose-900/40 text-slate-900 dark:text-rose-100'
        : 'bg-white dark:bg-[#12080B] border-2 border-rose-500 critical-node-glow hover:border-rose-600 text-slate-900 dark:text-rose-100';
    }
    if (node.status === 'DEGRADED') {
      return isSelected
        ? 'bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-4 ring-amber-200/60 dark:ring-amber-900/40 text-slate-900 dark:text-amber-100'
        : 'bg-white dark:bg-[#140F08] border-2 border-amber-400 warning-node-glow hover:border-amber-500 text-slate-900 dark:text-amber-100';
    }
    if (node.status === 'ACTIVE') {
      return isSelected
        ? 'bg-indigo-50/95 dark:bg-indigo-950/40 border-2 border-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-4 ring-indigo-200/60 dark:ring-indigo-900/40 text-slate-900 dark:text-indigo-100'
        : 'bg-white dark:bg-[#0D0F1C] border-2 border-indigo-500 active-ai-node-glow hover:border-indigo-600 text-slate-900 dark:text-indigo-100';
    }
    return isSelected
      ? 'bg-white dark:bg-[#0F1420] border-2 border-emerald-500 shadow-md ring-4 ring-emerald-100 dark:ring-emerald-900/40 text-slate-900 dark:text-white'
      : 'bg-white dark:bg-[#0A0D15] border border-slate-200 dark:border-white/[0.08] shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-xs text-slate-900 dark:text-zinc-100';
  };

  return (
    <>
      {/* Main Dashboard Widget Card */}
      <div
        id="topology-card"
        className="bg-white dark:bg-[#090C14] border border-[#E5E8E5] dark:border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.02)] relative overflow-hidden transition-all duration-300"
      >
        {/* Card Header & View Switcher */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#F0F2F0] dark:bg-white/[0.08] text-[#111312] dark:text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-[12px] font-bold text-[#111312] dark:text-white tracking-wider uppercase">
                DISTRIBUTED SERVICE MESH TOPOLOGY
              </h2>
              {activeCriticalCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                  {activeCriticalCount} CRITICAL
                </span>
              ) : activeDegradedCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                  {activeDegradedCount} DEGRADED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  Nominal
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Animated View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-[#12151E] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[10px] font-medium text-slate-600 dark:text-zinc-400 relative">
              <button
                onClick={() => setViewMode('ecosystem')}
                className={`px-2.5 py-1 rounded-md transition-all relative z-10 cursor-pointer ${
                  viewMode === 'ecosystem'
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {viewMode === 'ecosystem' && (
                  <motion.div
                    layoutId="active-view-tab"
                    className="absolute inset-0 bg-white dark:bg-[#1E2433] rounded-md shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                Mesh
              </button>

              <button
                onClick={() => setViewMode('blast-radius')}
                className={`px-2.5 py-1 rounded-md transition-all relative z-10 cursor-pointer ${
                  viewMode === 'blast-radius'
                    ? 'text-rose-700 dark:text-rose-400 font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {viewMode === 'blast-radius' && (
                  <motion.div
                    layoutId="active-view-tab"
                    className="absolute inset-0 bg-white dark:bg-[#1E2433] rounded-md shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                Blast Radius
              </button>

              <button
                onClick={() => setViewMode('sre-pipeline')}
                className={`px-2.5 py-1 rounded-md transition-all relative z-10 cursor-pointer ${
                  viewMode === 'sre-pipeline'
                    ? 'text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {viewMode === 'sre-pipeline' && (
                  <motion.div
                    layoutId="active-view-tab"
                    className="absolute inset-0 bg-white dark:bg-[#1E2433] rounded-md shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                AI Loop
              </button>
            </div>

            {/* Expand Fullscreen Button */}
            <button
              id="fullscreen-topology-btn"
              onClick={() => setIsExpanded(true)}
              title="Expand Topology View"
              aria-label="Expand Topology View"
              className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="relative w-full h-[220px] bg-[#F8FAFC] dark:bg-black rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden flex items-center justify-center select-none transition-colors duration-300">
          {/* Subtle Canvas Dot Grid */}
          <div
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Blast Radius Ambient Overlay Banner */}
          <AnimatePresence>
            {viewMode === 'blast-radius' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 left-3 z-10 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <Flame className="w-3 h-3 text-rose-600" />
                <span>Blast Radius Scope: 1 Pod · Zero Cross-Namespace Bleed</span>
              </motion.div>
            )}

            {viewMode === 'sre-pipeline' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 left-3 z-10 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <Zap className="w-3 h-3 text-indigo-600" />
                <span>Autonomous SRE DAG Execution Flow</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Responsive SVG & Node Grid Container */}
          <div className="relative w-[670px] h-[208px] flex-shrink-0">
            {/* SVG Animated Conduits with Mathematically Exact Port Alignment */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 670 208"
            >
              <defs>
                <linearGradient id="laserNominal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="laserCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserDegraded" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#D97706" stopOpacity="1" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="laserAI" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
                </linearGradient>

                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* View: Ecosystem or Blast Radius Conduits */}
              {viewMode !== 'sre-pipeline' && (
                <>
                  {/* 1. Path: Gateway -> Checkout */}
                  <path d={lineGwToCheckout} fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d={lineGwToCheckout}
                    fill="none"
                    stroke={
                      incidentService === 'checkout-service' || incidentService === 'api-gateway'
                        ? 'url(#laserCritical)'
                        : 'url(#laserNominal)'
                    }
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="3.5" fill={incidentService === 'checkout-service' ? '#EF4444' : '#22C55E'}>
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={lineGwToCheckout} />
                  </circle>

                  {/* 2. Path: Checkout -> Database */}
                  <path d={lineCheckoutToDb} fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d={lineCheckoutToDb}
                    fill="none"
                    stroke={
                      incidentService === 'postgresql'
                        ? 'url(#laserCritical)'
                        : incidentService === 'checkout-service'
                        ? 'url(#laserDegraded)'
                        : 'url(#laserNominal)'
                    }
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="3.5" fill={incidentService === 'postgresql' ? '#EF4444' : '#22C55E'}>
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={lineCheckoutToDb} />
                  </circle>
                </>
              )}

              {/* View: AI Pipeline Conduits */}
              {viewMode !== 'blast-radius' && (
                <>
                  {/* 3. Path: Alert Ingest -> Gemini RAG Agent */}
                  <path d={lineAlertToRag} fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d={lineAlertToRag}
                    fill="none"
                    stroke="url(#laserAI)"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="3.5" fill="#6366F1">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={lineAlertToRag} />
                  </circle>

                  {/* 4. Path: Gemini RAG Agent -> FastAPI Guardrail */}
                  <path d={lineRagToGuardrail} fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <path
                    d={lineRagToGuardrail}
                    fill="none"
                    stroke="url(#laserAI)"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-laser-flow"
                    filter="url(#glowEffect)"
                  />
                  <circle r="3.5" fill="#3B82F6">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={lineRagToGuardrail} />
                  </circle>

                  {/* 5. Diagnostic Probe Conduit from Failing Workload to Gemini SRE Controller */}
                  {viewMode === 'ecosystem' && (
                    <>
                      <path d={lineCheckoutToRag} fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                      <path
                        d={lineCheckoutToRag}
                        fill="none"
                        stroke="url(#laserAI)"
                        strokeWidth="2.5"
                        strokeDasharray="5 5"
                        className="animate-laser-flow"
                        filter="url(#glowEffect)"
                      />
                      <circle r="3.5" fill="#8B5CF6">
                        <animateMotion dur="1.0s" repeatCount="indefinite" path={lineCheckoutToRag} />
                      </circle>
                    </>
                  )}
                </>
              )}
            </svg>

            {/* Render Interactive Mesh Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isCrit = node.status === 'CRITICAL';
              const isDeg = node.status === 'DEGRADED';
              const isAct = node.status === 'ACTIVE';

              return (
                <motion.div
                  key={node.id}
                  layout
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  style={{
                    position: 'absolute',
                    left: `${node.dynamicX}px`,
                    top: `${node.dynamicY}px`,
                    width: `${CARD_WIDTH}px`,
                    height: `${CARD_HEIGHT}px`,
                  }}
                  className="group relative"
                >
                  {/* Radar Ripple Effect for CRITICAL failing node */}
                  {isCrit && !node.isDimmed && (
                    <div className="absolute -inset-2 rounded-2xl bg-rose-500/25 animate-radar pointer-events-none -z-10" />
                  )}

                  {/* Pulsing Glow for DEGRADED or ACTIVE node */}
                  {isDeg && !node.isDimmed && (
                    <div className="absolute -inset-1.5 rounded-2xl bg-amber-500/20 animate-pulse pointer-events-none -z-10" />
                  )}
                  {isAct && !node.isDimmed && (
                    <div className="absolute -inset-1.5 rounded-2xl bg-indigo-500/20 animate-pulse pointer-events-none -z-10" />
                  )}

                  {/* Connection Port Terminals / Sockets */}
                  {!node.isDimmed && (
                    <>
                      {/* Left Port Socket */}
                      <div
                        className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs transition-colors ${
                          isCrit
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                            : isDeg
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60'
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            isCrit ? 'bg-rose-600' : isDeg ? 'bg-amber-600' : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      {/* Right Port Socket */}
                      <div
                        className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs transition-colors ${
                          isCrit
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                            : isDeg
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60'
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            isCrit ? 'bg-rose-600' : isDeg ? 'bg-amber-600' : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      {/* Bottom Port Socket on Checkout Node */}
                      {node.id === 'checkout-service' && viewMode === 'ecosystem' && (
                        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs">
                          <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                        </div>
                      )}

                      {/* Top Port Socket on Gemini RAG Agent Node */}
                      {node.id === 'rag-ai-agent' && viewMode === 'ecosystem' && (
                        <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs">
                          <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Main Node Card */}
                  <motion.div
                    id={`mesh-node-${node.id}`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                    }}
                    whileHover={node.isDimmed ? {} : { y: -2, scale: 1.02 }}
                    whileTap={node.isDimmed ? {} : { scale: 0.98 }}
                    className={`w-full h-full rounded-xl px-2.5 py-2 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none relative z-10 ${getNodeStyling(
                      node,
                      isSelected
                    )}`}
                  >
                    {/* Top Micro Bar: Protocol Chip & Status Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                            isCrit
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : isDeg
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : isAct
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {renderNodeIcon(node.iconType, node.status)}
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight truncate">
                          {node.name}
                        </span>
                      </div>

                      {/* Status / Latency Tag */}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0 flex items-center gap-1 ${
                          isCrit
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isDeg
                            ? 'bg-amber-500 text-white'
                            : isAct
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                        }`}
                      >
                        {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        {node.status === 'CRITICAL'
                          ? 'CRITICAL'
                          : node.status === 'DEGRADED'
                          ? 'DEGRADED'
                          : node.status === 'ACTIVE'
                          ? 'ACTIVE'
                          : `${node.latency}ms`}
                      </span>
                    </div>

                    {/* Bottom Telemetry & Resource Meter */}
                    <div className="flex items-center justify-between text-[9.5px] mt-0.5 pt-1 border-t border-slate-100 dark:border-white/[0.08]">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isCrit
                              ? 'bg-rose-600 animate-ping'
                              : isDeg
                              ? 'bg-amber-500 animate-pulse'
                              : isAct
                              ? 'bg-indigo-600 animate-pulse'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`font-semibold truncate ${
                            isCrit
                              ? 'text-rose-700 dark:text-rose-400 font-bold'
                              : isDeg
                              ? 'text-amber-700 dark:text-amber-400 font-bold'
                              : isAct
                              ? 'text-indigo-700 dark:text-indigo-400 font-bold'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {node.statusLabel}
                        </span>
                      </div>

                      <span className="font-mono text-[9px] text-slate-400 dark:text-zinc-400 font-medium flex-shrink-0">
                        {node.protocol.split('/')[0]}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Telemetry Strip */}
        {selectedNode && (
          <div className="mt-2 bg-slate-900 dark:bg-[#0E121B] text-white rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150 shadow-xs border border-transparent dark:border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedNode.status === 'CRITICAL'
                    ? 'bg-rose-500/30 text-rose-400'
                    : selectedNode.status === 'DEGRADED'
                    ? 'bg-amber-500/30 text-amber-400'
                    : selectedNode.status === 'ACTIVE'
                    ? 'bg-indigo-500/30 text-indigo-400'
                    : 'bg-emerald-500/30 text-emerald-400'
                }`}
              >
                {renderNodeIcon(selectedNode.iconType, selectedNode.status)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-[12px] truncate">{selectedNode.name}</span>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-400">{selectedNode.namespace}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      selectedNode.status === 'CRITICAL'
                        ? 'bg-rose-500 text-white'
                        : selectedNode.status === 'DEGRADED'
                        ? 'bg-amber-500 text-slate-900'
                        : selectedNode.status === 'ACTIVE'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {selectedNode.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-300 dark:text-zinc-400 font-mono mt-0.5">
                  <span>Latency: <b className="text-white">{selectedNode.latency}ms</b></span>
                  <span>Resource: <b className="text-white">{selectedNode.resource}</b></span>
                  <span>Throughput: <b className="text-white">{selectedNode.baseThroughput}</b></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onInvestigate && selectedNode.isIncident && (
                <button
                  onClick={onInvestigate}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Investigate Incident</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Professional SRE Fullscreen Expanded Control Plane */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#090C14] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.1] max-w-[1440px] w-full h-[92vh] flex flex-col overflow-hidden transition-colors"
            >
              {/* Professional SRE Top Navigation Bar */}
              <div className="px-6 py-3.5 border-b border-slate-800 dark:border-white/[0.08] flex items-center justify-between bg-slate-950 dark:bg-[#05070B] text-white flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-xs">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">
                          AURORA SRE CONTROL PLANE
                        </span>
                        <span className="text-xs text-slate-500">/</span>
                        <span className="text-xs font-mono text-emerald-400 font-semibold">prod-us-east-k8s</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                          production
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeCriticalCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-1.5 animate-pulse font-mono">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      1 Critical Outage
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* View Mode Switcher in Fullscreen */}
                  <div className="flex items-center bg-slate-900 dark:bg-[#0F131D] p-1 rounded-xl border border-slate-800 dark:border-white/[0.08] text-xs text-slate-300">
                    <button
                      onClick={() => setViewMode('ecosystem')}
                      className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                        viewMode === 'ecosystem'
                          ? 'bg-slate-800 dark:bg-[#1E2536] text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Full Mesh
                    </button>
                    <button
                      onClick={() => setViewMode('blast-radius')}
                      className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                        viewMode === 'blast-radius'
                          ? 'bg-rose-950/70 border border-rose-800/50 text-rose-300 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Blast Radius
                    </button>
                    <button
                      onClick={() => setViewMode('sre-pipeline')}
                      className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                        viewMode === 'sre-pipeline'
                          ? 'bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Autonomous AI Loop
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-800" />

                  <button
                    onClick={() => setIsExpanded(false)}
                    title="Close Fullscreen (Esc)"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  >
                    <X className="w-4 h-4" />
                    <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Esc</span>
                  </button>
                </div>
              </div>

              {/* Dual-Pane Layout: Interactive Graph (68%) + Real-Time Telemetry Forensics (32%) */}
              <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#030508]">
                {/* Left Pane: High-Resolution Topology Canvas */}
                <div className="flex-1 relative flex flex-col justify-between overflow-hidden border-r border-slate-200 dark:border-white/[0.08]">
                  {/* Subtle Canvas Dot Matrix */}
                  <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Canvas Controls Header */}
                  <div className="w-full flex items-center justify-between px-6 pt-4 pb-2 z-10">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                        Topology Graph View
                      </span>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
                        (6 Mesh Nodes · 5 Active Conduits · mTLS Enforced)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {viewMode === 'blast-radius' && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                          <span>Scope: 1 Pod Blast Radius Isolated</span>
                        </span>
                      )}
                      {viewMode === 'sre-pipeline' && (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                          <Zap className="w-3.5 h-3.5 text-indigo-500" />
                          <span>DAG Execution Flow Active</span>
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#0D111A] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-zinc-400 font-mono shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>eBPF Telemetry: 100% Live</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Graph Display Canvas Container */}
                  <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                    {(() => {
                      const EXP_WIDTH = 250;
                      const EXP_HEIGHT = 86;

                      // Calculate expanded node positions per viewMode
                      const getExpandedPos = (index: number) => {
                        if (viewMode === 'ecosystem') {
                          if (index === 0) return { x: 35, y: 55 };
                          if (index === 1) return { x: 335, y: 55 };
                          if (index === 2) return { x: 635, y: 55 };
                          if (index === 3) return { x: 35, y: 245 };
                          if (index === 4) return { x: 335, y: 245 };
                          if (index === 5) return { x: 635, y: 245 };
                        } else if (viewMode === 'blast-radius') {
                          if (index === 0) return { x: 35, y: 150 };
                          if (index === 1) return { x: 335, y: 150 };
                          if (index === 2) return { x: 635, y: 150 };
                          if (index === 3) return { x: 35, y: 310 };
                          if (index === 4) return { x: 335, y: 310 };
                          if (index === 5) return { x: 635, y: 310 };
                        } else if (viewMode === 'sre-pipeline') {
                          if (index === 3) return { x: 35, y: 150 };
                          if (index === 4) return { x: 335, y: 150 };
                          if (index === 5) return { x: 635, y: 150 };
                          if (index === 0) return { x: 35, y: 310 };
                          if (index === 1) return { x: 335, y: 310 };
                          if (index === 2) return { x: 635, y: 310 };
                        }
                        return { x: 0, y: 0 };
                      };

                      const pos0 = getExpandedPos(0); // api-gateway
                      const pos1 = getExpandedPos(1); // checkout-service
                      const pos2 = getExpandedPos(2); // postgresql
                      const pos3 = getExpandedPos(3); // alert-webhook
                      const pos4 = getExpandedPos(4); // rag-ai-agent
                      const pos5 = getExpandedPos(5); // fastapi-dispatcher

                      const expLineGwToCheckout = `M ${pos0.x + EXP_WIDTH} ${pos0.y + EXP_HEIGHT / 2} L ${pos1.x} ${pos1.y + EXP_HEIGHT / 2}`;
                      const expLineCheckoutToDb = `M ${pos1.x + EXP_WIDTH} ${pos1.y + EXP_HEIGHT / 2} L ${pos2.x} ${pos2.y + EXP_HEIGHT / 2}`;
                      const expLineAlertToRag = `M ${pos3.x + EXP_WIDTH} ${pos3.y + EXP_HEIGHT / 2} L ${pos4.x} ${pos4.y + EXP_HEIGHT / 2}`;
                      const expLineRagToGuardrail = `M ${pos4.x + EXP_WIDTH} ${pos4.y + EXP_HEIGHT / 2} L ${pos5.x} ${pos5.y + EXP_HEIGHT / 2}`;
                      const expLineCheckoutToRag = `M ${pos1.x + EXP_WIDTH / 2} ${pos1.y + EXP_HEIGHT} L ${pos4.x + EXP_WIDTH / 2} ${pos4.y}`;

                      return (
                        <div className="relative w-[920px] h-[390px] flex-shrink-0">
                          {/* SVG Flow Links */}
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                            viewBox="0 0 920 390"
                          >
                            {/* Service Flow Conduits */}
                            {viewMode !== 'sre-pipeline' && (
                              <>
                                {/* Gateway -> Checkout */}
                                <path
                                  d={expLineGwToCheckout}
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeOpacity="0.25"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={expLineGwToCheckout}
                                  fill="none"
                                  stroke={incidentService === 'checkout-service' || incidentService === 'api-gateway' ? 'url(#laserCritical)' : 'url(#laserNominal)'}
                                  strokeWidth="3"
                                  strokeDasharray="6 6"
                                  className="animate-laser-flow"
                                  filter="url(#glowEffect)"
                                />
                                <circle r="4" fill={incidentService === 'checkout-service' ? '#EF4444' : '#22C55E'}>
                                  <animateMotion dur="1.2s" repeatCount="indefinite" path={expLineGwToCheckout} />
                                </circle>

                                {/* Checkout -> Postgres */}
                                <path
                                  d={expLineCheckoutToDb}
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeOpacity="0.25"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={expLineCheckoutToDb}
                                  fill="none"
                                  stroke={incidentService === 'postgresql' ? 'url(#laserCritical)' : incidentService === 'checkout-service' ? 'url(#laserDegraded)' : 'url(#laserNominal)'}
                                  strokeWidth="3"
                                  strokeDasharray="6 6"
                                  className="animate-laser-flow"
                                  filter="url(#glowEffect)"
                                />
                                <circle r="4" fill={incidentService === 'postgresql' ? '#EF4444' : '#22C55E'}>
                                  <animateMotion dur="1.4s" repeatCount="indefinite" path={expLineCheckoutToDb} />
                                </circle>
                              </>
                            )}

                            {/* AI & Telemetry Conduits */}
                            {viewMode !== 'blast-radius' && (
                              <>
                                {/* Alert Ingest -> Gemini RAG Agent */}
                                <path
                                  d={expLineAlertToRag}
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeOpacity="0.25"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={expLineAlertToRag}
                                  fill="none"
                                  stroke="url(#laserAI)"
                                  strokeWidth="3"
                                  strokeDasharray="6 6"
                                  className="animate-laser-flow"
                                  filter="url(#glowEffect)"
                                />
                                <circle r="4" fill="#6366F1">
                                  <animateMotion dur="1.2s" repeatCount="indefinite" path={expLineAlertToRag} />
                                </circle>

                                {/* Gemini RAG Agent -> FastAPI Guardrail */}
                                <path
                                  d={expLineRagToGuardrail}
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeOpacity="0.25"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={expLineRagToGuardrail}
                                  fill="none"
                                  stroke="url(#laserAI)"
                                  strokeWidth="3"
                                  strokeDasharray="6 6"
                                  className="animate-laser-flow"
                                  filter="url(#glowEffect)"
                                />
                                <circle r="4" fill="#3B82F6">
                                  <animateMotion dur="1.2s" repeatCount="indefinite" path={expLineRagToGuardrail} />
                                </circle>

                                {/* Ecosystem Probe: Checkout -> Gemini RAG Agent */}
                                {viewMode === 'ecosystem' && (
                                  <>
                                    <path
                                      d={expLineCheckoutToRag}
                                      fill="none"
                                      stroke="#94A3B8"
                                      strokeOpacity="0.2"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d={expLineCheckoutToRag}
                                      fill="none"
                                      stroke="url(#laserAI)"
                                      strokeWidth="2.5"
                                      strokeDasharray="6 6"
                                      className="animate-laser-flow"
                                      filter="url(#glowEffect)"
                                    />
                                    <circle r="4" fill="#8B5CF6">
                                      <animateMotion dur="1.0s" repeatCount="indefinite" path={expLineCheckoutToRag} />
                                    </circle>
                                  </>
                                )}
                              </>
                            )}
                          </svg>

                          {/* Nodes in Expanded View */}
                          {nodes.map((node, i) => {
                            const isSelected = selectedNode?.id === node.id;
                            const isCrit = node.status === 'CRITICAL';
                            const isDeg = node.status === 'DEGRADED';
                            const isAct = node.status === 'ACTIVE';
                            const pos = getExpandedPos(i);

                            return (
                              <motion.div
                                key={node.id}
                                layout
                                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                style={{
                                  position: 'absolute',
                                  left: `${pos.x}px`,
                                  top: `${pos.y}px`,
                                  width: `${EXP_WIDTH}px`,
                                  height: `${EXP_HEIGHT}px`,
                                }}
                                className="group relative z-10 select-none"
                              >
                                {/* Radar Ripple for CRITICAL node */}
                                {isCrit && !node.isDimmed && (
                                  <div className="absolute -inset-2 rounded-2xl bg-rose-500/25 animate-radar pointer-events-none -z-10" />
                                )}

                                {/* Connection Port Terminals on Card */}
                                {!node.isDimmed && (
                                  <>
                                    {/* Left Port Socket */}
                                    <div
                                      className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs ${
                                        isCrit
                                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                                          : isDeg
                                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60'
                                          : 'border-slate-300 dark:border-zinc-700'
                                      }`}
                                    >
                                      <div
                                        className={`w-1 h-1 rounded-full ${
                                          isCrit ? 'bg-rose-600' : isDeg ? 'bg-amber-600' : 'bg-emerald-500'
                                        }`}
                                      />
                                    </div>

                                    {/* Right Port Socket */}
                                    <div
                                      className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs ${
                                        isCrit
                                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                                          : isDeg
                                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60'
                                          : 'border-slate-300 dark:border-zinc-700'
                                      }`}
                                    >
                                      <div
                                        className={`w-1 h-1 rounded-full ${
                                          isCrit ? 'bg-rose-600' : isDeg ? 'bg-amber-600' : 'bg-emerald-500'
                                        }`}
                                      />
                                    </div>

                                    {/* Bottom Port on Checkout */}
                                    {node.id === 'checkout-service' && viewMode === 'ecosystem' && (
                                      <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs">
                                        <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                                      </div>
                                    )}

                                    {/* Top Port on RAG Agent */}
                                    {node.id === 'rag-ai-agent' && viewMode === 'ecosystem' && (
                                      <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-[#090C14] flex items-center justify-center z-20 shadow-xs">
                                        <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Main Node Card Container */}
                                <motion.div
                                  onClick={() => {
                                    setSelectedNodeId(node.id);
                                  }}
                                  whileHover={node.isDimmed ? {} : { y: -2, scale: 1.02 }}
                                  whileTap={node.isDimmed ? {} : { scale: 0.98 }}
                                  className={`w-full h-full rounded-xl px-3 py-2 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                                    node.isDimmed
                                      ? 'bg-slate-100/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-white/[0.04] opacity-25 grayscale pointer-events-none'
                                      : isCrit
                                      ? isSelected
                                        ? 'bg-rose-50/95 dark:bg-rose-950/40 border-2 border-rose-600 shadow-[0_0_24px_rgba(244,63,94,0.35)] ring-4 ring-rose-200/60 dark:ring-rose-900/40 text-slate-900 dark:text-rose-100'
                                        : 'bg-white dark:bg-[#12080B] border-2 border-rose-500 critical-node-glow hover:border-rose-600 text-slate-900 dark:text-rose-100'
                                      : isDeg
                                      ? isSelected
                                        ? 'bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-4 ring-amber-200/60 dark:ring-amber-900/40 text-slate-900 dark:text-amber-100'
                                        : 'bg-white dark:bg-[#140F08] border-2 border-amber-400 warning-node-glow hover:border-amber-500 text-slate-900 dark:text-amber-100'
                                      : isAct
                                      ? isSelected
                                        ? 'bg-indigo-50/95 dark:bg-indigo-950/40 border-2 border-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-4 ring-indigo-200/60 dark:ring-indigo-900/40 text-slate-900 dark:text-indigo-100'
                                        : 'bg-white dark:bg-[#0D0F1C] border-2 border-indigo-500 active-ai-node-glow hover:border-indigo-600 text-slate-900 dark:text-indigo-100'
                                      : isSelected
                                      ? 'bg-white dark:bg-[#0F1420] border-2 border-emerald-500 shadow-md ring-4 ring-emerald-100 dark:ring-emerald-900/40 text-slate-900 dark:text-white'
                                      : 'bg-white dark:bg-[#0A0D15] border border-slate-200 dark:border-white/[0.08] shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-xs text-slate-900 dark:text-zinc-100'
                                  }`}
                                >
                                  {/* Top Header: Icon + Name + Status Badge */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          isCrit
                                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                            : isDeg
                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                            : isAct
                                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                        }`}
                                      >
                                        {renderNodeIcon(node.iconType, node.status)}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-[12px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight truncate leading-none">
                                          {node.name}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-mono truncate mt-0.5 leading-none">
                                          {node.namespace}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Status / Latency Tag */}
                                    <span
                                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md font-bold flex-shrink-0 flex items-center gap-1 ${
                                        isCrit
                                          ? 'bg-rose-600 text-white animate-pulse'
                                          : isDeg
                                          ? 'bg-amber-500 text-white'
                                          : isAct
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                      }`}
                                    >
                                      {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                                      {node.status === 'CRITICAL'
                                        ? 'CRITICAL'
                                        : node.status === 'DEGRADED'
                                        ? 'DEGRADED'
                                        : node.status === 'ACTIVE'
                                        ? 'ACTIVE'
                                        : `${node.latency}ms`}
                                    </span>
                                  </div>

                                  {/* Bottom Status & Metrics Strip */}
                                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-white/[0.08]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          isCrit
                                            ? 'bg-rose-600 animate-ping'
                                            : isDeg
                                            ? 'bg-amber-500 animate-pulse'
                                            : isAct
                                            ? 'bg-indigo-600 animate-pulse'
                                            : 'bg-emerald-500'
                                        }`}
                                      />
                                      <span
                                        className={`font-semibold truncate ${
                                          isCrit
                                            ? 'text-rose-700 dark:text-rose-400 font-bold'
                                            : isDeg
                                            ? 'text-amber-700 dark:text-amber-400 font-bold'
                                            : isAct
                                            ? 'text-indigo-700 dark:text-indigo-400 font-bold'
                                            : 'text-emerald-700 dark:text-emerald-400'
                                        }`}
                                      >
                                        {node.statusLabel}
                                      </span>
                                    </div>

                                    <span className="font-mono text-[9.5px] text-slate-400 dark:text-zinc-400 font-medium flex-shrink-0">
                                      {node.baseThroughput}
                                    </span>
                                  </div>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Clean Bottom Legend Bar */}
                  <div className="w-full flex items-center justify-between px-6 py-2.5 bg-white/90 dark:bg-[#080B12]/90 backdrop-blur-md border-t border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 dark:text-zinc-400 z-10">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        Critical Incident (P0)
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Upstream / Degraded
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        Autonomous SRE Agent
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Nominal / Healthy
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-400">
                      Click any node to inspect telemetry & runbook bindings
                    </span>
                  </div>
                </div>

                {/* Right Pane: Live SRE Telemetry & Dependency Inspector */}
                <div className="w-[380px] bg-white dark:bg-[#080B12] p-5 flex flex-col justify-between overflow-y-auto border-l border-slate-200 dark:border-white/[0.08] transition-colors">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                          SERVICE TELEMETRY DOSSIER
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedNode.name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          selectedNode.status === 'CRITICAL'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                            : selectedNode.status === 'DEGRADED'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                            : selectedNode.status === 'ACTIVE'
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                        }`}
                      >
                        {selectedNode.status}
                      </span>
                    </div>

                    {/* Pod Replicas State */}
                    <div className="bg-slate-50 dark:bg-[#0D111A] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                          Pod Replicas ({selectedNode.status === 'CRITICAL' ? '2/3 Healthy' : '3/3 Healthy'})
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{selectedNode.namespace}</span>
                      </div>

                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/[0.08]">
                          <span className="truncate text-slate-800 dark:text-zinc-200">{selectedNode.id}-7f9b8c-x2q</span>
                          {selectedNode.status === 'CRITICAL' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">UNRESPONSIVE · 98.4%</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">READY · {selectedNode.latency}ms</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/[0.08]">
                          <span className="truncate text-slate-800 dark:text-zinc-200">{selectedNode.id}-7f9b8c-9b1</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">READY · {selectedNode.baseLatency}ms</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/[0.08]">
                          <span className="truncate text-slate-800 dark:text-zinc-200">{selectedNode.id}-7f9b8c-k4m</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">READY · {selectedNode.baseLatency}ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Resource Saturation Meters */}
                    <div className="bg-slate-50 dark:bg-[#0D111A] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                        Live Resource Saturation
                      </span>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-600 dark:text-zinc-400">Memory Allocation</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-zinc-200">
                              {selectedNode.status === 'CRITICAL' ? '98.4% (1.98GB / 2GB)' : '42% (840MB / 2GB)'}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                selectedNode.status === 'CRITICAL' ? 'bg-rose-600 w-[98.4%]' : 'bg-emerald-500 w-[42%]'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-600 dark:text-zinc-400">HTTP/gRPC Error Rate</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-zinc-200">{selectedNode.errorRate}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                selectedNode.status === 'CRITICAL' ? 'bg-rose-500 w-[40%]' : 'bg-emerald-500 w-[1%]'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Runbook Binding */}
                    {activeIncident && (
                      <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-900 dark:text-indigo-300 uppercase text-[10.5px]">
                            Matched Runbook SOP
                          </span>
                          <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                            {activeIncident.confidence}% Match
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-zinc-100">{activeIncident.sopMatched}</p>
                        <p className="text-slate-600 dark:text-zinc-400 text-[11px] mt-1">{activeIncident.recommendedAction}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer in Sidebar */}
                  <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] flex flex-col gap-2">
                    {onInvestigate && selectedNode.isIncident && (
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          onInvestigate();
                        }}
                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Inspect Full Incident Dossier</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsExpanded(false)}
                      className="w-full py-2 px-3 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Close Control Plane View
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
