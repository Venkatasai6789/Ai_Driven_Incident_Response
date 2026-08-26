import React, { useState, useEffect, useCallback } from 'react';
import { QuickRail } from './components/shell/QuickRail';
import { TopStatusBar } from './components/shell/TopStatusBar';
import { SystemTopology } from './components/topology/SystemTopology';
import { ChaosLab } from './components/chaos/ChaosLab';
import { ActiveAlertStream } from './components/incident/ActiveAlertStream';
import { AITriageSummary } from './components/incident/AITriageSummary';
import { ActiveIncidentCard } from './components/incident/ActiveIncidentCard';
import { PipelineStepper } from './components/pipeline/PipelineStepper';
import { SystemMetrics } from './components/metrics/SystemMetrics';
import { PostMortemDrawer } from './components/drawer/PostMortemDrawer';
import { chaosExperiments, resolvedIncidentState } from './data/mockIncidents';
import { ChaosExperiment, ActiveIncidentState, SystemOverviewData, SLOMetricsData, TopologyMeshData } from './types';
import { ApiService } from './services/api';

export default function App() {
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState>(resolvedIncidentState);
  const [currentExperimentId, setCurrentExperimentId] = useState<string>('nominal');
  const [isInjectingChaosId, setIsInjectingChaosId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isLoadingIncident, setIsLoadingIncident] = useState<boolean>(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  const [systemOverview, setSystemOverview] = useState<SystemOverviewData | null>(null);
  const [sloMetrics, setSloMetrics] = useState<SLOMetricsData | null>(null);
  const [topologyData, setTopologyData] = useState<TopologyMeshData | null>(null);
  const [currentRange, setCurrentRange] = useState<string>('1h');

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  
  // Theme state with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('aurora-sre-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Left sidebar expanded/collapsed state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);

  // Helper to fetch full incident triage & pipeline from backend and hydrate without mock flash
  const hydrateIncidentFromBackend = useCallback(async (incidentId: string, fallbackExp?: ChaosExperiment) => {
    setIsLoadingIncident(true);
    try {
      const [triageRes, pipelineRes, postMortemRes] = await Promise.allSettled([
        ApiService.getIncidentTriage(incidentId),
        ApiService.getIncidentPipeline(incidentId),
        ApiService.getPostMortem(incidentId),
      ]);

      const triage = triageRes.status === 'fulfilled' ? triageRes.value : null;
      const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value : null;
      const postMortem = postMortemRes.status === 'fulfilled' ? postMortemRes.value : null;

      const fallback = fallbackExp || chaosExperiments[0];
      const service = triage?.service || fallback.service;
      const severity = triage?.severity || fallback.severity;

      // Normalize confidence score (prevent 9680% double-scaling bug)
      const rawConf = (triage as any)?.confidence_score ?? (triage as any)?.confidence ?? fallback.confidence;
      let parsedConf = typeof rawConf === 'number' ? rawConf : parseFloat(rawConf) || 96.8;
      if (parsedConf > 100) {
        parsedConf = parsedConf > 1000 ? parsedConf / 100 : parsedConf / 10;
      } else if (parsedConf <= 1 && parsedConf > 0) {
        parsedConf = parsedConf * 100;
      }
      const confidence = Math.min(100, Math.max(0, Math.round(parsedConf * 10) / 10));

      // MTTR Duration calculation with solid fallback
      const duration = (triage as any)?.execution_time_seconds
        ? `${(triage as any).execution_time_seconds}s`
        : (triage as any)?.duration
        ? `${(triage as any).duration}`
        : postMortem?.impact?.duration || (fallback?.duration || '1.4s');

      const currentStepIdx = pipeline?.current_step_index ?? 3;
      const defaultStepNames = ['Telemetry Ingest', 'Vector Runbook', 'Root Diagnostics', 'Safety Guardrail', 'Rolling Remediation', 'Health Verification'];
      
      const steps = (pipeline?.steps && pipeline.steps.length > 0)
        ? pipeline.steps.map((s, idx) => {
            const isPast = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return {
              id: s.step_number || idx + 1,
              label: s.name || defaultStepNames[idx] || `Step ${idx + 1}`,
              sublabel: isPast ? 'Verified' : isCurrent ? (currentStepIdx === 4 ? 'Executing' : 'In Progress') : 'Pending',
              time: s.executed_at ? new Date(s.executed_at).toLocaleTimeString() : (isPast ? 'Verified' : isCurrent ? 'Live' : 'Pending'),
              status: (isPast ? 'completed' : isCurrent ? 'active' : 'pending') as 'completed' | 'active' | 'pending',
            };
          })
        : defaultStepNames.map((name, idx) => {
            const isPast = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return {
              id: idx + 1,
              label: name,
              sublabel: isPast ? 'Verified' : isCurrent ? (currentStepIdx === 4 ? 'Executing' : 'In Progress') : 'Pending',
              time: isPast ? `11:24:0${idx + 3}` : isCurrent ? 'Live' : 'Pending',
              status: (isPast ? 'completed' : isCurrent ? 'active' : 'pending') as 'completed' | 'active' | 'pending',
            };
          });

      // Clean concise headline (avoid giant duplicate paragraph in title)
      const rawCause = triage?.root_cause || (triage as any)?.title || fallback.rootCause || fallback.title;
      let cleanHeadline = fallback.title;
      if (rawCause) {
        const firstSentence = rawCause.split(/[.\n—–]/)[0].trim();
        if (firstSentence.length > 5 && firstSentence.length < 80) {
          cleanHeadline = firstSentence;
        }
      }

      const updatedIncident: ActiveIncidentState = {
        incidentId,
        title: `${service.toUpperCase()} — ${cleanHeadline}`,
        service,
        severity,
        status: (triage?.status as any) || 'OPEN',
        timeAgo: 'Just now',
        description: triage?.root_cause || fallback.description,
        confidence,
        sopMatched: triage?.sop_matched || fallback.sop,
        duration,
        blastRadius: triage?.blast_radius || fallback.blastRadius,
        currentStepIndex: currentStepIdx,
        steps,
        currentStepName: pipeline?.current_step_name || 'Autonomous SRE Remediation Execution',
        currentStepDescription: pipeline?.current_step_description || 'Executing deterministic zero-blast-radius command in cluster environment...',
        proposedCommand: triage?.remediation_command || fallback.command,
        riskLevel: triage?.risk_level || fallback.riskLevel,
        category: (triage?.guardrail_status === 'PASSED' || fallback.category === 'SAFE') ? 'SAFE' : 'DESTRUCTIVE',
        nextStepLabel: pipeline?.next_step_label || fallback.nextStep,
        nextStepStatus: pipeline?.next_step_status || 'Automated Authorization Granted',
        rootCause: triage?.root_cause || fallback.rootCause,
        recommendedAction: triage?.sop_matched ? `Execute SOP ${triage.sop_matched}` : fallback.recommendedAction,
        evidenceSources: fallback.evidenceSources,
        terminalOutput: triage?.remediation_output || fallback.terminalOutput,
        timeline: fallback.timeline,
        postMortem: postMortem ? {
          executiveSummary: postMortem.executive_summary || fallback.postMortem.executiveSummary,
          impact: {
            service,
            severity,
            duration: postMortem.timeline?.detection_to_resolution_seconds ? `${postMortem.timeline.detection_to_resolution_seconds}s` : duration,
            usersAffected: postMortem.impact?.users_affected || fallback.postMortem.impact.usersAffected,
            availabilityImpact: postMortem.impact?.availability_impact || fallback.postMortem.impact.availabilityImpact,
          },
          rootCauseAnalysis: postMortem.root_cause_analysis || fallback.postMortem.rootCauseAnalysis,
          preventativeMeasures: postMortem.preventative_measures || fallback.postMortem.preventativeMeasures,
          actionItems: postMortem.action_items || fallback.postMortem.actionItems,
        } : fallback.postMortem,
      };

      setActiveIncident(updatedIncident);
      // Refresh system overview and metrics
      ApiService.getSystemOverview().then(setSystemOverview).catch(() => {});
      ApiService.getSLOMetrics(currentRange).then(setSloMetrics).catch(() => {});
    } catch (err) {
      console.debug('Failed to hydrate live incident:', err);
    } finally {
      setIsLoadingIncident(false);
    }
  }, [currentRange]);

  // Initial load: Fetch System Overview, SLO Metrics, Topology Mesh & Active Incident in parallel
  useEffect(() => {
    setIsLoadingInitial(true);
    Promise.allSettled([
      ApiService.getSystemOverview(),
      ApiService.getSLOMetrics(currentRange),
      ApiService.getTopologyMesh(),
      ApiService.getActiveIncident(),
    ]).then(([overviewRes, sloRes, topoRes, incidentRes]) => {
      if (overviewRes.status === 'fulfilled' && overviewRes.value) {
        setSystemOverview(overviewRes.value);
      }
      if (sloRes.status === 'fulfilled' && sloRes.value) {
        setSloMetrics(sloRes.value);
      }
      if (topoRes.status === 'fulfilled' && topoRes.value) {
        setTopologyData(topoRes.value);
      }
      if (incidentRes.status === 'fulfilled' && incidentRes.value) {
        const data = incidentRes.value;
        if (data && data.incident_id && data.service && data.service !== 'nominal' && data.status !== 'NOMINAL' && data.status !== 'CLOSED' && data.status !== 'RESOLVED') {
          const matchedExp = chaosExperiments.find(
            (e) => e.service === data.service || (data.service === 'checkout-service' && e.type === 'oom')
          );
          hydrateIncidentFromBackend(data.incident_id, matchedExp);
        }
      }
      setIsLoadingInitial(false);
    }).catch(() => {
      setIsLoadingInitial(false);
    });
  }, [hydrateIncidentFromBackend]);

  // Connect to live WebSocket events stream from backend
  useEffect(() => {
    const ws = ApiService.connectWebSocket(
      (data) => {
        if (data) {
          if (data.event === 'alert' || data.event_type === 'ALERT_RECEIVED' || data.event_type === 'INCIDENT_TRIAGED') {
            const payload = data.payload || {};
            const service = payload.service || 'checkout-service';
            const incId = data.incident_id || payload.incident_id;
            const matchedExp = chaosExperiments.find(
              (e) => e.service === service || (service === 'checkout-service' && e.type === 'oom')
            ) || chaosExperiments[0];

            if (incId) {
              hydrateIncidentFromBackend(incId, matchedExp);
            }
          } else if (data.event_type === 'REMEDIATION_EXECUTING' || data.type === 'REMEDIATION_EXECUTING') {
            setActiveIncident((prev) => {
              const steps = prev.steps.map((s, idx) => {
                if (idx < 4) return { ...s, status: 'completed' as const, sublabel: idx === 3 ? 'Approved' : s.sublabel };
                if (idx === 4) return { ...s, status: 'active' as const, sublabel: 'Executing' };
                return { ...s, status: 'pending' as const, sublabel: 'Pending' };
              });
              return {
                ...prev,
                currentStepIndex: 4,
                steps,
                currentStepName: 'Executing Remediation in Host Process',
                currentStepDescription: `Telegram authorization confirmed${data.user_name ? ` by @${data.user_name}` : ''}. Executing zero-blast-radius command in cluster...`,
                nextStepLabel: 'Health Verification & Ingress Probes',
                nextStepStatus: 'Executing in Host Shell...',
              };
            });
          } else if (data.event_type === 'INCIDENT_RESOLVED' || data.type === 'INCIDENT_RESOLVED') {
            setActiveIncident((prev) => {
              const steps = prev.steps.map((s) => ({
                ...s,
                status: 'completed' as const,
                sublabel: 'Verified',
              }));
              return {
                ...prev,
                incidentId: data.incident_id || prev.incidentId || 'INC-NOMINAL-000',
                title: `Resolved: ${prev.title}`,
                status: 'CLOSED',
                timeAgo: 'Just now',
                currentStepIndex: 5,
                steps,
                currentStepName: 'Remediation Verified & Cluster Restored',
                currentStepDescription: 'Remediation command succeeded (Exit Code 0). All cluster health probes verified healthy.',
                nextStepLabel: 'Incident Closed & Resolved',
                nextStepStatus: 'Remediation Succeeded (Exit Code 0)',
              };
            });
            setCurrentExperimentId('nominal');
            // Refresh system overview and metrics upon resolution
            ApiService.getSystemOverview().then(setSystemOverview).catch(() => {});
            ApiService.getSLOMetrics(currentRange).then(setSloMetrics).catch(() => {});
          }
        }
      },
      (connected) => {
        setIsBackendConnected(connected);
      }
    );

    return () => {
      ws.disconnect();
    };
  }, [hydrateIncidentFromBackend, currentRange]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aurora-sre-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aurora-sre-theme', 'light');
    }
  }, [isDark]);

  // Triggering a chaos experiment from Card 2 (Chaos Lab):
  // 1. Immediately engage skeleton loaders (NO MOCK DEMO DATA FLASH)
  // 2. Call backend /api/v1/chaos/inject
  // 3. Hydrate live responses into the UI
  const handleTriggerChaosExperiment = async (exp: ChaosExperiment) => {
    setCurrentExperimentId(exp.id);
    setIsInjectingChaosId(exp.id);
    setIsLoadingIncident(true);

    try {
      const res = await ApiService.injectChaos(exp.id, exp.service);
      if (res && res.incident_id) {
        await hydrateIncidentFromBackend(res.incident_id, exp);
      } else {
        // Fallback hydration if backend returned non-standard payload
        await hydrateIncidentFromBackend(exp.id.replace('exp-', 'INC-2026-0824-'), exp);
      }
    } catch (err) {
      console.debug('Chaos injection error, falling back to local simulation:', err);
      await hydrateIncidentFromBackend(exp.id.replace('exp-', 'INC-2026-0824-'), exp);
    } finally {
      setIsInjectingChaosId(null);
    }
  };

  // Inspecting an alert from Card 3A (Telemetry Alerts)
  const handleSelectAlertById = (experimentId: string, incidentId?: string, alertStatus?: string) => {
    setCurrentExperimentId(experimentId);
    const matchedExp = chaosExperiments.find((e) => e.id === experimentId);
    const isAlertClosed = !alertStatus || alertStatus === 'RESOLVED' || alertStatus === 'CLOSED' || alertStatus === 'NOMINAL';

    if (isAlertClosed) {
      setActiveIncident(resolvedIncidentState);
    } else if (incidentId) {
      hydrateIncidentFromBackend(incidentId, matchedExp);
    } else if (matchedExp) {
      hydrateIncidentFromBackend(matchedExp.id.replace('exp-', 'INC-2026-0824-'), matchedExp);
    }
  };

  // Time range selector callback for SystemMetrics
  const handleRangeChange = async (range: string) => {
    setCurrentRange(range);
    setIsLoadingMetrics(true);
    try {
      const data = await ApiService.getSLOMetrics(range);
      if (data) {
        setSloMetrics(data);
      }
    } catch (err) {
      console.debug('Metrics range error:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Reset nominal state
  const handleResetNominal = async () => {
    setActiveIncident(resolvedIncidentState);
    setCurrentExperimentId('nominal');
    try {
      await ApiService.resetSystemNominal();
    } catch (e) {
      console.debug('Reset nominal API notice:', e);
    }
    ApiService.getSystemOverview().then(setSystemOverview).catch(() => {});
    ApiService.getSLOMetrics(currentRange).then(setSloMetrics).catch(() => {});
    ApiService.getTopologyMesh().then(setTopologyData).catch(() => {});
  };

  return (
    <div
      id="aurora-root"
      className="h-screen w-screen flex flex-row overflow-hidden bg-[#F8FAFC] dark:bg-black text-[#0F172A] dark:text-[#F8FAFC] antialiased selection:bg-[#16A34A] selection:text-white font-sans transition-colors duration-300"
    >
      {/* 1. Left Quick-Action Rail */}
      <QuickRail
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
      />

      {/* 2. Main Executive Application Canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-[#F8FAFC] dark:bg-black transition-colors duration-300">
        {/* Top Executive Status Bar */}
        <TopStatusBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeIncident={activeIncident}
          systemOverview={systemOverview}
          isLoading={isLoadingInitial}
          isBackendConnected={isBackendConnected}
          onResetNominal={handleResetNominal}
        />
        {/* Dashboard Workspace Scrollable Container */}
        <div
          id="dashboard-grid-container"
          className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 pt-1.5 pb-8"
        >
          <div
            id="dashboard-grid"
            className="flex flex-col gap-3.5 max-w-[1920px] w-full mx-auto"
          >
            {/* 1. Top Full-Width Section: System Service Topology Mesh */}
            <div className="w-full" id="topology-section">
              <SystemTopology
                activeIncident={activeIncident}
                topologyData={topologyData || undefined}
                isLoading={isLoadingInitial}
                currentStep={activeIncident?.currentStepIndex ?? 0}
                onInvestigate={() => setIsDrawerOpen(true)}
              />
            </div>

            {/* 2. Full-Width Section: Fault Injection Suite (Chaos Lab) */}
            <div className="w-full" id="chaos-suite-section">
              <ChaosLab
                currentExperimentId={currentExperimentId}
                isInjectingChaosId={isInjectingChaosId}
                disabled={isLoadingIncident}
                onTriggerExperiment={handleTriggerChaosExperiment}
              />
            </div>

            {/* 3. Row 1: Symmetrical Equal-Height Columns (Active Incident Spotlight & AI Root Cause Diagnostics) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch" id="incident-triage-row">
              <div className="flex flex-col h-full">
                <ActiveIncidentCard
                  activeIncident={activeIncident}
                  isLoading={isLoadingInitial || isLoadingIncident}
                  onInvestigate={() => setIsDrawerOpen(true)}
                />
              </div>
              <div className="flex flex-col h-full">
                <AITriageSummary
                  activeIncident={activeIncident}
                  isLoading={isLoadingInitial || isLoadingIncident}
                  onOpenAnalysis={() => setIsDrawerOpen(true)}
                />
              </div>
            </div>

            {/* 4. Row 2: Symmetrical Equal-Height Columns (Live Telemetry Alerts & Autonomous Remediation Pipeline) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch" id="telemetry-pipeline-row">
              <div className="flex flex-col h-full">
                <ActiveAlertStream
                  currentExperimentId={currentExperimentId}
                  onSelectAlert={handleSelectAlertById}
                  onOpenDossier={() => setIsDrawerOpen(true)}
                />
              </div>
              <div className="flex flex-col h-full">
                <PipelineStepper
                  activeIncident={activeIncident}
                  isLoading={isLoadingInitial || isLoadingIncident}
                />
              </div>
            </div>

            {/* 5. Bottom Full-Width Section: Platform SLO & MTTR Resolution Metrics */}
            <div className="w-full" id="platform-metrics-section">
              <SystemMetrics
                sloMetrics={sloMetrics}
                isLoading={isLoadingInitial || isLoadingMetrics}
                currentRange={currentRange}
                onRangeChange={handleRangeChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 3. Post-Mortem Drawer (Seamless Slide-Over Overlay) */}
      <PostMortemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeIncident={activeIncident}
        isLoadingPostMortem={isLoadingIncident}
      />
    </div>
  );
}

