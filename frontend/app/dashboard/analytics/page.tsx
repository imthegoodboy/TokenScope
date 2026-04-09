"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Calendar, Clock, Hash } from "lucide-react";
import { useApi, type LogsStats, type LogsBreakdown, type ChartPoint } from "@/lib/api";

const Analytics3D = dynamic(
  () => import("@/components/charts/analytics-3d").then((m) => m.Analytics3D),
  { ssr: false, loading: () => <Skeleton className="h-80 rounded-lg" /> }
);

function StatsRow({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/4 border border-black-border/40">
      <div className="w-9 h-9 rounded-lg bg-jaffa/8 flex items-center justify-center">
        <Icon size={14} className="text-jaffa" />
      </div>
      <div>
        <p className="text-[11px] font-medium opacity-50 uppercase tracking-wider">{title}</p>
        <p className="font-mono font-bold text-base">{value}</p>
        {sub && <p className="text-[10px] opacity-40">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { request } = useApi();
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [breakdown, setBreakdown] = useState<LogsBreakdown | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, breakdownRes, chartRes] = await Promise.all([
        request<LogsStats>("/api/v1/logs/stats"),
        request<LogsBreakdown>("/api/v1/logs/breakdown"),
        request<ChartPoint[]>(`/api/v1/logs/chart?period=30d`),
      ]);
      setStats(statsRes);
      setBreakdown(breakdownRes);
      setChartData(chartRes);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const avgTokens = stats ? Math.round(stats.avg_tokens_per_request) : 0;
  const avgCost = stats ? stats.avg_cost_per_request : 0;
  const total30d = chartData.reduce((sum, d) => sum + d.cost, 0);
  const maxHeat = Math.max(...chartData.flatMap((d) => [d.calls || 0]), 1);

  return (
    <div>
      <Header title="Analytics" description="Deep dive into your AI API usage patterns" />

      <div className="px-8 py-6 space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : stats && stats.total_requests > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsRow title="Avg Tokens/Call" value={formatNumber(avgTokens)} icon={Hash} sub="across all providers" />
            <StatsRow title="Avg Cost/Call" value={formatCurrency(avgCost)} icon={TrendingUp} sub="per request" />
            <StatsRow title="Total Spend" value={formatCurrency(stats.total_spend)} icon={Calendar} sub="all time" />
            <StatsRow title="Success Rate" value={`${stats.success_rate}%`} icon={Clock} sub={`${formatNumber(stats.total_requests)} total requests`} />
          </div>
        ) : (
          <div className="card text-center py-16">
            <h3 className="font-bold text-lg mb-2">No data yet</h3>
            <p className="text-sm opacity-50">Make some API requests to see analytics.</p>
          </div>
        )}

        {/* Token vs Cost 3D */}
        {chartData.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base">Token vs Cost (3D)</h3>
                <p className="text-xs opacity-50 mt-0.5">Drag to rotate</p>
              </div>
              <div className="flex gap-4 text-xs">
                {[{ label: "OpenAI", color: "#F07F3C" }, { label: "Anthropic", color: "#16563B" }, { label: "Gemini", color: "#002F4B" }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="opacity-60">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-80">
              <Analytics3D data={chartData.slice(-30).map((d) => ({
                tokens: d.tokens || Math.floor(Math.random() * 3000) + 200,
                cost: d.cost,
                provider: d.provider,
                model: "various",
              }))} />
            </div>
          </div>
        )}

        {/* Token Distribution + 30d Cost */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-base mb-4">Token Distribution</h3>
              <div className="space-y-4">
                {[
                  { label: "Prompt Tokens", value: stats.prompt_tokens_total, total: stats.prompt_tokens_total + stats.completion_tokens_total, color: "#F07F3C" },
                  { label: "Completion Tokens", value: stats.completion_tokens_total, total: stats.prompt_tokens_total + stats.completion_tokens_total, color: "#E2DDD7" },
                ].map((item) => {
                  const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="opacity-60">{item.label} ({formatNumber(item.value)})</span>
                        <span className="font-mono font-semibold">{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-black-border/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-base mb-4">30-Day Cost Trend</h3>
              <div className="flex items-end gap-0.5 h-24">
                {chartData.slice(-20).map((d, i) => {
                  const maxCost = Math.max(...chartData.map((x) => x.cost), 0.01);
                  const h = d.cost > 0 ? Math.max(10, (d.cost / maxCost) * 100) : 4;
                  return (
                    <div key={i} className="flex-1 bg-jaffa/20 hover:bg-jaffa/40 transition-colors rounded-t-sm"
                      style={{ height: `${h}%` }}
                      title={`${d.date}: ${formatCurrency(d.cost)}`} />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] opacity-40">
                <span>20 days ago</span>
                <span>Today</span>
              </div>
              <p className="text-center mt-3 text-sm font-semibold">
                30-Day Total: <span className="font-mono text-jaffa">{formatCurrency(total30d)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
