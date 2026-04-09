"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  trend?: boolean;
}

export function StatsCard({ title, value, icon: Icon, change, trend }: StatsCardProps) {
  return (
    <div className="card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-black-muted uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-black mt-2 font-mono">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {trend ? (
                <TrendingUp size={12} className="text-success" />
              ) : (
                <TrendingDown size={12} className="text-danger" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend ? "text-success" : "text-danger"
                )}
              >
                {change}
              </span>
              <span className="text-xs text-black-muted">vs last month</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors">
          <Icon size={18} className="text-black" />
        </div>
      </div>
    </div>
  );
}
