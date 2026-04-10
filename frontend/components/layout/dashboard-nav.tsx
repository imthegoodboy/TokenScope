"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { BookOpen, Settings, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/docs", label: "Docs", icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [showExtModal, setShowExtModal] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-black-border">
        <div className="flex items-center justify-between px-6 h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5" title="Dashboard">
              <div className="w-7 h-7 relative flex-shrink-0">
                <Image src="/logo.svg" alt="TokenScope" width={28} height={28} className="w-full h-full" />
              </div>
              <span className="font-bold text-base tracking-tight hidden sm:inline">TokenScope</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1 ml-2">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-jaffa text-white"
                        : "text-black-soft hover:text-black hover:bg-black/5"
                    )}
                  >
                    {item.icon && <item.icon size={14} />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Extension + User */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExtModal(true)}
              className="border-jaffa/30 text-jaffa hover:bg-jaffa/5 hidden sm:flex"
            >
              <Puzzle size={14} />
              Get Extension
            </Button>
            <UserButton
              appearance={{
                elements: { avatarBox: "w-8 h-8" },
              }}
            />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-1 px-4 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-jaffa text-white"
                    : "text-black-soft hover:bg-black/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setShowExtModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-jaffa whitespace-nowrap"
          >
            <Puzzle size={12} /> Extension
          </button>
        </div>
      </nav>

      {/* Coming Soon Modal */}
      {showExtModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowExtModal(false)}>
          <div className="bg-surface border border-black-border rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-jaffa/10 flex items-center justify-center mx-auto mb-5">
              <Puzzle size={28} className="text-jaffa" />
            </div>
            <h3 className="font-bold text-xl mb-2">Coming Soon</h3>
            <p className="text-sm opacity-60 mb-6 leading-relaxed">
              The TokenScope browser extension will let you monitor and optimize AI API calls directly from your browser. Stay tuned!
            </p>
            <Button onClick={() => setShowExtModal(false)} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
