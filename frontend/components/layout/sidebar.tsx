"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Key,
  Wand2,
  History,
  BarChart3,
  Settings,
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
      <div className="px-6 py-5 border-b border-black-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 relative flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="TokenScope"
              width={36}
              height={36}
              className="w-full h-full"
            />
          </div>
          <div>
            <span className="font-bold text-base text-black tracking-tight leading-none block">
              TokenScope
            </span>
            <span className="text-[10px] text-black-soft mt-0.5 block tracking-wide uppercase">
              Token Analytics
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                  : "text-black-soft hover:text-black hover:bg-black/4"
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
        <div className="px-3 py-3 rounded-xl bg-jaffa/8 border border-jaffa/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-jaffa-dark">Free Plan</span>
            <span className="text-[10px] text-jaffa-dark/60">3/25 keys</span>
          </div>
          <div className="h-1.5 bg-jaffa/15 rounded-full overflow-hidden">
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
