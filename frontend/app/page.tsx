"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Zap,
  ArrowRight,
  BarChart3,
  Wand2,
  Key,
  Shield,
  Layers,
  Globe,
  Terminal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: Terminal,
    title: "Proxy Gateway",
    desc: "Route your AI requests through TokenScope. Get a single endpoint for OpenAI, Anthropic & Gemini.",
    accent: "jaffa",
  },
  {
    icon: BarChart3,
    title: "3D Usage Dashboard",
    desc: "Interactive 3D visualizations of your token usage. Drag, rotate, and explore your AI spend.",
    accent: "navy",
  },
  {
    icon: Wand2,
    title: "TF-IDF Prompt Analysis",
    desc: "Warm color-coded token importance. Know exactly which words drive your costs.",
    accent: "green",
  },
  {
    icon: Layers,
    title: "GitHub-style Activity",
    desc: "See your API call activity over time with a contribution graph.",
    accent: "jaffa",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "API keys encrypted at rest. Per-user isolation. Your data stays yours.",
    accent: "green",
  },
  {
    icon: Sparkles,
    title: "Auto-Enhance",
    desc: "Automatically optimize prompts before sending to reduce token usage and save money.",
    accent: "navy",
  },
];

// Particle component
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // Mouse repulsion
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx -= (dx / dist) * 0.02;
          p.vy -= (dy / dist) * 0.02;
        }

        // Apply velocity
        p.x += p.vx;
        p.y += p.vy;

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 127, 60, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particlesRef.current.forEach((a, i) => {
        particlesRef.current.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(240, 127, 60, ${0.05 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// Floating badge that follows mouse slightly
function FloatingBadge() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    const handleMouse = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 20;
      targetY = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener("mousemove", handleMouse);

    const animate = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      setPos({ x: currentX, y: currentY });
      requestAnimationFrame(animate);
    };
    animate();

    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        top: "15%",
        right: "10%",
        zIndex: 1,
      }}
    >
      <div className="bg-white/80 backdrop-blur-sm border border-black-border rounded-xl px-4 py-2 shadow-lg shadow-black/5 animate-float">
        <p className="text-xs font-bold text-jaffa">Auto-Enhance Active</p>
        <p className="text-[10px] text-black-soft mt-0.5">-23% tokens saved</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {mounted && <Particles />}
      {mounted && <FloatingBadge />}

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-black-border bg-bg/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative">
            <Image src="/logo.svg" alt="TokenScope" width={32} height={32} />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight leading-none">TokenScope</span>
            <span className="block text-[10px] text-black-soft tracking-wide uppercase">API Gateway</span>
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
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push("/dashboard")} size="sm">
              Dashboard <ArrowRight size={14} className="ml-0.5" />
            </Button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
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
            AI API Proxy Gateway
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-slide-up leading-tight">
            One endpoint.
            <br />
            <span className="text-jaffa">Every AI model.</span>
          </h1>
          <p className="text-base opacity-60 max-w-xl mx-auto mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: "100ms" }}>
            Route OpenAI, Anthropic & Gemini through a single gateway.
            Track every token. Auto-enhance prompts. Zero vendor lock-in.
          </p>
          <div className="flex items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SignedOut>
              <>
                <SignUpButton mode="modal">
                  <Button size="lg">
                    Start Free <ArrowRight size={16} />
                  </Button>
                </SignUpButton>
                <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")}>
                  View Demo
                </Button>
              </>
            </SignedOut>
            <SignedIn>
              <Button size="lg" onClick={() => router.push("/dashboard")}>
                Go to Dashboard <ArrowRight size={16} />
              </Button>
            </SignedIn>
          </div>

          {/* Provider logos */}
          <div className="flex items-center justify-center gap-8 mt-14 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <span className="text-xs opacity-30 font-medium uppercase tracking-wider">Supports</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group cursor-pointer">
                <div className="w-6 h-6 relative">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg"
                    alt="OpenAI"
                    width={24}
                    height={24}
                    className="object-contain brightness-0 group-hover:brightness-100 transition-all"
                    style={{ filter: "brightness(0) opacity(0.6) invert(20%) sepia(90%) saturate(2000%) hue-rotate(5deg)" }}
                    unoptimized
                  />
                </div>
                <span className="text-xs font-medium text-black-soft group-hover:text-black transition-colors">OpenAI</span>
              </div>
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group cursor-pointer">
                <div className="w-6 h-6 relative">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/1/14/Anthropic.png"
                    alt="Anthropic"
                    width={24}
                    height={24}
                    className="object-contain brightness-0 group-hover:brightness-100 transition-all"
                    style={{ filter: "invert(10%) sepia(90%) saturate(500%) hue-rotate(120deg)" }}
                    unoptimized
                  />
                </div>
                <span className="text-xs font-medium text-black-soft group-hover:text-black transition-colors">Anthropic</span>
              </div>
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group cursor-pointer">
                <div className="w-6 h-6 relative">
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Google_Gemini_logo_2025.svg"
                    alt="Google Gemini"
                    width={24}
                    height={24}
                    className="object-contain brightness-0 group-hover:brightness-100 transition-all"
                    style={{ filter: "invert(20%) sepia(90%) saturate(300%) hue-rotate(180deg)" }}
                    unoptimized
                  />
                </div>
                <span className="text-xs font-medium text-black-soft group-hover:text-black transition-colors">Gemini</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-8 py-14 border-y border-black-border bg-surface">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8">
          {[
            { label: "AI Providers", value: "3" },
            { label: "Proxy Keys", value: "Unlimited" },
            { label: "Request Logs", value: "Live" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-jaffa">{s.value}</div>
              <div className="text-sm opacity-60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need for AI routing</h2>
            <p className="opacity-60 max-w-xl mx-auto">
              From proxy routing to TF-IDF optimization — complete control over your AI API usage.
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
      <section className="relative z-10 px-8 py-16 border-y border-black-border bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Add your API keys", desc: "Connect OpenAI, Anthropic, or Gemini API keys in your dashboard. Encrypted and secure." },
              { step: "02", title: "Create a proxy key", desc: "Get an OpenAI-compatible endpoint. Use it in your code instead of calling providers directly." },
              { step: "03", title: "Track & optimize", desc: "Every request is logged. Enable auto-enhance to automatically reduce token usage." },
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
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-jaffa/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-jaffa flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Key size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Start routing in 30 seconds</h2>
              <p className="opacity-60 mb-8 text-sm">
                Add your API key, create a proxy endpoint, and start tracking. No configuration needed.
              </p>
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg">
                    Create Free Account <ArrowRight size={16} />
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  Open your dashboard <ArrowRight size={16} />
                </Button>
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-8 border-t border-black-border text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 relative">
            <Image src="/icon.svg" alt="" width={16} height={16} />
          </div>
          <span className="text-xs opacity-40">TokenScope — AI API Gateway & Analytics</span>
        </div>
      </footer>
    </div>
  );
}
