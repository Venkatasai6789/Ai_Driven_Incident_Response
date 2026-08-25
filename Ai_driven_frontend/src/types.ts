export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type PipelineStepStatus = 'completed' | 'active' | 'pending';

export interface PipelineStep {
  id: number;
  label: string;
  sublabel?: string;
  time?: string;
  status: PipelineStepStatus;
}

export interface ServiceNodeData {
  id: string;
  name: string;
  status: 'Healthy' | 'CRITICAL' | 'Warning' | 'DEGRADED';
  latency?: string;
  metrics?: string;
  icon: string;
  x: number;
  y: number;
  isIncident?: boolean;
}

export interface TopologyNode {
  id: string;
  name: string;
  role?: string;
  status?: 'NOMINAL' | 'CRITICAL' | 'DEGRADED' | 'WARNING' | 'HEALTHY' | 'ACTIVE';
  latency_ms?: number;
  throughput?: string;
  errorRate?: string;
  resourceUsage?: string;
  protocol?: string;
}

export interface TopologyEdge {
  from: string;
  to: string;
  status?: 'nominal' | 'active' | 'warning' | 'critical';
  latency_ms?: number;
}

export interface AlertItem {
  id: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  timeAgo: string;
}

export interface ChaosExperiment {
  id: string;
  title: string;
  sop: string;
  sopMatchRate: string;
  type: 'oom' | 'db' | 'disk' | 'security' | 'rag';
  service: string;
  severity: IncidentSeverity;
  description: string;
  rootCause: string;
  confidence: number;
  blastRadius: string;
  recommendedAction: string;
  evidenceSources: string;
  command: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'SAFE' | 'DESTRUCTIVE' | 'MANUAL';
  nextStep: string;
  timeline: Array<{
    time: string;
    event: string;
    source: string;
  }>;
  terminalOutput: string;
  postMortem: {
    executiveSummary: string;
    impact: {
      service: string;
      severity: string;
      duration: string;
      usersAffected: string;
      availabilityImpact: string;
    };
    rootCauseAnalysis: string;
    preventativeMeasures: string[];
    actionItems: string[];
  };
}

export interface ActiveIncidentState {
  incidentId: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  timeAgo: string;
  description: string;
  confidence: number;
  sopMatched: string;
  duration: string;
  blastRadius: string;
  currentStepIndex: number;
  steps: PipelineStep[];
  currentStepName: string;
  currentStepDescription: string;
  proposedCommand: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'SAFE' | 'DESTRUCTIVE';
  nextStepLabel: string;
  nextStepStatus: string;
  rootCause: string;
  recommendedAction: string;
  evidenceSources: string;
  terminalOutput: string;
  timeline: Array<{
    time: string;
    event: string;
    source: string;
  }>;
  postMortem: {
    executiveSummary: string;
    impact: {
      service: string;
      severity: string;
      duration: string;
      usersAffected: string;
      availabilityImpact: string;
    };
    rootCauseAnalysis: string;
    preventativeMeasures: string[];
    actionItems: string[];
  };
}
