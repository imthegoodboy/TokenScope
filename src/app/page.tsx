'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Zap, Shield, TrendingUp, Code, BarChart3, Sparkles, Star, ChevronDown, Play, Check } from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);

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
            <div className="w-10 h-10 bg-gradient-to-br from-orange to-orange-light rounded-xl flex items-center justify-center">
              <span className="text-black font-bold">TS</span>
            </div>
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
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange/20 rounded-full blur-[128px] animate-pulse"
            style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)` }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange/10 rounded-full blur-[128px] animate-pulse"
            style={{
              animationDelay: '1s',
              transform: `translate(${-scrollY * 0.1}px, ${-scrollY * 0.05}px)`,
            }}
          />
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              transform: `translateY(${scrollY * 0.2}px)`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-500" />
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
      <footer className="py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange to-orange-light rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">TS</span>
              </div>
              <span className="font-bold">
                Token<span className="text-orange">Scope</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
            <div className="text-gray-500 text-sm">
              2026 TokenScope. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <LandingContent />;
}
