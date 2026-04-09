const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Client-side: get Clerk session token using the standard approach
let _clientToken: string | null = null;
let _tokenPromise: Promise<string | null> | null = null;

export async function getClientToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (_clientToken) return _clientToken;
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = (async () => {
    try {
      const mod = await import("@clerk/nextjs/auth");
      const token = await mod.getToken();
      _clientToken = token;
      return token;
    } catch {
      _tokenPromise = null;
      return null;
    }
  })();

  return _tokenPromise;
}

export function clearClientToken(): void {
  _clientToken = null;
  _tokenPromise = null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  // Get Clerk token automatically
  const clerkToken = await getClientToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Proxy Keys ────────────────────────────────────────────────────────────────

export interface ProxyKey {
  id: string;
  key_label: string;
  active: boolean;
  rate_limit: number;
  auto_enhance: boolean;
  created_at: string;
}

export interface ProxyKeyWithSecret extends ProxyKey {
  key: string; // raw proxy key (only shown once)
}

export async function listProxyKeys(): Promise<ProxyKey[]> {
  return request("/api/v1/proxy-keys/");
}

export async function createProxyKey(label: string): Promise<ProxyKeyWithSecret> {
  return request("/api/v1/proxy-keys/", {
    method: "POST",
    body: { label },
  });
}

export async function deleteProxyKey(keyId: string): Promise<void> {
  await request(`/api/v1/proxy-keys/${keyId}`, { method: "DELETE" });
}

export async function toggleProxyEnhance(
  keyId: string,
  enabled: boolean,
): Promise<{ auto_enhance: boolean }> {
  return request(`/api/v1/proxy-keys/${keyId}/toggle-enhance?enabled=${enabled}`, {
    method: "PATCH",
  });
}

// ─── Logs ────────────────────────────────────────────────────────────────────

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

export async function getLogs(params?: {
  page?: number;
  limit?: number;
  provider?: string;
  model?: string;
  search?: string;
}): Promise<LogsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.provider) qs.set("provider", params.provider);
  if (params?.model) qs.set("model", params.model);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return request(`/api/v1/logs/${query ? `?${query}` : ""}`);
}

export async function getLogsStats(): Promise<LogsStats> {
  return request("/api/v1/logs/stats");
}

export async function getLogsBreakdown(): Promise<LogsBreakdown> {
  return request("/api/v1/logs/breakdown");
}

export async function getLogsChart(period: "7d" | "14d" | "30d" = "14d"): Promise<ChartPoint[]> {
  return request(`/api/v1/logs/chart?period=${period}`);
}

// ─── API Keys ────────────────────────────────────────────────────────────────

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

export async function listApiKeys(): Promise<ApiKey[]> {
  return request("/api/v1/keys/");
}

export async function addApiKey(data: {
  provider: string;
  api_key: string;
  key_label?: string;
}): Promise<ApiKey> {
  return request("/api/v1/keys/", { method: "POST", body: data });
}

export async function deleteApiKey(id: string): Promise<void> {
  await request(`/api/v1/keys/${id}`, { method: "DELETE" });
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

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

export async function analyzePrompt(data: {
  prompt: string;
  model: string;
  provider: string;
}): Promise<AnalyzeResult> {
  return request("/api/v1/analyze/prompt", { method: "POST", body: data });
}

export async function optimizePrompt(data: {
  prompt: string;
  model: string;
  provider: string;
  target_tokens?: number;
}): Promise<OptimizeResult> {
  return request("/api/v1/analyze/optimize", { method: "POST", body: data });
}

// ─── Usage ──────────────────────────────────────────────────────────────────

export interface UsageRecord {
  id: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
  prompt_text?: string;
  response_text?: string;
}

export async function getUsageSummary() {
  return request("/api/v1/usage/summary");
}

export async function getUsageHistory(params?: {
  page?: number;
  limit?: number;
  provider?: string;
  model?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.provider) qs.set("provider", params.provider);
  if (params?.model) qs.set("model", params.model);
  const query = qs.toString();
  return request(`/api/v1/usage/history${query ? `?${query}` : ""}`);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export async function getRealtimeStats() {
  return request("/api/v1/stats/realtime");
}
