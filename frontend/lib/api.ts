const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = await getClerkToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

async function getClerkToken(): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/ssr.server.js");
    const { getAuth } = await import("@clerk/nextjs");
    // In client components we'll use useAuth hook instead
    return null;
  } catch {
    return null;
  }
}

// ─── Usage ───────────────────────────────────────────────────────────────────

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

export interface UsageSummary {
  total_spend: number;
  total_tokens: number;
  total_calls: number;
  avg_cost_per_call: number;
  active_keys: number;
  provider_breakdown: Record<string, { tokens: number; cost: number; calls: number }>;
  model_breakdown: Array<{ model: string; tokens: number; cost: number; calls: number }>;
  chart_data: Array<{ date: string; tokens: number; cost: number; provider: string }>;
  recent_calls: UsageRecord[];
}

export async function trackUsage(data: {
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  prompt_text?: string;
  response_text?: string;
}) {
  return request("/api/v1/usage/track", { method: "POST", body: data });
}

export async function getUsageSummary(): Promise<UsageSummary> {
  return request("/api/v1/usage/summary");
}

export async function getUsageHistory(params?: {
  page?: number;
  limit?: number;
  provider?: string;
  model?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ records: UsageRecord[]; total: number }> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request(`/api/v1/usage/history${qs ? `?${qs}` : ""}`);
}

export async function getChartData(params?: {
  period?: "7d" | "30d" | "90d";
}): Promise<UsageSummary["chart_data"]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request(`/api/v1/usage/chart-data${qs ? `?${qs}` : ""}`);
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  provider: string;
  key_label: string;
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
  return request(`/api/v1/keys/${id}`, { method: "DELETE" });
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

export interface TokenScore {
  token: string;
  score: number;
  importance: "high" | "medium" | "low";
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

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getRealtimeStats(): Promise<{
  tokens_today: number;
  cost_today: number;
  calls_today: number;
}> {
  return request("/api/v1/stats/realtime");
}
