import { ChaosExperiment, ActiveIncidentState } from '../types';

export const defaultOOMIncident: ActiveIncidentState = {
  incidentId: 'INC-2026-0824-001',
  title: 'Checkout Service — V8 Heap Exhaustion',
  service: 'checkout-service',
  severity: 'CRITICAL',
  status: 'OPEN',
  timeAgo: '2m ago',
  description: 'Node.js V8 memory allocator reached 98.4% limit during order batch processing.',
  confidence: 96.8,
  sopMatched: 'SOP-101 (Container Lifecycle)',
  duration: '1.4s',
  blastRadius: '1 Service · Isolated Pod',
  currentStepIndex: 3, // Step 4: Guardrail Check (0-indexed: 3)
  steps: [
    { id: 1, label: 'Telemetry Ingest', sublabel: '11:24:03', time: '11:24:03', status: 'completed' },
    { id: 2, label: 'Vector Runbook', sublabel: '11:24:04', time: '11:24:04', status: 'completed' },
    { id: 3, label: 'Root Diagnostics', sublabel: '11:24:05', time: '11:24:05', status: 'completed' },
    { id: 4, label: 'Safety Guardrail', sublabel: '11:24:06', time: '11:24:06', status: 'active' },
    { id: 5, label: 'Rolling Remediation', sublabel: 'Pending', time: 'Pending', status: 'pending' },
    { id: 6, label: 'Health Verification', sublabel: 'Pending', time: 'Pending', status: 'pending' },
  ],
  currentStepName: 'Deterministic Safety Guardrail Policy',
  currentStepDescription: 'Verifying proposed container restart command against zero-blast-radius execution policies...',
  proposedCommand: 'kubectl rollout restart deployment/checkout-service -n production',
  riskLevel: 'LOW',
  category: 'SAFE',
  nextStepLabel: 'Execute Graceful Rolling Restart',
  nextStepStatus: 'Automated Authorization Granted',
  rootCause: 'Unbounded buffer accumulation in batch worker thread',
  recommendedAction: 'Execute graceful rolling pod drain & recycle worker container',
  evidenceSources: 'Prometheus Heap Metrics, Envoy 503 Logs, SOP-101 Embeddings',
  terminalOutput: `$ kubectl rollout restart deployment/checkout-service -n production
deployment.apps/checkout-service restarted
✓ Exit Code: 0 (Success)
✓ Rolling replacement: 3/3 pods healthy
✓ Latency normalized: p99 18ms`,
  timeline: [
    { time: '11:24:03', event: 'Heap allocation breached 98% threshold on pod checkout-service-7f9b8c-x2q', source: 'Prometheus' },
    { time: '11:24:04', event: 'Vector runbook matched SOP-101 (Cosine Similarity: 0.948)', source: 'pgvector' },
    { time: '11:24:05', event: 'AI root cause verified: worker buffer allocation leak', source: 'Gemini SRE' },
    { time: '11:24:06', event: 'Safety guardrail passed: zero-downtime rolling restart approved', source: 'Policy Engine' },
    { time: '11:24:07', event: 'Kubernetes deployment rolling restart dispatched', source: 'Kubelet Executor' },
    { time: '11:24:08', event: 'Synthetic probe test returned HTTP 200 OK (p99: 14ms)', source: 'Health Probe' },
  ],
  postMortem: {
    executiveSummary: 'V8 heap memory exhaustion in checkout-service caused transient worker unresponsive states. The automated SRE engine detected, matched runbook SOP-101, validated safety guardrails, and initiated a zero-downtime rolling restart in 1.4 seconds.',
    impact: {
      service: 'checkout-service',
      severity: 'CRITICAL',
      duration: '1.4s',
      usersAffected: '0 dropped sessions (graceful drain)',
      availabilityImpact: '< 0.01%',
    },
    rootCauseAnalysis: 'A stream buffer retain cycle in the JSON deserializer prevented Garbage Collection during concurrent bulk order operations, accumulating 1.2GB of uncollected buffers.',
    preventativeMeasures: [
      'Set explicit V8 memory ceiling with --max-old-space-size=2048',
      'Deploy stream transformer backpressure in batch checkout pipeline',
      'Configure auto-heap snapshot trigger on Prometheus 85% memory threshold',
    ],
    actionItems: [
      'Merge PR #842: stream buffer lifecycle fix in worker module',
      'Update canary validation thresholds in deployment pipeline',
      'Audit upstream payment payload serialization',
    ],
  },
};

export const resolvedIncidentState: ActiveIncidentState = {
  incidentId: 'INC-NOMINAL-000',
  title: 'All Cluster Services Operational — 0 Errors',
  service: 'api-gateway',
  severity: 'LOW',
  status: 'CLOSED',
  timeAgo: 'Live',
  description: 'Envoy service mesh and all microservices operating smoothly within nominal SLO boundaries.',
  confidence: 100,
  sopMatched: 'SOP-000 (Nominal Health Baseline)',
  duration: '0.0s',
  blastRadius: '0 Services Affected',
  currentStepIndex: 5,
  steps: [
    { id: 1, label: 'Telemetry Ingest', sublabel: '0 Errors', time: 'Active', status: 'completed' },
    { id: 2, label: 'Vector Runbook', sublabel: 'Synchronized', time: 'Active', status: 'completed' },
    { id: 3, label: 'Root Diagnostics', sublabel: 'Nominal', time: 'Active', status: 'completed' },
    { id: 4, label: 'Safety Guardrail', sublabel: 'Enforced', time: 'Active', status: 'completed' },
    { id: 5, label: 'Rolling Remediation', sublabel: 'Idle', time: 'Active', status: 'completed' },
    { id: 6, label: 'Health Verification', sublabel: '100% Healthy', time: 'Active', status: 'completed' },
  ],
  currentStepName: 'Continuous SRE Health Monitoring',
  currentStepDescription: 'Zero active alerts detected across Prometheus, Datadog, Grafana and webhook feeds.',
  proposedCommand: 'kubectl get pods -A --field-selector=status.phase=Running',
  riskLevel: 'LOW',
  category: 'SAFE',
  nextStepLabel: 'Monitoring Nominal Baseline',
  nextStepStatus: 'All Systems Nominal',
  rootCause: 'No active anomalies or threshold breaches.',
  recommendedAction: 'Maintain current production workload distribution.',
  evidenceSources: 'Prometheus eBPF, Envoy Mesh Telemetry',
  terminalOutput: `$ kubectl get pods -n production
NAME                                READY   STATUS    RESTARTS   AGE
checkout-service-7f9b8c-9b1         1/1     Running   0          42m
checkout-service-7f9b8c-k4m         1/1     Running   0          42m
checkout-service-7f9b8c-x2q         1/1     Running   0          18s
postgresql-primary-0                1/1     Running   0          3d
api-gateway-envoy-749c99            1/1     Running   0          5d
✓ All 18 pods healthy (p99 latency: 14ms)`,
  timeline: [
    { time: '11:24:08', event: 'Health probes verified 100% healthy baseline', source: 'Health Probe' },
    { time: '11:24:07', event: 'Rolling pod replacement completed successfully', source: 'Kubelet' },
    { time: '11:24:06', event: 'Safety guardrails verified 0 blast radius', source: 'Policy Engine' },
  ],
  postMortem: {
    executiveSummary: 'All production services are running nominally with 0 critical incidents and 100% SLO availability.',
    impact: {
      service: 'All Core Services',
      severity: 'LOW',
      duration: '0s',
      usersAffected: '0 (100% Availability)',
      availabilityImpact: '0.0%',
    },
    rootCauseAnalysis: 'System in nominal operating baseline.',
    preventativeMeasures: [
      'Continuous eBPF telemetry streaming enabled',
      'Automated proactive scaling policies active',
    ],
    actionItems: [
      'Baseline performance benchmarks met across all clusters',
    ],
  },
};

export const chaosExperiments: ChaosExperiment[] = [
  {
    id: 'exp-oom',
    title: 'Heap Exhaustion',
    sop: 'SOP-101',
    sopMatchRate: '94.8%',
    type: 'oom',
    service: 'checkout-service',
    severity: 'CRITICAL',
    description: 'Node.js V8 memory allocator reached 98.4% limit during order batch processing.',
    rootCause: 'Unbounded buffer accumulation in batch worker thread',
    confidence: 96.8,
    blastRadius: 'checkout-service (1 Pod)',
    recommendedAction: 'Execute graceful rolling pod drain & recycle worker container',
    evidenceSources: 'Prometheus Heap Metrics, Envoy 503 Logs, SOP-101 Embeddings',
    command: 'kubectl rollout restart deployment/checkout-service -n production',
    riskLevel: 'LOW',
    category: 'SAFE',
    nextStep: 'Execute Graceful Rolling Restart',
    timeline: [
      { time: '11:24:03', event: 'Heap allocation breached 98% threshold on pod checkout-service-7f9b8c', source: 'Prometheus' },
      { time: '11:24:04', event: 'Vector runbook matched SOP-101 (Cosine: 0.948)', source: 'pgvector' },
      { time: '11:24:05', event: 'Root cause verified: worker buffer retain cycle', source: 'Gemini SRE' },
      { time: '11:24:06', event: 'Safety guardrail approved rolling restart', source: 'Policy Engine' },
      { time: '11:24:07', event: 'Kubernetes rolling replacement initiated', source: 'Kubelet' },
      { time: '11:24:08', event: 'Synthetic probe returned HTTP 200 OK (14ms)', source: 'Probe Agent' },
    ],
    terminalOutput: `$ kubectl rollout restart deployment/checkout-service -n production
deployment.apps/checkout-service restarted
✓ Exit Code: 0 (Success)
✓ Runtime: 142ms
✓ Rolling pods: 3/3 ready`,
    postMortem: {
      executiveSummary: 'V8 heap memory exhaustion in checkout-service resolved autonomously via rolling container replacement in 1.4s.',
      impact: {
        service: 'checkout-service',
        severity: 'CRITICAL',
        duration: '1.4s',
        usersAffected: '0 dropped requests',
        availabilityImpact: '< 0.01%',
      },
      rootCauseAnalysis: 'Uncollected deserialization buffers accumulated in long-lived Node.js worker event loop.',
      preventativeMeasures: [
        'Set explicit V8 memory ceiling with --max-old-space-size=2048',
        'Enable backpressure streaming on batch checkout endpoints',
      ],
      actionItems: [
        'Deploy stream memory fix in worker payload parser',
      ],
    },
  },
  {
    id: 'exp-db',
    title: 'DB Pool Saturation',
    sop: 'SOP-202',
    sopMatchRate: '96.2%',
    type: 'db',
    service: 'postgresql',
    severity: 'HIGH',
    description: 'PostgreSQL connection pool reached 96% client socket utilization.',
    rootCause: 'Stale idle client sockets retained without active query execution',
    confidence: 98.1,
    blastRadius: 'postgresql (Database Proxy)',
    recommendedAction: 'Flush idle pool connections and reset keepalive handles',
    evidenceSources: 'PgBouncer Metrics, Client Socket Audit, SOP-202 Embeddings',
    command: 'pgbouncer-cli reload && pgbouncer-cli kill_idle',
    riskLevel: 'LOW',
    category: 'SAFE',
    nextStep: 'Flush Idle Pool Handles',
    timeline: [
      { time: '11:20:10', event: 'Connection pool saturation alert (>95% active)', source: 'Prometheus' },
      { time: '11:20:11', event: 'Vector search retrieved SOP-202 (Similarity: 0.962)', source: 'pgvector' },
      { time: '11:20:12', event: 'Diagnostics detected 48 zombie client sockets', source: 'Gemini SRE' },
      { time: '11:20:13', event: 'Safety gate validated non-destructive pool prune', source: 'Policy Engine' },
      { time: '11:20:14', event: 'PgBouncer idle socket sweep completed', source: 'PgBouncer' },
      { time: '11:20:15', event: 'Database pool capacity normalized to 24% utilized', source: 'Probe Agent' },
    ],
    terminalOutput: `$ pgbouncer-cli kill_idle
✓ Exit Code: 0 (Success)
✓ Purged 48 stale idle connections
✓ Pool capacity restored to 76% headroom`,
    postMortem: {
      executiveSummary: 'PostgreSQL connection pool exhaustion mitigated by automated idle socket purging, restoring database throughput in 1.1s.',
      impact: {
        service: 'postgresql',
        severity: 'HIGH',
        duration: '1.1s',
        usersAffected: 'None (connections transparently queued)',
        availabilityImpact: '0.0%',
      },
      rootCauseAnalysis: 'Legacy client service omitted connection release in exception handling blocks, leaking idle handles into the proxy pool.',
      preventativeMeasures: [
        'Enforce server-side idle_in_transaction_session_timeout=5000',
        'Configure PgBouncer client socket TCP keepalive probes',
      ],
      actionItems: [
        'Audit ORM pool lifecycle management in microservice clients',
      ],
    },
  },
  {
    id: 'exp-disk',
    title: 'Disk Volume Spike',
    sop: 'SOP-303',
    sopMatchRate: '94.5%',
    type: 'disk',
    service: 'logging-service',
    severity: 'MEDIUM',
    description: 'Volume /var/log/audit reached 92% capacity threshold.',
    rootCause: 'Uncompressed trace logs accumulated during load testing window',
    confidence: 97.4,
    blastRadius: 'logging-service (Node Volume)',
    recommendedAction: 'Trigger immediate log rotation, gzip archive, and S3 sync',
    evidenceSources: 'Disk Storage Telemetry, Node Exporter, SOP-303 Runbook',
    command: 'logrotate -f /etc/logrotate.d/audit-logs && find /var/log/app -name "*.gz" -mtime +7 -delete',
    riskLevel: 'LOW',
    category: 'SAFE',
    nextStep: 'Execute Log Compression & Archival',
    timeline: [
      { time: '11:15:00', event: 'Disk space warning on /var/log (>90%)', source: 'Disk Watcher' },
      { time: '11:15:01', event: 'SOP-303 matched with 94.5% semantic confidence', source: 'pgvector' },
      { time: '11:15:02', event: 'Identified 14.2GB of uncompressed debug traces', source: 'Gemini SRE' },
      { time: '11:15:03', event: 'Safety gate validated non-live archive paths', source: 'Policy Engine' },
      { time: '11:15:04', event: 'Executed forced logrotate with gzip compression', source: 'Executor' },
      { time: '11:15:05', event: 'Disk utilization dropped from 92% to 38%', source: 'Probe Agent' },
    ],
    terminalOutput: `$ logrotate -f /etc/logrotate.d/audit-logs
✓ Exit Code: 0 (Success)
✓ Reclaimed space: 14.2 GB
✓ Current disk utilization: 38.4%`,
    postMortem: {
      executiveSummary: 'Log volume threshold breach resolved autonomously by forced compression and cold storage tiering in 1.2s.',
      impact: {
        service: 'logging-service',
        severity: 'MEDIUM',
        duration: '1.2s',
        usersAffected: 'None',
        availabilityImpact: '0.0%',
      },
      rootCauseAnalysis: 'Audit telemetry verbosity level remained set to DEBUG following staging load tests.',
      preventativeMeasures: [
        'Automate dynamic log level adjustment via environment ConfigMap',
        'Configure cron-based rolling hourly log compression daemon',
      ],
      actionItems: [
        'Verify production cluster default log levels across all namespaces',
      ],
    },
  },
  {
    id: 'exp-security',
    title: 'Adversarial Ingress',
    sop: 'WAF Guard',
    sopMatchRate: '99.2%',
    type: 'security',
    service: 'api-gateway',
    severity: 'HIGH',
    description: 'Adversarial SQL injection and header bypass payload detected at edge ingress.',
    rootCause: 'Malicious scanning cluster targeting public /api/v2 gateway route',
    confidence: 99.6,
    blastRadius: 'API Gateway (Edge Ingress)',
    recommendedAction: 'Isolate source CIDR block & update edge WAF rate-limiting rule',
    evidenceSources: 'Cloudflare WAF Logs, Semantic Payload Classifier (4)',
    command: 'cloudflare-cli firewall rules create --action block --filter "ip.src in {198.51.100.0/24}"',
    riskLevel: 'LOW',
    category: 'SAFE',
    nextStep: 'Deploy Edge Firewall Rule',
    timeline: [
      { time: '11:10:00', event: 'Anomaly signature flagged on edge API route', source: 'Edge WAF' },
      { time: '11:10:01', event: 'Security rule matched (99.2% classification accuracy)', source: 'Guardrails' },
      { time: '11:10:02', event: 'Identified malicious botnet CIDR 198.51.100.0/24', source: 'Gemini SRE' },
      { time: '11:10:03', event: 'Safety gate validated edge isolation policy', source: 'Policy Engine' },
      { time: '11:10:04', event: 'Edge firewall rule propagated globally in 240ms', source: 'Cloudflare' },
      { time: '11:10:05', event: 'Zero unauthorized requests penetrated internal mesh', source: 'Probe Agent' },
    ],
    terminalOutput: `$ cloudflare-cli firewall rules create --action block --filter "ip.src in {198.51.100.0/24}"
✓ Exit Code: 0 (Success)
✓ Rule ID: rule_8f92a10b deployed
✓ Propagated to 280+ edge POPs globally`,
    postMortem: {
      executiveSummary: 'Adversarial ingress payload intercepted at edge proxy and quarantined by automated WAF rule synthesis in 0.8s.',
      impact: {
        service: 'api-gateway',
        severity: 'HIGH',
        duration: '0.8s',
        usersAffected: 'None (blocked at edge)',
        availabilityImpact: '0.0%',
      },
      rootCauseAnalysis: 'Distributed scanning botnet probed authorization endpoints with SQL injection fragments.',
      preventativeMeasures: [
        'Deploy strict schema validation filters on all edge ingress endpoints',
        'Enable automated IP reputation scoring and honeypot traps',
      ],
      actionItems: [
        'Add CIDR threat intelligence feed into centralized SIEM pipeline',
      ],
    },
  },
  {
    id: 'exp-rag',
    title: 'Uncataloged Anomaly',
    sop: 'Out-of-Domain',
    sopMatchRate: '24.1%',
    type: 'rag',
    service: 'user-service',
    severity: 'LOW',
    description: 'Uncataloged upstream payment gateway timeout returned non-standard error code.',
    rootCause: 'Low semantic similarity on retrieved runbooks (<0.35 match threshold)',
    confidence: 91.5,
    blastRadius: 'user-service (Zero Mutation Safe Mode)',
    recommendedAction: 'Safely halt auto-remediation and page Primary On-Call Engineer',
    evidenceSources: 'pgvector Cosine Scores, Ingested Runbook Embeddings (4)',
    command: 'pagerduty-cli trigger --service user-service --summary "Low RAG similarity (0.24) - Human review required"',
    riskLevel: 'LOW',
    category: 'SAFE',
    nextStep: 'Escalate to On-Call SRE Engineer',
    timeline: [
      { time: '11:05:00', event: 'Unrecognized error string received from upstream API', source: 'Ingestor' },
      { time: '11:05:01', event: 'Runbook vector query scored 24.1% (below 70% threshold)', source: 'pgvector' },
      { time: '11:05:02', event: 'AI engine flagged uncataloged anomaly for human safety', source: 'Gemini SRE' },
      { time: '11:05:03', event: 'Guardrail prevented destructive autonomous changes', source: 'Policy Engine' },
      { time: '11:05:04', event: 'PagerDuty incident #9412 dispatched to on-call SRE', source: 'PagerDuty' },
      { time: '11:05:05', event: 'Cluster state preserved in safe standby mode', source: 'Probe Agent' },
    ],
    terminalOutput: `$ pagerduty-cli trigger --service user-service --summary "Low RAG similarity (0.24)"
✓ Exit Code: 0 (Success)
✓ Incident #9412 dispatched to Primary SRE (Shift: APAC Lead)
✓ Autonomous guardrail prevented unverified state mutation`,
    postMortem: {
      executiveSummary: 'Strict safety guardrail prevented hallucinated remediation for an uncataloged upstream anomaly, escalating cleanly to human on-call in 0.9s.',
      impact: {
        service: 'user-service',
        severity: 'LOW',
        duration: '0.9s',
        usersAffected: 'None',
        availabilityImpact: '0.0%',
      },
      rootCauseAnalysis: 'Third-party banking aggregator deployed an undocumented error code payload without prior schema notice.',
      preventativeMeasures: [
        'Ingest updated partner integration specifications into pgvector runbook index',
        'Add fallback SOP-404 for third-party upstream aggregator degradation',
      ],
      actionItems: [
        'Schedule runbook review session with Core Platform Infrastructure team',
      ],
    },
  },
];
