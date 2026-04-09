"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  date: string;
  tokens: number;
  cost: number;
  provider: string;
}

interface CostLineChartProps {
  data: ChartDataPoint[];
}

export function CostLineChart({ data }: CostLineChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD7" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9B9590" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9B9590" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2DDD7",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#0F0F0F",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
          cursor={{ stroke: "#F07F3C", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke="#F07F3C"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "#F07F3C", stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
