"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Copy, Check, ArrowRight } from "lucide-react";
import type { OptimizeResult } from "@/lib/api";
import { useState } from "react";

interface OptimizationPanelProps {
  result: OptimizeResult;
}

export function OptimizationPanel({ result }: OptimizationPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Savings summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono text-success">
            -{result.saved_tokens}
          </p>
          <p className="text-xs text-black-muted mt-1">Tokens Saved</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono text-success">
            -{result.saved_cost_total.toFixed(4)}
          </p>
          <p className="text-xs text-black-muted mt-1">Cost Saved ($)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono text-black">
            {result.optimized_tokens}
          </p>
          <p className="text-xs text-black-muted mt-1">New Token Count</p>
        </div>
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-black-muted uppercase tracking-wider">
              Original
            </span>
            <span className="font-mono text-xs text-black-muted">
              {result.original_tokens} tokens
            </span>
          </div>
          <div className="p-3 bg-black/5 rounded-lg border border-black-border font-mono text-xs text-black-muted h-32 overflow-y-auto">
            {result.original}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-black-muted uppercase tracking-wider">
              Optimized
            </span>
            <span className="font-mono text-xs text-success">
              {result.optimized_tokens} tokens
            </span>
          </div>
          <div className="p-3 bg-success/5 rounded-lg border border-success/20 font-mono text-xs text-black h-32 overflow-y-auto">
            {result.optimized}
          </div>
        </div>
      </div>

      {/* Key tokens kept */}
      {result.kept_key_tokens.length > 0 && (
        <div>
          <p className="text-xs font-medium text-black-muted uppercase tracking-wider mb-2">
            Key Tokens Retained
          </p>
          <div className="flex flex-wrap gap-2">
            {result.kept_key_tokens.map((t, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-xs font-mono ${
                  t.importance === "high"
                    ? "bg-danger/10 text-danger"
                    : t.importance === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-success/10 text-success"
                }`}
              >
                {t.token}{" "}
                <span className="opacity-60">({t.score.toFixed(3)})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy Optimized"}
        </Button>
      </div>
    </div>
  );
}
