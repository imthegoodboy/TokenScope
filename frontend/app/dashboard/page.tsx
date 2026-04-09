"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageTable } from "@/components/dashboard/usage-table";
import { CostLineChart } from "@/components/charts/cost-line-chart";
import { ProviderPie } from "@/components/charts/provider-pie";
import { ContributionGraph } from "@/components/charts/contribution-graph";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, Cpu, Zap, Clock, Activity, RefreshCw, ExternalLink } from "lucide-react";
import { useApi, type LogsStats, type LogsBreakdown, type ChartPoint, type ProxyLog } from "@/lib/api";

const Usage3DChart = dynamic(
  () => import("@/components/charts/usage-3d-chart").then((m) => m.Usage3DChart),
  { ssr: false, loading: () => <Skeleton className="h-64 rounded-lg" /> }
);

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#F07F3C",
  anthropic: "#16563B",
  gemini: "#002F4B",
};

export default function DashboardPage() {
  const { request } = useApi();
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [breakdown, setBreakdown] = useState<LogsBreakdown | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<ProxyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "14d" | "30d">("14d");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, breakdownRes, chartRes, logsRes] = await Promise.all([
        request<LogsStats>("/api/v1/logs/stats"),
        request<LogsBreakdown>("/api/v1/logs/breakdown"),
        request<ChartPoint[]>(`/api/v1/logs/chart?period=${chartPeriod}`),
        request<{ logs: ProxyLog[] }>("/api/v1/logs/?limit=5"),
      ]);
      setStats(statsRes);
      setBreakdown(breakdownRes);
      setChartData(chartRes);
      setRecentLogs(logsRes.logs);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, [request, chartPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const providerBreakdown = breakdown?.providers || {};
  const modelBreakdown = breakdown?.models || [];

  const contributionData = chartData.map((d) => ({
    date: d.date,
    count: d.calls || 0,
  }));

  return (
    <div>
      <Header
        title="Dashboard"
        description="Overview of your AI API gateway usage"
        action={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-sm text-black-soft hover:text-black transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">
        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
        ) : stats && stats.total_requests > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Spend" value={formatCurrency(stats.total_spend)} icon={DollarSign} accent="jaffa" />
            <StatsCard title="Total Tokens" value={formatNumber(stats.prompt_tokens_total + stats.completion_tokens_total)} icon={Cpu} accent="navy" />
            <StatsCard title="API Requests" value={formatNumber(stats.total_requests)} icon={Zap} accent="green" />
            <StatsCard title="Avg Latency" value={`${stats.avg_latency_ms}ms`} icon={Clock} accent="jaffa" />
          </div>
        ) : (
          <div className="card text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
              <Activity size={24} className="text-jaffa" />
            </div>
            <h3 className="font-bold text-lg mb-2">Welcome to TokenScope</h3>
            <p className="text-sm opacity-50 mb-6">
              Get started by adding a provider API key and creating a proxy key.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/dashboard/api-keys"><Badge variant="jaffa" className="cursor-pointer">Add API Key</Badge></a>
              <a href="/dashboard/proxy-keys"><Badge variant="success" className="cursor-pointer">Create Proxy Key</Badge></a>
            </div>
          </div>
        )}

        {/* Contribution Graph */}
        {chartData.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Request Activity</h3>
                <p className="text-xs opacity-60 mt-0.5">API calls over the last {chartPeriod}</p>
              </div>
              <Badge className="bg-jaffa-bg text-jaffa-dark border-jaffa/30">
                <Activity size={10} /> {stats ? formatNumber(stats.total_requests) : 0} total
              </Badge>
            </div>
            <ContributionGraph data={contributionData} weeks={12} />
          </div>
        )}

        {/* 3D Chart + Provider Pie */}
        {stats && stats.total_requests > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Token Usage (3D)</h3>
                  <p className="text-xs opacity-60 mt-0.5">Drag to rotate &middot; Scroll to zoom</p>
                </div>
                <div className="flex gap-1">
                  {(["7d", "14d", "30d"] as const).map((p) => (
                    <button key={p} onClick={() => setChartPeriod(p)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${chartPeriod === p ? "bg-jaffa text-white" : "text-black-muted hover:bg-black/5"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <Usage3DChart data={chartData} period={chartPeriod} />
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">Spend by Provider</h3>
              {Object.keys(providerBreakdown).length > 0 ? (
                <>
                  <div className="h-44">
                    <ProviderPie data={providerBreakdown} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {Object.entries(providerBreakdown).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[key] || "#6B6B6B" }} />
                          <span className="capitalize font-medium">{key}</span>
                          <span className="text-xs opacity-60">{formatNumber(val.calls)} calls</span>
                        </div>
                        <span className="font-mono font-semibold">{formatCurrency(val.cost)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm opacity-50 text-center py-10">No provider data yet</p>
              )}
            </div>
          </div>
        )}

        {/* Cost Over Time + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Cost Over Time</h3>
            {chartData.length > 0 ? (
              <div className="h-52">
                <CostLineChart data={chartData} />
              </div>
            ) : (
              <p className="text-sm opacity-50 text-center py-10">No cost data yet</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Activity</h3>
              <a href="/dashboard/logs" className="text-xs text-jaffa hover:text-jaffa-dark flex items-center gap-1">
                View all <ExternalLink size={10} />
              </a>
            </div>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((call) => (
                  <div key={call.id} className="flex items-center justify-between py-2 border-b border-black-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[call.provider] || "#6B6B6B" }} />
                      <div>
                        <p className="text-sm font-medium font-mono">{call.model}</p>
                        <p className="text-xs opacity-60">{formatNumber(call.total_tokens)} tokens</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold">{formatCurrency(call.total_cost)}</p>
                      <p className="text-xs opacity-60">
                        {new Date(call.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm opacity-50 mb-3">No requests yet</p>
                <a href="/dashboard/proxy-keys"><Badge variant="jaffa" className="cursor-pointer">Create Proxy Key</Badge></a>
              </div>
            )}
          </div>
        </div>

        {/* Top Models */}
        {modelBreakdown.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Top Models</h3>
            <UsageTable models={modelBreakdown} />
          </div>
        )}
      </div>
    </div>
  );
}
