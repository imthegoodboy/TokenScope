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
  accent?: "jaffa" | "green" | "navy";
}

const accentStyles = {
  jaffa: {
    bg: "bg-jaffa/8",
    icon: "text-jaffa",
  },
  green: {
    bg: "bg-green/8",
    icon: "text-green",
  },
  navy: {
    bg: "bg-navy/8",
    icon: "text-navy",
  },
};

export function StatsCard({ title, value, icon: Icon, change, trend, accent = "jaffa" }: StatsCardProps) {
  const style = accentStyles[accent];
  const trendUp = trend ?? true;

  return (
    <div className="card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-60 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-2 font-mono">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {trendUp ? (
                <TrendingUp size={12} className={accent === "green" ? "text-green" : "text-jaffa"} />
              ) : (
                <TrendingDown size={12} className="text-danger" />
              )}
              <span className={cn("text-xs font-medium", trendUp ? "text-green" : "text-danger")}>
                {change}
              </span>
              <span className="text-xs opacity-60">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", style.bg)}>
          <Icon size={18} className={style.icon} />
        </div>
      </div>
    </div>
  );
}
