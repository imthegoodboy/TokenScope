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
    ring: "ring-jaffa/20",
  },
  green: {
    bg: "bg-green/8",
    icon: "text-green",
    ring: "ring-green/20",
  },
  navy: {
    bg: "bg-navy/8",
    icon: "text-navy",
    ring: "ring-navy/20",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  trend,
  accent = "jaffa",
}: StatsCardProps) {
  const style = accentStyles[accent];
  const trendUp = trend ?? true;

  return (
    <div className={cn("card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5", style.ring)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium opacity-50 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1.5 font-mono">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5 mt-2">
              {trendUp ? (
                <TrendingUp size={11} className="text-green" />
              ) : (
                <TrendingDown size={11} className="text-danger" />
              )}
              <span className={cn("text-[11px] font-semibold", trendUp ? "text-green" : "text-danger")}>
                {change}
              </span>
              <span className="text-[11px] opacity-40">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", style.bg)}>
          <Icon size={18} className={style.icon} />
        </div>
      </div>
    </div>
  );
}
