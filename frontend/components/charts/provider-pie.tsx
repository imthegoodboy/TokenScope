"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface ProviderBreakdown {
  [key: string]: {
    tokens: number;
    cost: number;
    calls: number;
  };
}

interface ProviderPieProps {
  data: ProviderBreakdown;
}

const COLORS = {
  openai: "#F07F3C",
  anthropic: "#16563B",
  gemini: "#002F4B",
};

export function ProviderPie({ data }: ProviderPieProps) {
  const chartData = Object.entries(data).map(([name, val]) => ({
    name,
    value: val.cost,
    tokens: val.tokens,
    calls: val.calls,
    color: COLORS[name as keyof typeof COLORS] || "#6B6B6B",
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm opacity-50">No data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2DDD7",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#0F0F0F",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Spend"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
