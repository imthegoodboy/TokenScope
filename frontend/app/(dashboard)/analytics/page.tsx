"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Calendar, Clock, Hash } from "lucide-react";

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

function generateAnalyticsData() {
  const data = [];
  for (let i = 0; i < 60; i++) {
    const providers = ["openai", "anthropic", "gemini"];
    const provider = providers[i % 3];
    const tokens = Math.floor(Math.random() * 3000) + 200;
    const cost = tokens * (provider === "openai" ? 0.00003 : provider === "anthropic" ? 0.00005 : 0.00001);
    data.push({ tokens, cost, provider, model: "various" });
  }
  return data;
}

function generateHeatmapData() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 80 + 5),
    }))
  );
}

export default function AnalyticsPage() {
  const scatterData = useMemo(() => generateAnalyticsData(), []);
  const heatmapData = useMemo(() => generateHeatmapData(), []);
  const maxHeat = 85;

  return (
    <div>
      <Header title="Analytics" description="Deep dive into your token usage patterns" />

      <div className="px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsRow title="Avg Tokens/Call" value="1,240" icon={Hash} sub="across all providers" />
          <StatsRow title="Most Active Hour" value="2 PM" icon={Clock} sub="peak usage time" />
          <StatsRow title="Busiest Day" value="Wednesday" icon={Calendar} sub="42% of weekly usage" />
          <StatsRow title="Cost Trend" value="-8.3%" icon={TrendingUp} sub="vs last 30 days" />
        </div>

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
            <Analytics3D data={scatterData} />
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
                      style={{ backgroundColor: `rgba(240,127,60,${(cell.value / maxHeat) * 0.65 + 0.05})` }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-base mb-4">Token Distribution</h3>
            <div className="space-y-4">
              {[
                { label: "Prompt Tokens", value: 62, color: "#F07F3C" },
                { label: "Completion Tokens", value: 38, color: "#E2DDD7" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="opacity-60">{item.label}</span>
                    <span className="font-mono font-semibold">{item.value}%</span>
                  </div>
                  <div className="h-2.5 bg-black-border/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-base mb-4">30-Day Projection</h3>
            <div className="flex items-end gap-0.5 h-24">
              {Array.from({ length: 20 }, (_, i) => {
                const h = 20 + Math.sin(i * 0.5) * 40 + Math.random() * 30;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-jaffa/20 hover:bg-jaffa/40 transition-colors rounded-t-sm"
                    style={{ height: `${h}%` }}
                    title={`Day ${i + 1}: ${formatCurrency(h * 0.1)}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[10px] opacity-40">
              <span>Today</span>
              <span>30 days</span>
            </div>
            <p className="text-center mt-3 text-sm font-semibold">
              Projected: <span className="font-mono text-jaffa">{formatCurrency(892.4)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
