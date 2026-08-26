/**
 * Centralized API & WebSocket Service
 * Automatically reads API Base URL and WebSocket Base URL from environment variables.
 * In production on Vercel, set VITE_API_BASE_URL=https://your-backend.onrender.com
 */

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
    return apiRequest<{ status: string; timestamp?: string }>('/health');
  },

  // System Overview
  getSystemOverview: async () => {
    return apiRequest<any>('/api/v1/system/overview');
  },

  // Topology Mesh
  getTopologyMesh: async () => {
    return apiRequest<any>('/api/v1/topology/mesh');
  },

  // Inject Chaos Experiment
  injectChaos: async (experimentId: string) => {
    return apiRequest<any>('/api/v1/chaos/inject', {
      method: 'POST',
      body: JSON.stringify({ experiment_id: experimentId }),
    });
  },

  // Fetch Alerts
  getAlerts: async () => {
    return apiRequest<any[]>('/api/v1/alerts');
  },

  // Active Incident State
  getActiveIncident: async () => {
    return apiRequest<any>('/api/v1/incidents/active');
  },

  // Incident Pipeline Steps
  getIncidentPipeline: async (incidentId: string) => {
    return apiRequest<any>(`/api/v1/incidents/${incidentId}/pipeline`);
  },

  // Execute Remediation
  executeRemediation: async (incidentId: string) => {
    return apiRequest<any>(`/api/v1/incidents/${incidentId}/execute`, {
      method: 'POST',
    });
  },

  // SLO & MTTR Metrics
  getSLOMetrics: async () => {
    return apiRequest<any>('/api/v1/metrics/slo');
  },

  // Post-Mortem Dossier
  getPostMortem: async (incidentId: string) => {
    return apiRequest<any>(`/api/v1/incidents/${incidentId}/postmortem`);
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
