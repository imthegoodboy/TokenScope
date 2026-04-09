"use client";

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Analytics3D } from "@/components/charts/analytics-3d";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Calendar, Clock, Hash } from "lucide-react";

// Demo analytics data
function generateAnalyticsData() {
  const data = [];
  for (let i = 0; i < 60; i++) {
    const providers = ["openai", "anthropic", "gemini"];
    const provider = providers[i % 3];
    const tokens = Math.floor(Math.random() * 3000) + 200;
    const cost = tokens * (provider === "openai" ? 0.00003 : provider === "anthropic" ? 0.00005 : 0.00001);
    data.push({
      tokens,
      cost,
      provider,
      model: provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-3-5-sonnet" : "gemini-1.5-flash",
    });
  }
  return data;
}

// Heatmap data: hour x day
function generateHeatmapData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return days.map((day) =>
    hours.map((hour) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 80 + 10),
    }))
  );
}

function StatsRow({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
        <Icon size={14} className="text-black" />
      </div>
      <div>
        <p className="text-xs text-black-muted">{title}</p>
        <p className="font-mono font-semibold text-black">{value}</p>
        {sub && <p className="text-xs text-black-muted">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const scatterData = useMemo(() => generateAnalyticsData(), []);
  const heatmapData = useMemo(() => generateHeatmapData(), []);

  const maxHeat = 90;

  return (
    <div>
      <Header
        title="Analytics"
        description="Deep dive into your token usage patterns"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <StatsRow title="Avg Tokens/Call" value="1,240" icon={Hash} sub="across all providers" />
          </div>
          <div className="card">
            <StatsRow title="Most Active Hour" value="2 PM" icon={Clock} sub="peak usage time" />
          </div>
          <div className="card">
            <StatsRow title="Busiest Day" value="Wednesday" icon={Calendar} sub="42% of weekly usage" />
          </div>
          <div className="card">
            <StatsRow title="Cost Trend" value="↓ 8.3%" icon={TrendingUp} sub="vs last 30 days" />
          </div>
        </div>

        {/* 3D Scatter Plot */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-black">Token vs Cost (3D Scatter)</h3>
              <p className="text-xs text-black-muted mt-0.5">Drag to rotate • Each bubble = one API call</p>
            </div>
          </div>
          <div className="h-80">
            <Analytics3D data={scatterData} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-black-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10A37F]" /> OpenAI
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#D4A574]" /> Anthropic
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#4285F4]" /> Gemini
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card">
          <h3 className="font-semibold text-black mb-4">Usage Heatmap (Hour × Day)</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-10" />
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="flex-1 text-center text-xs text-black-muted" style={{ fontSize: "9px" }}>
                    {i}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {heatmapData.map((row, di) => (
                <div key={di} className="flex items-center mb-1">
                  <div className="w-10 text-xs text-black-muted">{row[0].day}</div>
                  {row.map((cell, hi) => {
                    const intensity = cell.value / maxHeat;
                    return (
                      <div
                        key={hi}
                        className="flex-1 h-6 rounded-sm mx-0.5"
                        style={{
                          backgroundColor: `rgba(10, 10, 10, ${intensity * 0.7 + 0.05})`,
                        }}
                        title={`${cell.day} ${cell.hour}:00 - ${cell.value} calls`}
                      />
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-black-muted">Less</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                    <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: `rgba(10,10,10,${v * 0.7 + 0.05})` }} />
                  ))}
                </div>
                <span className="text-xs text-black-muted">More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Token Distribution */}
        <div className="card">
          <h3 className="font-semibold text-black mb-4">Token Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-black-muted uppercase tracking-wider mb-3">
                Prompt vs Completion Ratio
              </p>
              <div className="space-y-3">
                {[
                  { label: "Prompt Tokens", value: 65, color: "#0A0A0A" },
                  { label: "Completion Tokens", value: 35, color: "#E8E4DE" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-black-muted">{item.label}</span>
                      <span className="font-mono text-black">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-black-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-black-muted uppercase tracking-wider mb-3">
                Cost Projection (30 Days)
              </p>
              <div className="flex items-end gap-1 h-24">
                {[40, 55, 45, 70, 60, 80, 65, 75, 90, 85, 95, 100, 88, 92, 105].map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-black/10 rounded-t transition-all duration-300 hover:bg-black/20"
                    style={{ height: `${v}%` }}
                    title={`Day ${i + 1}: ${formatCurrency(v * 0.1)}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-black-muted">
                <span>Today</span>
                <span>30 days</span>
              </div>
              <p className="text-center mt-2 text-sm font-medium text-black">
                Projected: <span className="font-mono">{formatCurrency(892.4)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
