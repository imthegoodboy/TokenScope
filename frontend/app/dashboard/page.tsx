"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import dynamic from "next/dynamic";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageTable } from "@/components/dashboard/usage-table";
import { CostLineChart } from "@/components/charts/cost-line-chart";
import { ProviderPie } from "@/components/charts/provider-pie";
import { ContributionGraph } from "@/components/charts/contribution-graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import {
  DollarSign, Cpu, Zap, Clock, Activity, RefreshCw, Plus,
  Copy, Check, Wand2, ChevronDown, ChevronRight, Terminal,
  AlertCircle, CheckCircle2, Settings, Loader2, Globe,
  Trash2, Key, ArrowRight, X, Search, Filter,
} from "lucide-react";
import {
  useApi,
  type LogsStats,
  type LogsBreakdown,
  type ChartPoint,
  type ProxyLog,
  type ProxyKey,
  type ApiKey,
} from "@/lib/api";

const Usage3DChart = dynamic(
  () => import("@/components/charts/usage-3d-chart").then((m) => m.Usage3DChart),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-lg" /> }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#F07F3C",
  anthropic: "#16563B",
  gemini: "#002F4B",
};

function StatusBadge({ code }: { code: number }) {
  if (code >= 200 && code < 300) return <Badge variant="success" className="gap-1"><CheckCircle2 size={9} /> {code}</Badge>;
  if (code >= 400) return <Badge variant="danger" className="gap-1"><AlertCircle size={9} /> {code}</Badge>;
  return <Badge variant="warning" className="gap-1"><Clock size={9} /> {code}</Badge>;
}

export default function DashboardPage() {
  const { request } = useApi();

  // ── Setup state ──
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [proxyKeys, setProxyKeys] = useState<ProxyKey[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupProvider, setSetupProvider] = useState("openai");
  const [setupApiKey, setSetupApiKey] = useState("");
  const [setupLabel, setSetupLabel] = useState("");
  const [setupModel, setSetupModel] = useState("gpt-4o");
  const [setupTemp, setSetupTemp] = useState(0.7);
  const [setupMaxTokens, setSetupMaxTokens] = useState(2048);
  const [setupRateLimit, setSetupRateLimit] = useState(60);
  const [setupAutoEnhance, setSetupAutoEnhance] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [newProxyKey, setNewProxyKey] = useState<{ key: string; label: string } | null>(null);

  // ── Dashboard state ──
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [breakdown, setBreakdown] = useState<LogsBreakdown | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [logs, setLogs] = useState<ProxyLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logProvider, setLogProvider] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "14d" | "30d">("14d");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Copy helper ──
  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Load everything ──
  const loadData = useCallback(async () => {
    try {
      const [keysRes, proxyRes, statsRes, breakdownRes, chartRes, logsRes] = await Promise.all([
        request<ApiKey[]>("/api/v1/keys/"),
        request<ProxyKey[]>("/api/v1/proxy-keys/"),
        request<LogsStats>("/api/v1/logs/stats"),
        request<LogsBreakdown>("/api/v1/logs/breakdown"),
        request<ChartPoint[]>(`/api/v1/logs/chart?period=${chartPeriod}`),
        request<{ logs: ProxyLog[]; total: number }>(`/api/v1/logs/?limit=20&page=${logsPage}${logProvider ? `&provider=${logProvider}` : ""}${logSearch ? `&search=${logSearch}` : ""}`),
      ]);
      setApiKeys(keysRes);
      setProxyKeys(proxyRes);
      setStats(statsRes);
      setBreakdown(breakdownRes);
      setChartData(chartRes);
      setLogs(logsRes.logs);
      setLogsTotal(logsRes.total);

      // Auto-show setup if no proxy keys
      if (proxyRes.length === 0) setShowSetup(true);
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setLoading(false);
    }
  }, [request, chartPeriod, logsPage, logProvider, logSearch]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh for live logs
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // ── Setup: Add API Key + Create Proxy ──
  const handleSetup = async () => {
    if (!setupApiKey.trim()) { setSetupError("Enter your API key"); return; }
    setSetupSaving(true);
    setSetupError(null);
    try {
      // Step 1: Add the API key
      await request<ApiKey>("/api/v1/keys/", {
        method: "POST",
        body: JSON.stringify({
          provider: setupProvider,
          api_key: setupApiKey.trim(),
          key_label: setupLabel.trim() || `${PROVIDERS.find(p => p.value === setupProvider)?.label} Key`,
        }),
      });

      // Step 2: Create a proxy key
      const proxyResult = await request<{ id: string; key: string; key_label: string; active: boolean; rate_limit: number; auto_enhance: boolean; created_at: string }>(
        "/api/v1/proxy-keys/",
        {
          method: "POST",
          body: JSON.stringify({
            label: setupLabel.trim() || "My Proxy Key",
            rate_limit: setupRateLimit,
            auto_enhance: setupAutoEnhance,
          }),
        },
      );

      setNewProxyKey({ key: proxyResult.key, label: proxyResult.key_label });
      setSetupApiKey("");
      setSetupLabel("");
      setShowSetup(false);
      await loadData();
    } catch (e: unknown) {
      setSetupError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSetupSaving(false);
    }
  };

  // ── Delete proxy key ──
  const handleDeleteProxy = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    try {
      await request(`/api/v1/proxy-keys/${id}`, { method: "DELETE" });
      await loadData();
      setDeleteConfirm(null);
    } catch {}
  };

  // ── Toggle auto-enhance ──
  const handleToggleEnhance = async (id: string, current: boolean) => {
    try {
      await request(`/api/v1/proxy-keys/${id}/toggle-enhance?enabled=${!current}`, { method: "PATCH" });
      await loadData();
    } catch {}
  };

  const providerBreakdown = breakdown?.providers || {};
  const modelBreakdown = breakdown?.models || [];
  const hasData = stats && stats.total_requests > 0;
  const totalPages = Math.ceil(logsTotal / 20);

  if (loading) {
    return (
      <div className="px-6 py-8 space-y-4 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-card" />)}
        </div>
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* ════════════════════════ PROXY KEY REVEAL MODAL ════════════════════════ */}
      {newProxyKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-black-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-jaffa flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Proxy Key Created!</h3>
                <p className="text-xs opacity-50">{newProxyKey.label}</p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-danger/8 border border-danger/15">
              <p className="text-xs font-bold text-danger flex items-center gap-1.5">
                <Zap size={12} /> Save this key now — it will not be shown again!
              </p>
            </div>
            <div className="mb-3">
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-2">Your Proxy Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg border border-black-border rounded-lg px-3 py-2.5 text-xs font-mono break-all bg-jaffa/5">{newProxyKey.key}</code>
                <Button variant="outline" size="sm" onClick={() => copyText(newProxyKey.key, "new-key")} className="border-black text-black flex-shrink-0">
                  {copiedKey === "new-key" ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-2">Your Endpoint</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg border border-black-border rounded-lg px-3 py-2.5 text-xs font-mono break-all">{API_URL}/v1/chat/completions</code>
                <Button variant="outline" size="sm" onClick={() => copyText(`${API_URL}/v1/chat/completions`, "new-url")} className="border-black text-black flex-shrink-0">
                  {copiedKey === "new-url" ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setNewProxyKey(null)}>Done, I saved my key</Button>
          </div>
        </div>
      )}

      {/* ════════════════════════ HEADER ROW ════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-black-soft mt-0.5">Your AI API gateway at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="text-black-soft">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button variant={autoRefresh ? "default" : "outline"} size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "" : "border-black text-black"}>
            <Zap size={14} className={autoRefresh ? "animate-pulse" : ""} />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </Button>
          <Button size="sm" onClick={() => setShowSetup(!showSetup)}>
            <Plus size={14} /> {proxyKeys.length > 0 ? "Add Proxy" : "Get Started"}
          </Button>
        </div>
      </div>

      {/* ════════════════════════ SETUP SECTION ════════════════════════ */}
      {showSetup && (
        <div className="card border-jaffa/30 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-jaffa flex items-center justify-center">
                <Key size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Setup Proxy</h3>
                <p className="text-xs opacity-50">Add your API key, configure settings, and generate your proxy URL</p>
              </div>
            </div>
            <button onClick={() => setShowSetup(false)} className="text-black-soft hover:text-black"><X size={16} /></button>
          </div>

          {setupError && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{setupError}</div>
          )}

          {/* Row 1: Provider + API Key */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Provider</label>
              <Select options={PROVIDERS} value={setupProvider} onChange={(e) => {
                setSetupProvider(e.target.value);
                setSetupModel(MODELS[e.target.value][0].value);
              }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">API Key</label>
              <Input
                type="password"
                placeholder={setupProvider === "openai" ? "sk-..." : setupProvider === "anthropic" ? "sk-ant-..." : "AIza..."}
                value={setupApiKey}
                onChange={(e) => setSetupApiKey(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Label (optional)</label>
              <Input placeholder="My API Key" value={setupLabel} onChange={(e) => setSetupLabel(e.target.value)} />
            </div>
          </div>

          {/* Row 2: Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Default Model</label>
              <Select options={MODELS[setupProvider]} value={setupModel} onChange={(e) => setSetupModel(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Temperature: {setupTemp}</label>
              <input type="range" min={0} max={2} step={0.1} value={setupTemp} onChange={(e) => setSetupTemp(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black-border rounded-full appearance-none cursor-pointer mt-2" />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Max Tokens: {setupMaxTokens}</label>
              <input type="range" min={256} max={4096} step={256} value={setupMaxTokens} onChange={(e) => setSetupMaxTokens(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black-border rounded-full appearance-none cursor-pointer mt-2" />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">Rate Limit: {setupRateLimit}/min</label>
              <input type="range" min={10} max={300} step={10} value={setupRateLimit} onChange={(e) => setSetupRateLimit(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black-border rounded-full appearance-none cursor-pointer mt-2" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setSetupAutoEnhance(!setupAutoEnhance)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border w-full justify-center ${
                  setupAutoEnhance ? "bg-green/10 text-green border-green/20" : "bg-black/4 text-black-soft border-transparent hover:bg-black/8"
                }`}>
                <Wand2 size={12} /> Auto-Enhance {setupAutoEnhance ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {setupAutoEnhance && (
            <div className="mb-4 p-2.5 rounded-lg bg-green/5 border border-green/10 text-xs text-green/80">
              <Wand2 size={11} className="inline mr-1" />
              Auto-enhance uses TF-IDF analysis to optimize prompts before sending to the AI provider, reducing token usage and cost.
            </div>
          )}

          <Button onClick={handleSetup} disabled={setupSaving || !setupApiKey.trim()} className="w-full md:w-auto">
            {setupSaving ? <><Loader2 size={14} className="animate-spin" /> Setting up...</> : <><Zap size={14} /> Generate Proxy URL</>}
          </Button>
        </div>
      )}

      {/* ════════════════════════ ACTIVE PROXY KEYS ════════════════════════ */}
      {proxyKeys.length > 0 && (
        <div className="space-y-3">
          {proxyKeys.map((pk) => (
            <div key={pk.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-jaffa/10 flex items-center justify-center">
                    <Globe size={16} className="text-jaffa" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{pk.key_label}</h4>
                      <Badge variant={pk.active ? "success" : "danger"}>{pk.active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-xs font-mono opacity-50">{API_URL}/v1/chat/completions</code>
                      <button onClick={() => copyText(`${API_URL}/v1/chat/completions`, `url-${pk.id}`)} className="text-black-soft hover:text-black">
                        {copiedKey === `url-${pk.id}` ? <Check size={10} className="text-green" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-50">{pk.rate_limit} req/min</span>
                  <button onClick={() => handleToggleEnhance(pk.id, pk.auto_enhance)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      pk.auto_enhance ? "bg-green/10 text-green" : "bg-black/4 text-black-soft"
                    }`}>
                    <Wand2 size={11} /> {pk.auto_enhance ? "Enhanced" : "Standard"}
                  </button>
                  <Button variant={deleteConfirm === pk.id ? "danger" : "ghost"} size="sm" onClick={() => handleDeleteProxy(pk.id)}
                    className={deleteConfirm === pk.id ? "text-white" : "text-black-soft"}>
                    <Trash2 size={13} /> {deleteConfirm === pk.id ? "Confirm?" : ""}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════ NO DATA EMPTY STATE ════════════════════════ */}
      {proxyKeys.length === 0 && !showSetup && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-jaffa" />
          </div>
          <h3 className="font-bold text-lg mb-2">Welcome to TokenScope</h3>
          <p className="text-sm opacity-50 mb-6">Add your API key and create a proxy endpoint to get started.</p>
          <Button onClick={() => setShowSetup(true)}>
            <Plus size={14} /> Get Started
          </Button>
        </div>
      )}

      {/* ════════════════════════ STATS BAR ════════════════════════ */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Total Spend" value={formatCurrency(stats.total_spend)} icon={DollarSign} accent="jaffa" />
          <StatsCard title="Total Tokens" value={formatNumber(stats.prompt_tokens_total + stats.completion_tokens_total)} icon={Cpu} accent="navy" />
          <StatsCard title="API Requests" value={formatNumber(stats.total_requests)} icon={Zap} accent="green" />
          <StatsCard title="Avg Latency" value={`${stats.avg_latency_ms}ms`} icon={Clock} accent="jaffa" />
        </div>
      )}

      {/* ════════════════════════ CHARTS ════════════════════════ */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cost + 3D */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Token Usage</h3>
                <div className="flex gap-1">
                  {(["7d", "14d", "30d"] as const).map((p) => (
                    <button key={p} onClick={() => setChartPeriod(p)}
                      className={`px-2 py-1 text-xs rounded-md transition-all ${chartPeriod === p ? "bg-jaffa text-white" : "text-black-muted hover:bg-black/5"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-56">
                <Usage3DChart data={chartData} period={chartPeriod} />
              </div>
            </div>
            {chartData.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-3">Activity</h3>
                <ContributionGraph data={chartData.map(d => ({ date: d.date, count: d.calls || 0 }))} weeks={12} />
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Spend by Provider</h3>
              {Object.keys(providerBreakdown).length > 0 ? (
                <>
                  <div className="h-40"><ProviderPie data={providerBreakdown} /></div>
                  <div className="mt-3 space-y-2">
                    {Object.entries(providerBreakdown).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[key] || "#6B6B6B" }} />
                          <span className="capitalize font-medium">{key}</span>
                        </div>
                        <span className="font-mono font-semibold">{formatCurrency(val.cost)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-xs opacity-50 text-center py-8">No data yet</p>}
            </div>
            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Cost Over Time</h3>
              {chartData.length > 0 ? (
                <div className="h-40"><CostLineChart data={chartData} /></div>
              ) : <p className="text-xs opacity-50 text-center py-8">No data yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ LIVE LOGS ════════════════════════ */}
      {proxyKeys.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-jaffa" />
              <h3 className="font-semibold text-sm">Live Request Logs</h3>
              {autoRefresh && <span className="w-2 h-2 bg-green rounded-full animate-pulse" />}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black-soft" />
                <input
                  className="h-8 pl-7 pr-3 rounded-lg border border-black-border bg-bg text-xs focus:outline-none focus:ring-2 focus:ring-jaffa/40 w-48"
                  placeholder="Search prompts..."
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setLogsPage(1); }}
                />
              </div>
              <Select
                options={[{ value: "", label: "All" }, ...PROVIDERS]}
                value={logProvider}
                onChange={(e) => { setLogProvider(e.target.value); setLogsPage(1); }}
                className="w-32 h-8 text-xs"
              />
              <span className="text-xs opacity-40">{formatNumber(logsTotal)} total</span>
            </div>
          </div>

          {logs.length > 0 ? (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-black-border">
                    <th className="w-7 p-2" />
                    <th className="text-left text-[10px] font-medium opacity-50 uppercase py-2 px-3">Provider</th>
                    <th className="text-left text-[10px] font-medium opacity-50 uppercase py-2 px-3">Time</th>
                    <th className="text-left text-[10px] font-medium opacity-50 uppercase py-2 px-3">Model</th>
                    <th className="text-left text-[10px] font-medium opacity-50 uppercase py-2 px-3">Prompt</th>
                    <th className="text-right text-[10px] font-medium opacity-50 uppercase py-2 px-3">Tokens</th>
                    <th className="text-right text-[10px] font-medium opacity-50 uppercase py-2 px-3">Cost</th>
                    <th className="text-right text-[10px] font-medium opacity-50 uppercase py-2 px-3">Latency</th>
                    <th className="text-center text-[10px] font-medium opacity-50 uppercase py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black-border/50">
                  {logs.map((log) => (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-black/3 transition-colors cursor-pointer" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                        <td className="p-2 text-center">
                          {expandedLog === log.id ? <ChevronDown size={12} className="text-black-soft" /> : <ChevronRight size={12} className="text-black-soft" />}
                        </td>
                        <td className="py-2 px-3"><Badge variant={log.provider as "openai" | "anthropic" | "gemini"} className="text-[10px]">{log.provider}</Badge></td>
                        <td className="py-2 px-3 text-[11px] text-black-soft whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                        <td className="py-2 px-3"><span className="font-mono text-[11px]">{log.model}</span></td>
                        <td className="py-2 px-3 max-w-[200px]">
                          <span className="text-[11px] text-black-soft truncate block">{log.request_prompt.slice(0, 50)}{log.request_prompt.length > 50 ? "..." : ""}</span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-mono text-[11px]">{formatNumber(log.total_tokens)}</span>
                          {log.enhancement_applied && <Wand2 size={9} className="inline ml-1 text-green" />}
                        </td>
                        <td className="py-2 px-3 text-right"><span className="font-mono text-[11px] font-semibold text-jaffa-dark">{formatCurrency(log.total_cost)}</span></td>
                        <td className="py-2 px-3 text-right"><span className="font-mono text-[11px] text-black-soft">{log.latency_ms}ms</span></td>
                        <td className="py-2 px-3 text-center"><StatusBadge code={log.status_code} /></td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={9} className="bg-surface-2 px-6 py-4 border-t border-black-border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-[10px] font-medium opacity-50 uppercase mb-1.5">Prompt</p>
                                <div className="bg-bg rounded-lg p-2.5 font-mono text-[11px] max-h-28 overflow-y-auto code-scroll">{log.request_prompt || <span className="opacity-40 italic">Empty</span>}</div>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium opacity-50 uppercase mb-1.5">Response</p>
                                <div className="bg-bg rounded-lg p-2.5 font-mono text-[11px] max-h-28 overflow-y-auto code-scroll">
                                  {log.response_text || log.error_message ? (
                                    log.error_message ? <span className="text-danger">{log.error_message}</span> : log.response_text
                                  ) : <span className="opacity-40 italic">No response</span>}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div><p className="text-[10px] opacity-50 uppercase">Prompt Tokens</p><p className="font-mono font-semibold text-sm">{formatNumber(log.request_tokens)}</p></div>
                                <div><p className="text-[10px] opacity-50 uppercase">Completion</p><p className="font-mono font-semibold text-sm">{formatNumber(log.response_tokens)}</p></div>
                                <div><p className="text-[10px] opacity-50 uppercase">Total Cost</p><p className="font-mono font-semibold text-sm text-green">{formatCurrency(log.total_cost)}</p></div>
                                <div><p className="text-[10px] opacity-50 uppercase">Latency</p><p className="font-mono font-semibold text-sm">{log.latency_ms}ms</p></div>
                                {log.enhancement_applied && log.enhanced_prompt && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] opacity-50 uppercase flex items-center gap-1"><Wand2 size={9} className="text-green" /> Enhanced Prompt</p>
                                    <div className="bg-green/5 rounded-lg p-2 font-mono text-[11px] max-h-16 overflow-y-auto border border-green/10 mt-1">{log.enhanced_prompt}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-black-border">
                  <p className="text-xs opacity-50">Page {logsPage} of {totalPages}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled={logsPage <= 1} onClick={() => setLogsPage(logsPage - 1)} className="text-xs h-7">Prev</Button>
                    <Button variant="ghost" size="sm" disabled={logsPage >= totalPages} onClick={() => setLogsPage(logsPage + 1)} className="text-xs h-7">Next</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <Terminal size={20} className="mx-auto text-black-soft mb-2" />
              <p className="text-xs opacity-50">No requests yet. Use your proxy endpoint to see live logs here.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ TOP MODELS ════════════════════════ */}
      {modelBreakdown.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-3">Top Models</h3>
          <UsageTable models={modelBreakdown} />
        </div>
      )}
    </div>
  );
}
