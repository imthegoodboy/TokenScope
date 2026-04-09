import { auth } from '@clerk/nextjs/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function getUserId(): Promise<string> {
  try {
    const { userId } = await auth();
    return userId || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const userId = await getUserId();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const api = {
  keys: {
    list: () => request<any[]>('/keys'),
    create: (data: any) => request<any>('/keys', { method: 'POST', body: data }),
    get: (proxyId: string) => request<any>(`/keys/${proxyId}`),
    update: (proxyId: string, data: any) => request<any>(`/keys/${proxyId}`, { method: 'PUT', body: data }),
    delete: (proxyId: string) => request<any>(`/keys/${proxyId}`, { method: 'DELETE' }),
  },

  proxy: {
    request: (proxyId: string, data: any) =>
      request<any>(`/proxy/${proxyId}`, { method: 'POST', body: data }),
  },

  stats: {
    overview: () => request<any>('/stats/overview'),
    daily: (days?: number) => request<any>(`/stats/daily?days=${days || 7}`),
    byModel: () => request<any>('/stats/by-model'),
    recent: (limit?: number) => request<any>(`/stats/recent?limit=${limit || 50}`),
  },

  logs: {
    stream: (proxyId?: string) => {
      const url = proxyId
        ? `${API_BASE}/logs/stream?proxy_id=${proxyId}`
        : `${API_BASE}/logs/stream`;
      return new EventSource(url);
    },
    getForProxy: (proxyId: string) => request<any[]>(`/logs/${proxyId}`),
  },

  usage: {
    summary: () => request<any>('/usage/summary'),
    history: (days?: number) => request<any>(`/usage/history?days=${days || 30}`),
  },

  analyzer: {
    analyze: (prompt: string, targetModel?: string) =>
      request<any>('/analyze', { method: 'POST', body: { prompt, target_model: targetModel } }),
    enhance: (prompt: string, targetModel?: string) =>
      request<any>('/enhance', { method: 'POST', body: { prompt, target_model: targetModel } }),
  },

  extension: {
    saveOptimization: (data: {
      user_id: string;
      original_prompt: string;
      optimized_prompt: string;
      original_tokens: number;
      optimized_tokens: number;
      tokens_saved: number;
      cost_saved: number;
      target_model: string;
      source: string;
    }) => request<any>('/extension/save-optimization', { method: 'POST', body: data }),

    getStats: (userId: string) => request<any>(`/extension/stats/${userId}`),
    getHistory: (userId: string, limit?: number) =>
      request<any>(`/extension/history/${userId}?limit=${limit || 50}`),
    getDashboardStats: (userId: string) => request<any>(`/extension/dashboard-stats/${userId}`),
  },
};

export default api;
