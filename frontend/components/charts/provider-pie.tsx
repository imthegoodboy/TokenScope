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
  openai: "#10A37F",
  anthropic: "#D4A574",
  gemini: "#4285F4",
};

export function ProviderPie({ data }: ProviderPieProps) {
  const chartData = Object.entries(data).map(([name, val]) => ({
    name,
    value: val.cost,
    tokens: val.tokens,
    calls: val.calls,
    color: COLORS[name as keyof typeof COLORS] || "#6B6B6B",
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
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
            border: "1px solid #E8E4DE",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#0A0A0A",
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Spend"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
