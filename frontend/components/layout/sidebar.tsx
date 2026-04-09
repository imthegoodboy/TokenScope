"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Key,
  Wand2,
  History,
  BarChart3,
  Settings,
  Zap,
  GitBranch,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/analyzer", label: "Prompt Analyzer", icon: Wand2 },
  { href: "/dashboard/history", label: "Usage History", icon: History },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-black-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-black-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-jaffa rounded-lg flex items-center justify-center shadow-sm">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-semibold text-lg text-black tracking-tight">
              TokenScope
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-jaffa text-white shadow-sm"
                  : "text-black-muted hover:text-black hover:bg-black/5"
              )}
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Plan */}
      <div className="px-4 py-4 border-t border-black-border">
        <div className="px-3 py-2.5 rounded-lg bg-jaffa-bg border border-jaffa/20">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-jaffa-dark">Free Plan</p>
            <p className="text-xs text-jaffa-dark opacity-70">3/25 keys</p>
          </div>
          <div className="h-1.5 bg-jaffa/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-jaffa rounded-full transition-all duration-500"
              style={{ width: "12%" }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
