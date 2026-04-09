"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageTable } from "@/components/dashboard/usage-table";
import { CostLineChart } from "@/components/charts/cost-line-chart";
import { ProviderPie } from "@/components/charts/provider-pie";
import { Usage3DChart } from "@/components/charts/usage-3d-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  DollarSign,
  Cpu,
  Zap,
  Key,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useUsageStore } from "@/store/usage-store";

// Demo data for when backend isn't connected
const demoSummary = {
  total_spend: 127.43,
  total_tokens: 4_820_000,
  total_calls: 1284,
  avg_cost_per_call: 0.0992,
  active_keys: 3,
  provider_breakdown: {
    openai: { tokens: 2_100_000, cost: 89.5, calls: 620 },
    anthropic: { tokens: 1_820_000, cost: 31.8, calls: 540 },
    gemini: { tokens: 900_000, cost: 6.13, calls: 124 },
  },
  model_breakdown: [
    { model: "gpt-4o", tokens: 1_200_000, cost: 52.5, calls: 340 },
    { model: "claude-3-5-sonnet", tokens: 1_100_000, cost: 26.4, calls: 380 },
    { model: "gpt-4o-mini", tokens: 900_000, cost: 37.0, calls: 280 },
    { model: "gemini-1.5-flash", tokens: 700_000, cost: 5.25, calls: 100 },
    { model: "claude-3-5-haiku", tokens: 720_000, cost: 5.4, calls: 160 },
  ],
  chart_data: Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().split("T")[0],
      tokens: Math.floor(Math.random() * 500000) + 100000,
      cost: Math.random() * 20 + 2,
      provider: ["openai", "anthropic", "gemini"][i % 3],
    };
  }),
  recent_calls: [
    {
      id: "1",
      provider: "openai",
      model: "gpt-4o",
      prompt_tokens: 1240,
      completion_tokens: 380,
      total_tokens: 1620,
      cost_usd: 0.0628,
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: "2",
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      prompt_tokens: 890,
      completion_tokens: 520,
      total_tokens: 1410,
      cost_usd: 0.0282,
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "3",
      provider: "openai",
      model: "gpt-4o-mini",
      prompt_tokens: 2100,
      completion_tokens: 280,
      total_tokens: 2380,
      cost_usd: 0.0318,
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: "4",
      provider: "gemini",
      model: "gemini-1.5-flash",
      prompt_tokens: 560,
      completion_tokens: 190,
      total_tokens: 750,
      cost_usd: 0.0056,
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: "5",
      provider: "anthropic",
      model: "claude-3-5-haiku",
      prompt_tokens: 340,
      completion_tokens: 210,
      total_tokens: 550,
      cost_usd: 0.0044,
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
  ],
};

export default function DashboardPage() {
  const { summary, setSummary, isLoading, setLoading } = useUsageStore();
  const [data, setData] = useState(demoSummary);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "14d" | "30d">("14d");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/usage/summary`
        );
        if (res.ok) {
          const d = await res.json();
          setData(d);
          setSummary(d);
        }
      } catch {
        // Use demo data if backend is not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setLoading, setSummary]);

  const isDemo = !summary;
  const display = summary || data;

  return (
    <div>
      <Header
        title="Dashboard"
        description="Overview of your AI token usage"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Spend"
              value={formatCurrency(display.total_spend)}
              icon={DollarSign}
              change={`${isDemo ? "+12.4%" : ""}`}
              trend={false}
            />
            <StatsCard
              title="Total Tokens"
              value={formatNumber(display.total_tokens)}
              icon={Cpu}
              change={`${isDemo ? "+8.2%" : ""}`}
              trend={true}
            />
            <StatsCard
              title="API Calls"
              value={formatNumber(display.total_calls)}
              icon={Zap}
              change={`${isDemo ? "+15.1%" : ""}`}
              trend={true}
            />
            <StatsCard
              title="Active Keys"
              value={display.active_keys.toString()}
              icon={Key}
              change={`${isDemo ? "3 providers" : ""}`}
              trend={true}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Usage Chart */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-black">Token Usage (3D)</h3>
                <p className="text-xs text-black-muted mt-0.5">
                  Drag to rotate • Scroll to zoom
                </p>
              </div>
              <div className="flex gap-1">
                {(["7d", "14d", "30d"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                      chartPeriod === p
                        ? "bg-black text-white"
                        : "text-black-muted hover:bg-black/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <Usage3DChart data={display.chart_data} period={chartPeriod} />
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="card">
            <h3 className="font-semibold text-black mb-4">By Provider</h3>
            <div className="h-48">
              <ProviderPie data={display.provider_breakdown} />
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(display.provider_breakdown).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          key === "openai"
                            ? "#10A37F"
                            : key === "anthropic"
                            ? "#D4A574"
                            : "#4285F4",
                      }}
                    />
                    <span className="capitalize text-black">{key}</span>
                  </div>
                  <span className="font-mono text-black-muted">
                    {formatCurrency(val.cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Line Chart + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-black mb-4">Cost Over Time</h3>
            <div className="h-52">
              <CostLineChart data={display.chart_data} />
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-black mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {display.recent_calls.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-2 border-b border-black-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          call.provider === "openai"
                            ? "#10A37F"
                            : call.provider === "anthropic"
                            ? "#D4A574"
                            : "#4285F4",
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-black font-mono">
                        {call.model}
                      </p>
                      <p className="text-xs text-black-muted">
                        {formatNumber(call.total_tokens)} tokens
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium text-black">
                      {formatCurrency(call.cost_usd)}
                    </p>
                    <p className="text-xs text-black-muted">
                      {new Date(call.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Models */}
        <div className="card">
          <h3 className="font-semibold text-black mb-4">Top Models</h3>
          <UsageTable models={display.model_breakdown} />
        </div>
      </div>
    </div>
  );
}
