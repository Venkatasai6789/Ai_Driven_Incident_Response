/**
 * Centralized API & WebSocket Service
 * Automatically reads API Base URL and WebSocket Base URL from environment variables.
 * In production on Vercel, set VITE_API_BASE_URL=https://your-backend.onrender.com
 */

import {
  SystemOverviewData,
  SLOMetricsData,
  IncidentTriageData,
  IncidentPipelineData,
  PostMortemData,
  TopologyMeshData,
  TelemetryAlertItem,
} from '../types';

// Helper to determine the API base URL
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, ''); // Strip trailing slashes
  }
  // Default to local backend during development
  return 'http://localhost:8000';
};

// Helper to determine the WebSocket base URL
export const getWsBaseUrl = (): string => {
  const envWs = import.meta.env.VITE_WS_BASE_URL;
  if (envWs && typeof envWs === 'string' && envWs.trim() !== '') {
    return envWs.replace(/\/+$/, '');
  }

  const httpUrl = getApiBaseUrl();
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace('https://', 'wss://');
  } else if (httpUrl.startsWith('http://')) {
    return httpUrl.replace('http://', 'ws://');
  }
  return 'ws://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();

/**
 * Generic API fetch wrapper with timeout and JSON parsing
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API Error [${response.status} ${response.statusText}]: ${errorText}`);
  }

  return response.json();
}

/**
 * Incident Response API Client
 */
export const ApiService = {
  // System Health
  checkHealth: async () => {
    return apiRequest<{ status: string; timestamp?: string; model?: string }>('/health');
  },

  // System Overview
  getSystemOverview: async () => {
    return apiRequest<SystemOverviewData>('/api/v1/system/overview');
  },

  // Topology Mesh
  getTopologyMesh: async () => {
    return apiRequest<TopologyMeshData>('/api/v1/topology/mesh');
  },

  // Inject Chaos Experiment
  injectChaos: async (experimentId: string, targetService?: string) => {
    return apiRequest<{
      success: boolean;
      incident_id: string;
      scenario: string;
      status: string;
      spawned_at: string;
      remediation_proposed?: any;
    }>('/api/v1/chaos/inject', {
      method: 'POST',
      body: JSON.stringify({
        experiment_id: experimentId,
        target_service: targetService,
        dry_run: true,
      }),
    });
  },

  // Fetch Alerts
  getAlerts: async (statusFilter?: string, limit: number = 10) => {
    const query = new URLSearchParams();
    if (statusFilter) query.append('status_filter', statusFilter);
    if (limit) query.append('limit', limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<TelemetryAlertItem[]>(`/api/v1/alerts${queryString}`);
  },

  // Active Incident State
  getActiveIncident: async () => {
    return apiRequest<{
      incident_id: string | null;
      title: string;
      service: string;
      severity: string;
      time_ago: string;
      description: string;
      confidence: number;
      sop_matched: string;
      duration: string;
      blast_radius: string;
      status: string;
    }>('/api/v1/incidents/active');
  },

  // Incident Triage Analysis
  getIncidentTriage: async (incidentId: string) => {
    return apiRequest<IncidentTriageData>(`/api/v1/incidents/${incidentId}/triage`);
  },

  // Incident Pipeline Steps
  getIncidentPipeline: async (incidentId: string) => {
    return apiRequest<IncidentPipelineData>(`/api/v1/incidents/${incidentId}/pipeline`);
  },

  // Execute Remediation
  executeRemediation: async (incidentId: string, operatorId?: string) => {
    return apiRequest<{
      success: boolean;
      incident_id: string;
      executed_command: string;
      operator_id: string;
      result: any;
      receipt: any;
    }>(`/api/v1/incidents/${incidentId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        override_approval: true,
        operator_id: operatorId || 'p.venkatsai333@gmail.com',
      }),
    });
  },

  // SLO & MTTR Metrics
  getSLOMetrics: async (range: string = '1h') => {
    return apiRequest<SLOMetricsData>(`/api/v1/metrics/slo?range=${encodeURIComponent(range)}`);
  },

  // Post-Mortem Dossier
  getPostMortem: async (incidentId: string) => {
    return apiRequest<PostMortemData>(`/api/v1/incidents/${incidentId}/postmortem`);
  },

  // Trigger Inbound Webhook Alert
  sendWebhookAlert: async (alertPayload: Record<string, any>) => {
    return apiRequest<any>('/webhook/alerts', {
      method: 'POST',
      body: JSON.stringify(alertPayload),
    });
  },

  /**
   * Connect to real-time events WebSocket stream
   */
  connectWebSocket: (
    onMessage: (data: any) => void,
    onStatusChange?: (connected: boolean) => void,
    onError?: (err: Event) => void
  ): { disconnect: () => void } => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isExplicitlyClosed = false;

    const connect = () => {
      try {
        const wsUrl = `${getWsBaseUrl()}/api/v1/ws/events`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (onStatusChange) onStatusChange(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (err) {
            console.error('Failed to parse WebSocket JSON:', err);
          }
        };

        ws.onerror = (err) => {
          if (onError) onError(err);
        };

        ws.onclose = () => {
          if (onStatusChange) onStatusChange(false);
          if (!isExplicitlyClosed) {
            // Auto-reconnect after 3 seconds
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (e) {
        console.error('WebSocket connection initialization error:', e);
        if (onStatusChange) onStatusChange(false);
        if (!isExplicitlyClosed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return {
      disconnect: () => {
        isExplicitlyClosed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws) {
          ws.close();
        }
      },
    };
  },
};

