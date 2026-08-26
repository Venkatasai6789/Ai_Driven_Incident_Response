import React, { useState, useEffect } from 'react';
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
import { defaultOOMIncident, chaosExperiments, resolvedIncidentState } from './data/mockIncidents';
import { ChaosExperiment, ActiveIncidentState } from './types';
import { ApiService, API_BASE_URL } from './services/api';

export default function App() {
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState>(resolvedIncidentState);
  const [currentExperimentId, setCurrentExperimentId] = useState<string>('nominal');
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

  // Connect to live WebSocket events stream from backend
  useEffect(() => {
    // Check if backend has an ongoing incident
    ApiService.getActiveIncident()
      .then((data) => {
        if (data && data.incident_id && data.service && data.service !== 'nominal' && data.status !== 'NOMINAL' && data.status !== 'CLOSED' && data.status !== 'RESOLVED') {
          const matchedExp = chaosExperiments.find(
            (e) => e.service === data.service || (data.service === 'checkout-service' && e.type === 'oom')
          );
          if (matchedExp) {
            handleTriggerExperiment(matchedExp, data.incident_id);
          }
        }
      })
      .catch(() => {
        // Backend offline or quiet fallback
      });

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

            if (matchedExp) {
              handleTriggerExperiment(matchedExp, incId);
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
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aurora-sre-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aurora-sre-theme', 'light');
    }
  }, [isDark]);

  // Triggering a chaos experiment from Card 2 (Chaos Lab) injects the simulation into the cluster
  const handleTriggerChaosExperiment = (exp: ChaosExperiment) => {
    setCurrentExperimentId(exp.id);

    const fallbackIncId = exp.id.replace('exp-', 'INC-2026-0824-');

    const updatedIncident: ActiveIncidentState = {
      incidentId: fallbackIncId,
      title: `${exp.service.toUpperCase()} — ${exp.title}`,
      service: exp.service,
      severity: exp.severity,
      status: 'OPEN',
      timeAgo: 'Just now',
      description: exp.description,
      confidence: exp.confidence,
      sopMatched: exp.sop,
      duration: '1.2s',
      blastRadius: exp.blastRadius,
      currentStepIndex: 3, // Step 4: Safety Guardrail active
      steps: [
        { id: 1, label: 'Ingest', sublabel: '11:24:03', time: '11:24:03', status: 'completed' },
        { id: 2, label: 'Vector', sublabel: '11:24:04', time: '11:24:04', status: 'completed' },
        { id: 3, label: 'Triage', sublabel: '11:24:05', time: '11:24:05', status: 'completed' },
        { id: 4, label: 'Guardrail', sublabel: '11:24:06', time: '11:24:06', status: 'active' },
        { id: 5, label: 'Execute', sublabel: 'Pending', time: 'Pending', status: 'pending' },
        { id: 6, label: 'Verify', sublabel: 'Pending', time: 'Pending', status: 'pending' },
      ],
      currentStepName: 'Deterministic Safety Guardrail Policy',
      currentStepDescription: 'Evaluating proposed remediation command against zero-blast-radius execution rules...',
      proposedCommand: exp.command,
      riskLevel: exp.riskLevel,
      category: exp.category === 'SAFE' ? 'SAFE' : 'DESTRUCTIVE',
      nextStepLabel: exp.nextStep,
      nextStepStatus: 'Automated Authorization Granted',
      rootCause: exp.rootCause,
      recommendedAction: exp.recommendedAction,
      evidenceSources: exp.evidenceSources,
      terminalOutput: exp.terminalOutput,
      timeline: exp.timeline,
      postMortem: exp.postMortem,
    };

    setActiveIncident(updatedIncident);

    // Call backend API to create real incident in DB & Telegram approval request
    ApiService.injectChaos(exp.id)
      .then((res) => {
        if (res && res.incident_id) {
          setActiveIncident((prev) => ({
            ...prev,
            incidentId: res.incident_id,
          }));
        }
      })
      .catch(() => {
        // Standalone offline fallback
      });
  };

  // Inspecting an alert from Card 3A (Telemetry Alerts) ONLY selects the alert for viewing diagnostics
  // It is purely a UI view action and NEVER dispatches anything to Telegram or injects chaos.
  const handleSelectAlertById = (experimentId: string, incidentId?: string, alertStatus?: string) => {
    setCurrentExperimentId(experimentId);
    const matchedExp = chaosExperiments.find((e) => e.id === experimentId);
    if (matchedExp) {
      const isAlertClosed = !alertStatus || alertStatus === 'RESOLVED' || alertStatus === 'CLOSED' || alertStatus === 'NOMINAL';

      setActiveIncident((prev) => {
        if (isAlertClosed) {
          return {
            ...prev,
            incidentId: incidentId || prev.incidentId || matchedExp.id.replace('exp-', 'INC-2026-0824-'),
            title: `${matchedExp.service.toUpperCase()} — ${matchedExp.title}`,
            service: matchedExp.service,
            severity: matchedExp.severity,
            status: 'CLOSED',
            timeAgo: 'Past Alert',
            description: matchedExp.description,
            confidence: matchedExp.confidence,
            sopMatched: matchedExp.sop,
            duration: '0.0s',
            blastRadius: matchedExp.blastRadius,
            currentStepIndex: 5,
            steps: prev.steps.map((s) => ({
              ...s,
              status: 'completed' as const,
              sublabel: 'Verified',
            })),
            currentStepName: 'Continuous SRE Health Monitoring',
            currentStepDescription: 'Zero active alerts detected across Prometheus, Datadog, Grafana and webhook feeds.',
            proposedCommand: matchedExp.command,
            riskLevel: matchedExp.riskLevel,
            category: matchedExp.category === 'SAFE' ? 'SAFE' : 'DESTRUCTIVE',
            nextStepLabel: 'Monitoring Nominal Baseline',
            nextStepStatus: 'All Systems Nominal',
            rootCause: matchedExp.rootCause,
            recommendedAction: matchedExp.recommendedAction,
            evidenceSources: matchedExp.evidenceSources,
            terminalOutput: matchedExp.terminalOutput,
            timeline: matchedExp.timeline,
            postMortem: matchedExp.postMortem,
          };
        } else {
          return {
            ...prev,
            incidentId: incidentId || prev.incidentId || matchedExp.id.replace('exp-', 'INC-2026-0824-'),
            title: `${matchedExp.service.toUpperCase()} — ${matchedExp.title}`,
            service: matchedExp.service,
            severity: matchedExp.severity,
            status: 'OPEN',
            timeAgo: 'Just now',
            description: matchedExp.description,
            confidence: matchedExp.confidence,
            sopMatched: matchedExp.sop,
            rootCause: matchedExp.rootCause,
            recommendedAction: matchedExp.recommendedAction,
            evidenceSources: matchedExp.evidenceSources,
            proposedCommand: matchedExp.command,
            riskLevel: matchedExp.riskLevel,
            blastRadius: matchedExp.blastRadius,
            currentStepIndex: 3,
            steps: [
              { id: 1, label: 'Ingest', sublabel: '11:24:03', time: '11:24:03', status: 'completed' },
              { id: 2, label: 'Vector', sublabel: '11:24:04', time: '11:24:04', status: 'completed' },
              { id: 3, label: 'Triage', sublabel: '11:24:05', time: '11:24:05', status: 'completed' },
              { id: 4, label: 'Guardrail', sublabel: '11:24:06', time: '11:24:06', status: 'active' },
              { id: 5, label: 'Execute', sublabel: 'Pending', time: 'Pending', status: 'pending' },
              { id: 6, label: 'Verify', sublabel: 'Pending', time: 'Pending', status: 'pending' },
            ],
            currentStepName: 'Deterministic Safety Guardrail Policy',
            currentStepDescription: 'Evaluating proposed remediation command against zero-blast-radius execution rules...',
            nextStepLabel: matchedExp.nextStep,
            nextStepStatus: 'Automated Authorization Granted',
            category: matchedExp.category === 'SAFE' ? 'SAFE' : 'DESTRUCTIVE',
            terminalOutput: matchedExp.terminalOutput,
            timeline: matchedExp.timeline,
            postMortem: matchedExp.postMortem,
          };
        }
      });
    }
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
          onResetNominal={() => {
            setActiveIncident(resolvedIncidentState);
            setCurrentExperimentId('nominal');
          }}
        />

        {/* Dashboard Workspace Scrollable Container */}
        <div
          id="dashboard-grid-container"
          className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 pt-1.5 pb-8"
        >
          <div
            id="dashboard-grid"
            className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 max-w-[1920px] w-full mx-auto"
          >
            {/* Left Column (Topology, Chaos Lab, Alert Stream 3A + AI Triage 3B) */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              {/* Card 1: System Service Topology */}
              <SystemTopology
                activeIncident={activeIncident}
                onInvestigate={() => setIsDrawerOpen(true)}
              />

              {/* Card 2: Chaos Lab */}
              <ChaosLab
                currentExperimentId={currentExperimentId}
                onTriggerExperiment={handleTriggerChaosExperiment}
              />

              {/* Bottom Split Row: Card 3A (Alerts) & Card 3B (Triage Summary) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ActiveAlertStream
                  currentExperimentId={currentExperimentId}
                  onSelectAlert={handleSelectAlertById}
                  onOpenDossier={() => setIsDrawerOpen(true)}
                />
                <AITriageSummary
                  activeIncident={activeIncident}
                  onOpenAnalysis={() => setIsDrawerOpen(true)}
                />
              </div>
            </div>

            {/* Right Column (Active Incident, Pipeline Stepper, System Metrics) */}
            <div className="lg:col-span-5 flex flex-col gap-3.5">
              {/* Card 4: Active Incident Spotlight */}
              <ActiveIncidentCard
                activeIncident={activeIncident}
                onInvestigate={() => setIsDrawerOpen(true)}
              />

              {/* Card 5: SRE Pipeline Stepper */}
              <PipelineStepper
                activeIncident={activeIncident}
              />

              {/* Card 6: System Metrics & MTTR */}
              <SystemMetrics />
            </div>
          </div>
        </div>
      </main>

      {/* 3. Post-Mortem Drawer (Seamless Slide-Over Overlay) */}
      <PostMortemDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeIncident={activeIncident}
      />
    </div>
  );
}
