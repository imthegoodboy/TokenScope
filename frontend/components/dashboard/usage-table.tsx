"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

interface ModelUsage {
  model: string;
  tokens: number;
  cost: number;
  calls: number;
}

interface UsageTableProps {
  models: ModelUsage[];
}

export function UsageTable({ models }: UsageTableProps) {
  const maxTokens = Math.max(...models.map((m) => m.tokens));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black-border">
            <th className="text-left text-[11px] font-medium opacity-50 uppercase tracking-wider py-2.5 pr-4">
              Model
            </th>
            <th className="text-right text-[11px] font-medium opacity-50 uppercase tracking-wider py-2.5 px-4">
              Calls
            </th>
            <th className="text-right text-[11px] font-medium opacity-50 uppercase tracking-wider py-2.5 px-4">
              Tokens
            </th>
            <th className="text-right text-[11px] font-medium opacity-50 uppercase tracking-wider py-2.5 px-4">
              Cost
            </th>
            <th className="text-right text-[11px] font-medium opacity-50 uppercase tracking-wider py-2.5 pl-4">
              Share
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black-border">
          {models.map((m) => (
            <tr key={m.model} className="hover:bg-black/3 transition-colors">
              <td className="py-3 pr-4">
                <span className="font-mono text-sm font-medium">
                  {m.model}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-mono text-sm opacity-80">
                  {formatNumber(m.calls)}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-mono text-sm font-medium">
                  {formatNumber(m.tokens)}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-mono text-sm font-semibold text-jaffa-dark">
                  {formatCurrency(m.cost)}
                </span>
              </td>
              <td className="py-3 pl-4">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-24 h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-jaffa rounded-full transition-all duration-500"
                      style={{ width: `${(m.tokens / maxTokens) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs opacity-50 w-8 text-right">
                    {((m.tokens / maxTokens) * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
