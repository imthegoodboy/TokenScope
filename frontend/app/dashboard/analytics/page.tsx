"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Calendar, Clock, Hash, Loader2 } from "lucide-react";
import { getLogsStats, getLogsBreakdown, getLogsChart, type LogsStats, type LogsBreakdown, type ChartPoint } from "@/lib/api";

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

function generateHeatmapData(chartData: ChartPoint[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const heatmap: Record<string, Record<number, number>> = {};

  days.forEach((d) => {
    heatmap[d] = {};
    for (let h = 0; h < 24; h++) {
      heatmap[d][h] = 0;
    }
  });

  // Distribute chart data across heatmap (for demo, spread evenly)
  const total = chartData.reduce((sum, d) => sum + (d.calls || 1), 0);
  chartData.forEach((d, i) => {
    const dayName = days[new Date(d.date).getDay()];
    const hour = (i * 3) % 24;
    heatmap[dayName][hour] += d.calls || 1;
  });

  return days.map((day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      value: heatmap[day][hour],
    }))
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [breakdown, setBreakdown] = useState<LogsBreakdown | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, breakdownRes, chartRes] = await Promise.all([
        getLogsStats(),
        getLogsBreakdown(),
        getLogsChart("30d"),
      ]);
      setStats(statsRes);
      setBreakdown(breakdownRes);
      setChartData(chartRes);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const heatmapData = generateHeatmapData(chartData);
  const maxHeat = Math.max(...heatmapData.map((row) => Math.max(...row.map((c) => c.value))), 1);

  // Scatter data from chart points
  const scatterData = chartData.slice(-30).map((d, i) => ({
    tokens: d.tokens || Math.floor(Math.random() * 3000) + 200,
    cost: d.cost || 0,
    provider: d.provider,
    model: "various",
  }));

  const avgTokens = stats ? Math.round(stats.avg_tokens_per_request) : 0;
  const avgCost = stats ? stats.avg_cost_per_request : 0;
  const total30d = chartData.reduce((sum, d) => sum + d.cost, 0);

  return (
    <div>
      <Header title="Analytics" description="Deep dive into your AI API usage patterns" />

      <div className="px-8 py-6 space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsRow
              title="Avg Tokens/Call"
              value={formatNumber(avgTokens)}
              icon={Hash}
              sub="across all providers"
            />
            <StatsRow
              title="Avg Cost/Call"
              value={formatCurrency(avgCost)}
              icon={TrendingUp}
              sub="per request"
            />
            <StatsRow
              title="Total Spend"
              value={formatCurrency(stats?.total_spend || 0)}
              icon={Calendar}
              sub="all time"
            />
            <StatsRow
              title="Success Rate"
              value={`${stats?.success_rate || 100}%`}
              icon={Clock}
              sub={`${stats?.total_requests || 0} total requests`}
            />
          </div>
        )}

        {/* 3D Scatter */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">Token vs Cost (3D)</h3>
              <p className="text-xs opacity-50 mt-0.5">Drag to rotate — each bubble = one API call</p>
            </div>
            <div className="flex gap-4 text-xs">
              {[
                { label: "OpenAI", color: "#F07F3C" },
                { label: "Anthropic", color: "#16563B" },
                { label: "Gemini", color: "#002F4B" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="opacity-60">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-80">
            {loading ? (
              <Skeleton className="h-80 rounded-lg" />
            ) : scatterData.length > 0 ? (
              <Analytics3D data={scatterData} />
            ) : (
              <div className="h-80 flex items-center justify-center text-sm opacity-50">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="card">
          <h3 className="font-bold text-base mb-4">Usage Heatmap (Hour x Day)</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-10" />
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] opacity-40">{i}</div>
                ))}
              </div>
              {heatmapData.map((row, di) => (
                <div key={di} className="flex items-center mb-0.5">
                  <div className="w-10 text-[10px] opacity-50 pr-2 text-right">{row[0].day}</div>
                  {row.map((cell, hi) => (
                    <div
                      key={hi}
                      className="flex-1 h-6 mx-px rounded-sm transition-all duration-150 hover:ring-2 hover:ring-jaffa/30 cursor-pointer"
                      style={{
                        backgroundColor: cell.value > 0
                          ? `rgba(240,127,60,${Math.max(0.1, (cell.value / maxHeat) * 0.65 + 0.05)})`
                          : "rgba(0,0,0,0.03)"
                      }}
                      title={`${cell.day} ${cell.hour}:00 — ${cell.value} calls`}
                    />
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] opacity-40">Less</span>
                {[0.1, 0.25, 0.45, 0.65, 0.85].map((v, i) => (
                  <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: `rgba(240,127,60,${v})` }} />
                ))}
                <span className="text-[10px] opacity-40">More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Token Distribution */}
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
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
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
                    <div
                      key={i}
                      className="flex-1 bg-jaffa/20 hover:bg-jaffa/40 transition-colors rounded-t-sm"
                      style={{ height: `${h}%` }}
                      title={`${d.date}: ${formatCurrency(d.cost)}`}
                    />
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
