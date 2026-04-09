// API client for TokenScope backend
// Uses Clerk auth via the AuthProvider context

import { useAuthToken } from "./auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Hook-based request function for client components ───────────────────────
function useApi() {
  const { token } = useAuthToken();

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  return { request, token };
}

// ─── Export the hook for use in client components ───────────────────────────
export { useApi };

// ─── Standalone fetcher for simple cases (SSR/server) ───────────────────────
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Type exports ───────────────────────────────────────────────────────────

export interface ProxyKey {
  id: string;
  key_label: string;
  active: boolean;
  rate_limit: number;
  auto_enhance: boolean;
  created_at: string;
}

export interface ProxyKeyWithSecret extends ProxyKey {
  key: string;
}

export interface ProxyLog {
  id: string;
  provider: string;
  model: string;
  request_prompt: string;
  request_tokens: number;
  response_text: string | null;
  response_tokens: number;
  total_tokens: number;
  total_cost: number;
  latency_ms: number;
  status_code: number;
  error_message: string | null;
  enhancement_applied: boolean;
  enhanced_prompt: string | null;
  created_at: string;
}

export interface LogsResponse {
  logs: ProxyLog[];
  total: number;
  page: number;
  limit: number;
  total_spend: number;
  total_requests: number;
}

export interface LogsStats {
  total_requests: number;
  total_spend: number;
  avg_tokens_per_request: number;
  avg_latency_ms: number;
  success_rate: number;
  avg_cost_per_request: number;
  prompt_tokens_total: number;
  completion_tokens_total: number;
}

export interface LogsBreakdown {
  providers: Record<string, { tokens: number; cost: number; calls: number }>;
  models: Array<{ model: string; provider: string; tokens: number; cost: number; calls: number }>;
}

export interface ChartPoint {
  date: string;
  tokens: number;
  cost: number;
  provider: string;
  calls?: number;
}

export interface ApiKey {
  id: string;
  provider: string;
  key_label: string | null;
  key_last4: string;
  active: boolean;
  created_at: string;
  usage_count?: number;
  total_spent?: number;
}

export interface TokenScore {
  token: string;
  score: number;
  importance: "very_high" | "high" | "medium" | "low";
}

export interface AnalyzeResult {
  tokens: number;
  word_count: number;
  char_count: number;
  estimated_cost_input: number;
  estimated_cost_output: number;
  estimated_cost_total: number;
  token_scores: TokenScore[];
  top_important: TokenScore[];
}

export interface OptimizeResult {
  original: string;
  optimized: string;
  original_tokens: number;
  optimized_tokens: number;
  saved_tokens: number;
  saved_cost_input: number;
  saved_cost_output: number;
  saved_cost_total: number;
  kept_key_tokens: TokenScore[];
}
