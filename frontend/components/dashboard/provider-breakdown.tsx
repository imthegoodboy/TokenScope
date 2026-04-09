"use client";

import { formatCurrency, formatNumber, getProviderColor, getProviderLabel } from "@/lib/utils";

interface ProviderBreakdownProps {
  data: Record<string, { tokens: number; cost: number; calls: number }>;
}

export function ProviderBreakdown({ data }: ProviderBreakdownProps) {
  const entries = Object.entries(data);
  const totalCost = entries.reduce((sum, [, v]) => sum + v.cost, 0);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-black-muted">No provider data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([provider, stats]) => {
        const pct = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0;
        return (
          <div key={provider} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getProviderColor(provider) }}
                />
                <span className="text-sm font-medium text-black">
                  {getProviderLabel(provider)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-black-muted">
                  {formatNumber(stats.tokens)} tok
                </span>
                <span className="font-mono text-sm font-medium text-black w-16 text-right">
                  {formatCurrency(stats.cost)}
                </span>
              </div>
            </div>
            <div className="h-1 bg-black-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getProviderColor(provider),
                }}
              />
            </div>
            <p className="text-xs text-black-muted text-right">
              {pct.toFixed(1)}% of total • {stats.calls} calls
            </p>
          </div>
        );
      })}
    </div>
  );
}
