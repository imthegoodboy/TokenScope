"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import { Search, Download, ChevronDown, ChevronRight, Filter } from "lucide-react";
import type { UsageRecord } from "@/lib/api";

const DEMO_RECORDS: UsageRecord[] = Array.from({ length: 50 }, (_, i) => {
  const providers = ["openai", "anthropic", "gemini"];
  const models = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    anthropic: ["claude-3-5-sonnet", "claude-3-5-haiku"],
    gemini: ["gemini-2.0-flash", "gemini-1.5-flash"],
  };
  const provider = providers[i % 3] as "openai" | "anthropic" | "gemini";
  const model = models[provider][i % models[provider].length];
  const promptTokens = Math.floor(Math.random() * 2000) + 100;
  const completionTokens = Math.floor(Math.random() * 800) + 50;
  const total = promptTokens + completionTokens;
  const cost = total * (provider === "openai" ? 0.00003 : provider === "anthropic" ? 0.00005 : 0.00001);

  return {
    id: `${i + 1}`,
    provider,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: total,
    cost_usd: cost,
    created_at: new Date(Date.now() - i * 45 * 60000).toISOString(),
  };
});

const PROVIDERS = [
  { value: "", label: "All Providers" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
];

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [records] = useState<UsageRecord[]>(DEMO_RECORDS);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "total_tokens" | "cost_usd">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = records
    .filter((r) => {
      if (provider && r.provider !== provider) return false;
      if (search && !r.model.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const dir = sortDir === "desc" ? -1 : 1;
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const providerColor: Record<string, string> = {
    openai: "#10A37F",
    anthropic: "#D4A574",
    gemini: "#4285F4",
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="opacity-30">↕</span>;
    return sortDir === "desc" ? "↓" : "↑";
  };

  return (
    <div>
      <Header
        title="Usage History"
        description="Full log of all API calls"
        action={
          <Button variant="outline" size="sm">
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black-muted" />
                <Input
                  placeholder="Search by model..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              options={PROVIDERS}
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setPage(1); }}
              placeholder="All Providers"
              className="w-40"
            />
            <div className="flex items-center gap-2 text-xs text-black-muted">
              <Filter size={12} />
              <span>{filtered.length} records</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black-border bg-cream">
                  <th className="w-8 p-3" />
                  <th className="text-left text-xs font-medium text-black-muted uppercase tracking-wider py-3 px-4">
                    Provider
                  </th>
                  <th
                    className="text-left text-xs font-medium text-black-muted uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-black"
                    onClick={() => handleSort("created_at")}
                  >
                    Time <SortIcon field="created_at" />
                  </th>
                  <th className="text-left text-xs font-medium text-black-muted uppercase tracking-wider py-3 px-4">
                    Model
                  </th>
                  <th
                    className="text-right text-xs font-medium text-black-muted uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-black"
                    onClick={() => handleSort("total_tokens")}
                  >
                    Tokens <SortIcon field="total_tokens" />
                  </th>
                  <th
                    className="text-right text-xs font-medium text-black-muted uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-black"
                    onClick={() => handleSort("cost_usd")}
                  >
                    Cost <SortIcon field="cost_usd" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black-border">
                {paged.map((record) => (
                  <>
                    <tr
                      key={record.id}
                      className="hover:bg-black/2 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                    >
                      <td className="p-3 text-center">
                        {expanded === record.id ? (
                          <ChevronDown size={14} className="text-black-muted" />
                        ) : (
                          <ChevronRight size={14} className="text-black-muted" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={record.provider as "openai" | "anthropic" | "gemini"}
                        >
                          {record.provider}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-black-muted">
                        {formatDateTime(record.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-black">
                          {record.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-sm text-black">
                          {formatNumber(record.total_tokens)}
                        </span>
                        <span className="text-xs text-black-muted ml-1">
                          ({formatNumber(record.prompt_tokens)}/{formatNumber(record.completion_tokens)})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-sm font-medium text-black">
                          {formatCurrency(record.cost_usd)}
                        </span>
                      </td>
                    </tr>
                    {expanded === record.id && (
                      <tr key={`${record.id}-detail`}>
                        <td colSpan={6} className="bg-cream px-8 py-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-black-muted mb-1">Prompt Tokens</p>
                              <p className="font-mono font-medium">{formatNumber(record.prompt_tokens)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-black-muted mb-1">Completion Tokens</p>
                              <p className="font-mono font-medium">{formatNumber(record.completion_tokens)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-black-muted mb-1">Total Cost</p>
                              <p className="font-mono font-medium text-success">{formatCurrency(record.cost_usd)}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-black-border">
              <p className="text-xs text-black-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
