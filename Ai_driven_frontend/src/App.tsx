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
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState>(defaultOOMIncident);
  const [currentExperimentId, setCurrentExperimentId] = useState<string>('exp-oom');
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
    const ws = ApiService.connectWebSocket(
      (data) => {
        if (data && data.event === 'alert' && data.payload) {
          console.log('[Live SRE Stream] New Alert received:', data.payload);
        } else if (data && data.event === 'incident_update') {
          console.log('[Live SRE Stream] Incident update:', data);
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

  // Triggering a chaos experiment updates the entire reactive control plane and informs the backend
  const handleTriggerExperiment = async (exp: ChaosExperiment) => {
    setCurrentExperimentId(exp.id);

    // Call backend chaos injection API asynchronously
    try {
      ApiService.injectChaos(exp.id).catch((err) => {
        // Backend optional / offline fallback
        console.debug('Chaos API call finished:', err?.message || err);
      });
    } catch {
      // Offline fallback
    }

    const updatedIncident: ActiveIncidentState = {
      incidentId: `INC-2026-0824-${Math.floor(100 + Math.random() * 900)}`,
      title: `${exp.service.toUpperCase()} — ${exp.title}`,
      service: exp.service,
      severity: exp.severity,
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
  };

  // Selecting an alert in Card 3A syncs the scenario across all 6 dashboard modules
  const handleSelectAlertById = (experimentId: string) => {
    const matchedExp = chaosExperiments.find((e) => e.id === experimentId);
    if (matchedExp) {
      handleTriggerExperiment(matchedExp);
    }
  };

  const handleSelectService = (serviceId: string) => {
    const matchedExp = chaosExperiments.find(
      (e) => e.service === serviceId || (serviceId === 'checkout-service' && e.type === 'oom')
    );
    if (matchedExp) {
      handleTriggerExperiment(matchedExp);
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
                onSelectService={handleSelectService}
              />

              {/* Card 2: Chaos Lab */}
              <ChaosLab
                currentExperimentId={currentExperimentId}
                onTriggerExperiment={handleTriggerExperiment}
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
