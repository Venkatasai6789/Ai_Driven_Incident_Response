export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type PipelineStepStatus = 'completed' | 'active' | 'pending';

export interface PipelineStep {
  id: number;
  label: string;
  sublabel?: string;
  time?: string;
  timestamp?: string;
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
  active_incident_id?: string | null;
}

export interface TopologyEdge {
  from: string;
  to: string;
  status?: 'HEALTHY' | 'DEGRADED' | 'nominal' | 'active' | 'warning' | 'critical';
  latency_ms?: number;
  p99_ms?: number;
}

export interface TopologyMeshData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
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

export interface TelemetryAlertItem {
  id: string;
  incident_id?: string;
  incidentId?: string;
  experimentId: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  metric: string;
  timeAgo: string;
  status: 'ACTIVE' | 'FIRING' | 'RESOLVING' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  source?: string;
  created_at?: string;
  createdAt?: string;
}

export interface SystemOverviewData {
  cluster_health: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';
  slo_uptime_pct: number;
  active_incidents: {
    critical: number;
    high: number;
    degraded: number;
    total_unresolved: number;
  };
  inference_engine: {
    model: string;
    status: string;
    p99_latency_ms: number;
  };
  vector_index: {
    engine: string;
    index_type: string;
    total_runbooks: number;
    average_match_rate: number;
  };
}

export interface SLOMetricsData {
  time_range: string;
  mttr_avg_seconds: number;
  mttr_delta_pct: number;
  auto_resolve_pct: number;
  auto_resolve_delta_pct: number;
  incidents_resolved_count: number;
  triage_precision_pct: number;
  timeseries: Array<{
    time: string;
    mttr: number;
    accuracy: number;
    volume: number;
  }>;
}

export interface IncidentTriageData {
  incident_id: string;
  root_cause: string;
  confidence_score: number;
  sop_runbook: {
    id: string;
    title: string;
    cosine_similarity: number;
  };
  guardrail: {
    action_classification: string;
    requires_telegram_approval: boolean;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    blast_radius: string;
  };
  evidence_sources: string[];
}

export interface IncidentPipelineData {
  incident_id: string;
  current_step_index: number;
  steps: Array<{
    id: number;
    label: string;
    timestamp?: string;
    time?: string;
    sublabel?: string;
    status: 'completed' | 'active' | 'pending';
  }>;
  current_step_name: string;
  current_step_description: string;
  proposed_command: string;
  risk_level: 'LOW' | 'HIGH';
  category: 'SAFE' | 'DESTRUCTIVE';
  next_step_label: string;
  next_step_status: string;
}

export interface PostMortemData {
  incident_id: string;
  title: string;
  executive_summary: string;
  impact: {
    service: string;
    severity: string;
    duration: string;
    users_affected: string;
    availability_impact: string;
  };
  root_cause_analysis: string;
  terminal_output: string;
  timeline: Array<{
    time: string;
    event: string;
    source: string;
  }>;
  preventative_measures: string[];
  actionItems?: string[];
  action_items?: string[];
}

export interface ActiveIncidentState {
  incidentId: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  status?: 'OPEN' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'CLOSED' | 'NOMINAL';
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
