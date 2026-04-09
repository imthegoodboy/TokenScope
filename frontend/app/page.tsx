"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import {
  Zap,
  DollarSign,
  Cpu,
  ArrowRight,
  BarChart3,
  Wand2,
  Key,
  Shield,
  Layers,
  Globe,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart3,
    title: "3D Usage Dashboard",
    desc: "Interactive 3D visualizations of your token usage. Drag, rotate, and explore your AI spend.",
    accent: "jaffa",
  },
  {
    icon: Wand2,
    title: "TF-IDF Prompt Analysis",
    desc: "Warm color-coded token importance map. Know exactly which words drive your costs.",
    accent: "green",
  },
  {
    icon: DollarSign,
    title: "Cost Tracking",
    desc: "Real-time cost estimation per call with provider-specific pricing for OpenAI, Anthropic & Gemini.",
    accent: "navy",
  },
  {
    icon: Layers,
    title: "GitHub-style Activity",
    desc: "See your API call activity over time with a contribution graph — like GitHub but for AI usage.",
    accent: "jaffa",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "API keys stored as SHA-256 hashes. Per-user isolation via Clerk. Your data stays yours.",
    accent: "green",
  },
  {
    icon: Globe,
    title: "Multi-Provider",
    desc: "Connect OpenAI, Anthropic Claude, and Google Gemini. All in one unified dashboard.",
    accent: "navy",
  },
];

const stats = [
  { label: "Tokens Tracked", value: "12.4M+" },
  { label: "API Calls", value: "1.2M+" },
  { label: "Cost Saved", value: "$28K+" },
  { label: "Users", value: "3,400+" },
];

const providers = [
  { name: "OpenAI", color: "#F07F3C", short: "OA" },
  { name: "Anthropic", color: "#16563B", short: "AN" },
  { name: "Google Gemini", color: "#002F4B", short: "GM" },
];

export default function LandingPage() {
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) router.replace("/dashboard");
  }, [userId, router]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black-border bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative">
            <Image src="/logo.svg" alt="TokenScope" width={32} height={32} />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight leading-none">TokenScope</span>
            <span className="block text-[10px] text-black-soft tracking-wide uppercase">Token Analytics</span>
          </div>
        </div>
        <SignedOut>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-black-muted">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Get Started Free</Button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <Button onClick={() => router.push("/dashboard")} size="sm">
            Open Dashboard <ArrowRight size={14} />
          </Button>
        </SignedIn>
      </nav>

      {/* Hero */}
      <section className="relative px-8 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-jaffa/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-green/4 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-jaffa/8 border border-jaffa/20 text-xs font-semibold text-jaffa-dark mb-8 animate-fade-in">
            <Zap size={11} />
            AI Token Analytics Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-slide-up leading-tight">
            Track &amp; Optimize
            <br />
            <span className="text-jaffa">Your AI Spend</span>
          </h1>
          <p className="text-base opacity-60 max-w-xl mx-auto mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: "100ms" }}>
            Connect your OpenAI, Anthropic &amp; Gemini API keys. Track every token,
            visualize in 3D, and get AI-powered prompt optimization.
          </p>
          <div className="flex items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SignUpButton mode="modal">
              <Button size="lg">
                Start Free <ArrowRight size={16} />
              </Button>
            </SignUpButton>
            <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")}>
              View Demo
            </Button>
          </div>

          {/* Providers logos */}
          <div className="flex items-center justify-center gap-6 mt-12 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <span className="text-xs opacity-40 font-medium uppercase tracking-wider">Supports</span>
            {providers.map((p) => (
              <div key={p.name} className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.short}
                </div>
                <span className="text-xs font-medium text-black-soft">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-8 py-14 border-y border-black-border bg-surface">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-jaffa">{s.value}</div>
              <div className="text-sm opacity-60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to control AI costs</h2>
            <p className="opacity-60 max-w-xl mx-auto">
              From real-time tracking to TF-IDF optimization — complete visibility into your AI usage.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 cursor-default"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    f.accent === "jaffa"
                      ? "bg-jaffa/10"
                      : f.accent === "green"
                      ? "bg-green/10"
                      : "bg-navy/10"
                  }`}
                >
                  <f.icon
                    size={20}
                    className={
                      f.accent === "jaffa"
                        ? "text-jaffa"
                        : f.accent === "green"
                        ? "text-green"
                        : "text-navy"
                    }
                  />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-16 border-y border-black-border bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Add your API key", desc: "Connect OpenAI, Anthropic, or Gemini API keys in seconds. We validate and store them securely." },
              { step: "02", title: "Track every call", desc: "Every API request is logged with token counts, costs, and timestamps. Per-user isolation." },
              { step: "03", title: "Optimize & save", desc: "Use TF-IDF analysis to identify high-impact tokens and reduce your AI spend." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-jaffa text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-jaffa/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-jaffa flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Key size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Start tracking in 30 seconds</h2>
              <p className="opacity-60 mb-8 text-sm">
                Add your first API key and see your usage dashboard immediately.
                No setup, no configuration, just results.
              </p>
              <SignUpButton mode="modal">
                <Button size="lg">
                  Create Free Account <ArrowRight size={16} />
                </Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-black-border text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 relative">
            <Image src="/icon.svg" alt="" width={16} height={16} />
          </div>
          <span className="text-xs opacity-40">TokenScope — AI Token Analytics</span>
        </div>
      </footer>
    </div>
  );
}
