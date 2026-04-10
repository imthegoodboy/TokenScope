'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Zap, Shield, TrendingUp, Code, BarChart3, Sparkles, Star, ChevronDown, Play, Check, Users, Puzzle, MessageSquare, Download } from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';

const HERO_VIDEO_SRC =
  '/4K%20UHD%2025fps%20FREE%20Video%20Background%20Stars%20Space%20Trip_1080p60.mp4';

/* ───── Interactive Footer: giant "TokenScope" with particle + sweep shine ───── */
function FooterSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[]>([]);
  const rafRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const spawnParticles = useCallback((mx: number, my: number) => {
    const colors = ['#FF6B00', '#FF8C33', '#FFB366', '#ffffff', '#FFA500', '#FF4500'];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.5;
      particlesRef.current.push({
        x: mx + (Math.random() - 0.5) * 40,
        y: my + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 50 + Math.random() * 60,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      spawnParticles(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener('mousemove', handleMove);

    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.015;
        p.vx *= 0.995;
        p.life -= 1;

        const alpha = Math.max(0, p.life / p.maxLife);
        const r = p.size * alpha;

        // Outer glow
        ctx.globalAlpha = alpha * 0.12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Core
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMove);
    };
  }, [spawnParticles]);

  return (
    <footer className="relative overflow-hidden">
      {/* Gradient that blends from the CTA section's orange tint into the footer */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange/[0.06] via-black/95 to-black pointer-events-none" />

      {/* Interactive area */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center py-28 md:py-40 lg:py-52 cursor-default select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Radial glow behind text on hover */}
        <div
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={{
            opacity: isHovered ? 1 : 0,
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,107,0,0.08) 0%, transparent 70%)',
          }}
        />

        {/* The giant text */}
        <h2
          className="footer-giant-text relative z-0 font-black leading-none tracking-tighter text-transparent select-none"
          style={{
            fontSize: 'clamp(80px, 18vw, 320px)',
            WebkitTextStroke: isHovered ? '2px rgba(255,107,0,0.25)' : '2px rgba(255,255,255,0.06)',
            transition: '-webkit-text-stroke 0.5s ease',
          }}
        >
          TokenScope
        </h2>
      </div>

      <style jsx>{`
        .footer-giant-text {
          background-image: linear-gradient(
            120deg,
            transparent 20%,
            rgba(255, 107, 0, 0.0) 35%,
            rgba(255, 140, 51, 0.0) 50%,
            rgba(255, 107, 0, 0.0) 65%,
            transparent 80%
          );
          background-size: 300% 100%;
          background-position: 100% center;
          -webkit-background-clip: text;
          background-clip: text;
          transition: background-position 0s, -webkit-text-stroke 0.5s ease;
        }
        .footer-giant-text:hover {
          background-image: linear-gradient(
            120deg,
            transparent 20%,
            rgba(255, 107, 0, 0.12) 35%,
            rgba(255, 180, 80, 0.3) 50%,
            rgba(255, 107, 0, 0.12) 65%,
            transparent 80%
          );
          animation: footerSweep 1.8s ease forwards;
        }
        @keyframes footerSweep {
          0%   { background-position: 100% center; }
          100% { background-position: -100% center; }
        }
      `}</style>
    </footer>
  );
}

function LandingContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  // Only redirect to dashboard from home page if signed in
  // Don't redirect from other pages
  useEffect(() => {
    if (isSignedIn && pathname === '/') {
      // Optional: show a "go to dashboard" button instead of auto-redirect
      // router.push('/dashboard');
    }
  }, [isSignedIn, pathname, router]);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Proxy URLs',
      description: 'Generate unique proxy URLs in seconds and start tracking immediately',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Real-time Analytics',
      description: 'Monitor token usage, costs, and latency with live dashboards',
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'TF-IDF Optimization',
      description: 'Automatically enhance prompts to reduce token usage by 20-40%',
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Multi-Provider Support',
      description: 'OpenAI, Gemini, and Anthropic in one unified interface',
    },
    {
      icon: <Puzzle className="w-6 h-6" />,
      title: 'Chrome Extension',
      description: 'Optimize prompts anywhere with our VS Code-style inline suggestions',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Team Groups',
      description: 'Create groups, share codes, and track team-wide usage and savings',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Attention Scores',
      description: 'Track which prompts are working best with AI attention analysis',
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'Export Reports',
      description: 'Download team usage reports and member stats as PDF',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Cost Tracking',
      description: 'Track spending across all providers with detailed breakdowns',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure Storage',
      description: 'Your API keys are stored securely and never exposed',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'AI Engineer at TechCorp',
      content: 'TokenScope saved us 35% on API costs. The TF-IDF optimization is incredible.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Founder at AI Startup',
      content: 'The real-time dashboard is exactly what we needed. No more guessing our LLM costs.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'ML Lead at DataCo',
      content: 'Setup took 2 minutes. Been using it for 3 months now. Highly recommend!',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={40} rounded="xl" priority />
            <span className="text-xl font-bold">
              Token<span className="text-orange">Scope</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-2 bg-orange hover:bg-orange-light text-black font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
      >
        {/* Full-viewport video background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={heroVideoRef}
            className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover w-auto h-auto"
            style={{ minWidth: '100%', minHeight: '100%' }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
          {/* Readability: vignette + brand-tinted dark wash */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/90"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-tr from-orange/15 via-transparent to-transparent mix-blend-overlay"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              transform: `translateY(${scrollY * 0.15}px)`,
            }}
            aria-hidden
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange/10 border border-orange/20 rounded-full mb-8 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-orange" />
            <span className="text-sm text-orange">AI-Powered Token Analytics</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            Smart Proxy for
            <br />
            <span className="bg-gradient-to-r from-orange to-orange-light bg-clip-text text-transparent">
              LLM APIs
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            Track, optimize, and analyze your AI API usage. Reduce costs with TF-IDF
            prompt optimization and real-time analytics.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/sign-up"
              className="group flex items-center gap-2 px-8 py-4 bg-orange hover:bg-orange-light text-black font-semibold rounded-xl transition-all hover:scale-105"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gray-500 rounded-xl transition-colors"
            >
              <Play className="w-5 h-5" />
              View Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            {[
              { value: '10M+', label: 'Tokens Tracked' },
              { value: '40%', label: 'Cost Savings' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-orange">{stat.value}</div>
                <div className="text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/50 drop-shadow-md" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to
              <span className="text-orange"> Optimize</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Powerful features to track, analyze, and optimize your LLM API usage
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-orange/50 transition-all hover:scale-[1.02]"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center text-orange mb-4 group-hover:bg-orange group-hover:text-black transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chrome Extension Section */}
      <section className="py-32 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-orange">Chrome Extension</span> - AI Prompts Anywhere
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Works on ChatGPT, Claude, Gemini, and any website with AI chat
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center text-orange font-bold">1</div>
                  <div>
                    <h3 className="font-semibold mb-1">Type Naturally</h3>
                    <p className="text-gray-400 text-sm">Write your prompt as you normally would</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center text-orange font-bold">2</div>
                  <div>
                    <h3 className="font-semibold mb-1">AI Optimizes</h3>
                    <p className="text-gray-400 text-sm">Our TF-IDF engine analyzes and suggests improvements</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center text-orange font-bold">3</div>
                  <div>
                    <h3 className="font-semibold mb-1">Press Tab to Accept</h3>
                    <p className="text-gray-400 text-sm">One keypress to use the optimized version</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="bg-black rounded-lg p-4 mb-4 font-mono text-sm">
                <div className="text-gray-500 mb-2">// Your prompt</div>
                <div className="text-gray-300 mb-4">Write a function that takes a list and returns the sum of all numbers</div>
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="text-green-400 mb-2">✨ Optimized: Save 25% tokens</div>
                  <div className="text-white">Write a function to sum a list of numbers</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Press <kbd className="bg-gray-700 px-2 py-1 rounded">Tab</kbd> to accept</span>
                <span className="text-orange">⚡ -25% tokens</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Groups Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-orange">Team Collaboration</span> - Track Together
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Create groups, share codes, and monitor everyone's usage in one place
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl text-center">
              <div className="w-16 h-16 bg-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Group</h3>
              <p className="text-gray-400 text-sm">Admin creates a group and gets a unique 8-character code</p>
            </div>
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl text-center">
              <div className="w-16 h-16 bg-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Share Code</h3>
              <p className="text-gray-400 text-sm">Members join using the code and their usage is tracked</p>
            </div>
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl text-center">
              <div className="w-16 h-16 bg-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-semibold mb-2">View Dashboard</h3>
              <p className="text-gray-400 text-sm">Admin sees all members' stats, attention scores, and exports reports</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How <span className="text-orange">TokenScope</span> Works
            </h2>
            <p className="text-gray-400">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Proxy URL',
                description: 'Add your API key and configure settings like temperature and max tokens',
              },
              {
                step: '02',
                title: 'Use in Your App',
                description: 'Replace the direct API URL with your TokenScope proxy URL',
              },
              {
                step: '03',
                title: 'Track & Optimize',
                description: 'Monitor usage, costs, and let TF-IDF optimization reduce your bills',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-gray-800/50 absolute -top-8 -left-4">
                  {item.step}
                </div>
                <div className="relative pt-12">
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Loved by <span className="text-orange">Developers</span>
            </h2>
            <p className="text-gray-400">See what our users are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-orange text-orange" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange/20 via-orange/10 to-orange/20" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Optimize Your
            <br />
            <span className="text-orange">LLM Costs?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of developers using TokenScope to reduce their AI costs
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}

export default function Home() {
  return <LandingContent />;
}
