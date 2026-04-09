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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/analyzer", label: "Analyzer", icon: Wand2 },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-black-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-black-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-cream" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg text-black tracking-tight">
            TokenScope
          </span>
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
                  ? "bg-black text-cream"
                  : "text-black-muted hover:text-black hover:bg-black/5"
              )}
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-black-border">
        <div className="px-3 py-2 rounded-lg bg-black/5">
          <p className="text-xs font-medium text-black">Free Plan</p>
          <div className="mt-1.5 h-1.5 bg-black-border rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full" style={{ width: "12%" }} />
          </div>
          <p className="text-xs text-black-muted mt-1">3 of 25 API keys used</p>
        </div>
      </div>
    </aside>
  );
}
