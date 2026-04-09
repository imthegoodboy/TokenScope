"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Zap, DollarSign, Cpu, ArrowRight, BarChart3, Wand2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart3,
    title: "3D Usage Dashboard",
    desc: "Interactive 3D visualizations of your token usage across OpenAI, Anthropic & Gemini.",
  },
  {
    icon: Wand2,
    title: "TF-IDF Prompt Analysis",
    desc: "Automatically highlight important tokens and suggest optimized prompts to cut costs.",
  },
  {
    icon: DollarSign,
    title: "Cost Tracking",
    desc: "Real-time cost estimation per call with provider-specific pricing models.",
  },
  {
    icon: Cpu,
    title: "Multi-Provider Support",
    desc: "Connect OpenAI, Anthropic Claude, and Google Gemini API keys in one place.",
  },
];

const stats = [
  { label: "Tokens Tracked", value: "12.4M+" },
  { label: "API Calls Analyzed", value: "1.2M+" },
  { label: "Cost Saved", value: "$28K+" },
  { label: "Prompts Optimized", value: "45K+" },
];

export default function LandingPage() {
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      router.replace("/dashboard");
    }
  }, [userId, router]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black-border bg-cream/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-cream" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg tracking-tight">TokenScope</span>
        </div>
        <SignedOut>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Get Started</Button>
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
      <section className="relative px-8 py-32 text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-black/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black-border text-xs font-medium text-black-muted mb-8 animate-fade-in">
            <Zap size={12} />
            AI Token Analytics Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-black leading-tight tracking-tight mb-6 animate-slide-up">
            Track &amp; Optimize
            <br />
            <span className="text-black/50">Your AI Spend</span>
          </h1>
          <p className="text-lg text-black-muted max-w-xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "100ms" }}>
            Connect your OpenAI, Anthropic &amp; Gemini API keys. Track every token,
            visualize your usage in 3D, and get AI-powered prompt optimization.
          </p>
          <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SignUpButton mode="modal">
              <Button size="lg">
                Start Free <ArrowRight size={16} />
              </Button>
            </SignUpButton>
            <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-8 py-16 border-y border-black-border bg-surface">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-black">{s.value}</div>
              <div className="text-sm text-black-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black mb-4">
              Everything you need to control AI costs
            </h2>
            <p className="text-black-muted max-w-xl mx-auto">
              From real-time tracking to intelligent prompt optimization — TokenScope
              gives you complete visibility into your AI usage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="card group hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center mb-4 group-hover:bg-black/10 transition-colors">
                  <f.icon size={20} className="text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2">{f.title}</h3>
                <p className="text-sm text-black-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mx-auto mb-6">
              <Key size={20} className="text-cream" />
            </div>
            <h2 className="text-2xl font-bold text-black mb-3">
              Start tracking in 30 seconds
            </h2>
            <p className="text-black-muted mb-8">
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
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-black-border text-center">
        <div className="flex items-center justify-center gap-2">
          <Zap size={14} className="text-black-muted" />
          <span className="text-sm text-black-muted">TokenScope — AI Token Analytics</span>
        </div>
      </footer>
    </div>
  );
}
