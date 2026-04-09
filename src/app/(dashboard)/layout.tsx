'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { LayoutDashboard, FileText, Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';

function DashboardNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/optimizer', label: 'Optimizer', icon: Sparkles },
    { href: '/docs', label: 'Docs', icon: FileText },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange to-orange-light rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">TS</span>
          </div>
          <span className="text-xl font-bold text-white">
            Token<span className="text-orange">Scope</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-black border-b border-gray-800">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white"
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen pt-16 bg-black">
        {children}
      </main>
    </>
  );
}
