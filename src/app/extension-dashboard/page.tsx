'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles, TrendingUp, DollarSign, Target, Zap, Clock,
  BarChart3, Activity, ArrowRight, Check, X, RefreshCw,
  ChevronDown, Eye, EyeOff, Star, Calendar, Download, Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Optimization {
  id: number;
  original_prompt: string;
  optimized_prompt: string;
  original_tokens: number;
  optimized_tokens: number;
  tokens_saved: number;
  cost_saved: number;
  target_model: string;
  source: string;
  accepted: boolean;
  created_at: string;
}

interface Stats {
  total_prompts: number;
  total_tokens_saved: number;
  total_cost_saved: number;
  weekly_prompts: number;
  weekly_tokens_saved: number;
}

interface DashboardData {
  optimization: {
    total_prompts: number;
    total_tokens_saved: number;
    total_cost_saved: number;
  };
  proxies: {
    count: number;
  };
  usage: {
    total_tokens: number;
    total_cost: number;
    request_count: number;
  };
}

const CHART_COLORS = ['#FF6B00', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function ExtensionDashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const userId = user.id;

      const [historyRes, statsRes, dashboardRes] = await Promise.all([
        fetch(`${apiUrl}/extension/history/${userId}?limit=100`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${apiUrl}/extension/stats/${userId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${apiUrl}/extension/dashboard-stats/${userId}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      setOptimizations(historyRes);
      setStats(statsRes);
      setDashboardData(dashboardRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in?redirect=extension-dashboard');
    }

    if (isLoaded && isSignedIn && user) {
      loadData();
    }
  }, [isLoaded, isSignedIn, user, loadData, router]);

  // Filter optimizations by period
  const filteredOptimizations = optimizations.filter(opt => {
    if (selectedPeriod === 'all') return true;
    const optDate = new Date(opt.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - optDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= (selectedPeriod === '7d' ? 7 : 30);
  });

  // Calculate chart data
  const chartData = filteredOptimizations.reduce((acc, opt) => {
    const date = new Date(opt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = acc.find(a => a.date === date);
    if (existing) {
      existing.tokens_saved += opt.tokens_saved;
      existing.prompts += 1;
    } else {
      acc.push({ date, tokens_saved: opt.tokens_saved, prompts: 1 });
    }
    return acc;
  }, [] as { date: string; tokens_saved: number; prompts: number }[]).reverse();

  // Model distribution
  const modelDistribution = optimizations.reduce((acc, opt) => {
    const model = opt.target_model || 'unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(modelDistribution).map(([name, value]) => ({
    name,
    value
  }));

  // Source distribution
  const sourceDistribution = optimizations.reduce((acc, opt) => {
    const source = opt.source || 'extension';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate improvements
  const totalOriginalTokens = optimizations.reduce((sum, opt) => sum + opt.original_tokens, 0);
  const totalOptimizedTokens = optimizations.reduce((sum, opt) => sum + opt.optimized_tokens, 0);
  const avgImprovement = totalOriginalTokens > 0 ? Math.round(((totalOriginalTokens - totalOptimizedTokens) / totalOriginalTokens) * 100) : 0;

  // Group by week
  const weeklyData = optimizations.reduce((acc, opt) => {
    const date = new Date(opt.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!acc[weekKey]) {
      acc[weekKey] = { prompts: 0, tokens_saved: 0, cost_saved: 0 };
    }
    acc[weekKey].prompts += 1;
    acc[weekKey].tokens_saved += opt.tokens_saved;
    acc[weekKey].cost_saved += opt.cost_saved;

    return acc;
  }, {} as Record<string, { prompts: number; tokens_saved: number; cost_saved: number }>);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatMoney = (num: number) => {
    if (num >= 1) return '$' + num.toFixed(2);
    if (num >= 0.01) return '$' + num.toFixed(4);
    return '$' + num.toFixed(6);
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange to-orange-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <span className="text-orange font-bold text-xl">TS</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-black">Extension Dashboard</h1>
                  <p className="text-black/70">Prompt optimization insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="p-3 bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-black ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Full Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center">
                <Sparkles className="text-orange w-6 h-6" />
              </div>
              <span className="text-gray-400 text-sm">Total Optimizations</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : formatNumber(stats?.total_prompts || dashboardData?.optimization?.total_prompts || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {stats?.weekly_prompts || 0} this week
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-green-400 w-6 h-6" />
              </div>
              <span className="text-gray-400 text-sm">Tokens Saved</span>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {loading ? '...' : formatNumber(stats?.total_tokens_saved || dashboardData?.optimization?.total_tokens_saved || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              ~{formatNumber(stats?.weekly_tokens_saved || 0)} this week
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="text-blue-400 w-6 h-6" />
              </div>
              <span className="text-gray-400 text-sm">Cost Saved</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {loading ? '...' : formatMoney(stats?.total_cost_saved || dashboardData?.optimization?.total_cost_saved || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Estimated savings
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Target className="text-purple-400 w-6 h-6" />
              </div>
              <span className="text-gray-400 text-sm">Avg Improvement</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {loading ? '...' : `${avgImprovement}%`}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Per optimization
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Tokens Saved Over Time */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange" />
                Tokens Saved Over Time
              </h2>
              <div className="flex gap-2">
                {(['7d', '30d', 'all'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-orange text-black'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {period === 'all' ? 'All' : period === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens_saved"
                    stroke="#FF6B00"
                    fill="url(#tokenGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                <p>No data yet</p>
              </div>
            )}
          </div>

          {/* Model Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange" />
              Model Distribution
            </h2>
            {pieData.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-500">
                <Target className="w-12 h-12 mb-3 opacity-50" />
                <p>No data yet</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-gray-400">{entry.name}</span>
                  <span className="text-sm text-white font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Improvement Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-orange" />
            What Was Improved
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-black/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="text-blue-400 w-4 h-4" />
                </div>
                <span className="text-sm text-gray-400">Original Prompts</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {formatNumber(totalOriginalTokens)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total tokens analyzed</div>
            </div>

            <div className="bg-black/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Check className="text-green-400 w-4 h-4" />
                </div>
                <span className="text-sm text-gray-400">Optimized Prompts</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatNumber(totalOptimizedTokens)}
              </div>
              <div className="text-xs text-gray-500 mt-1">After optimization</div>
            </div>

            <div className="bg-black/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-orange/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-orange w-4 h-4" />
                </div>
                <span className="text-sm text-gray-400">Net Savings</span>
              </div>
              <div className="text-2xl font-bold text-orange">
                {formatNumber(totalOriginalTokens - totalOptimizedTokens)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Tokens saved</div>
            </div>
          </div>
        </div>

        {/* Optimization History */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange" />
              Optimization History
            </h2>
            <span className="text-sm text-gray-500">
              {filteredOptimizations.length} optimizations
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-3">Loading history...</p>
            </div>
          ) : filteredOptimizations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No optimizations yet</p>
              <p className="text-gray-600 text-sm mt-1">Use the extension to optimize prompts</p>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-orange hover:underline mt-4"
              >
                Learn how <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOptimizations.map((opt) => (
                <div
                  key={opt.id}
                  className="bg-black/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        opt.source === 'backend' || opt.source === 'synced'
                          ? 'bg-green-500/20'
                          : 'bg-orange/20'
                      }`}>
                        {opt.source === 'backend' || opt.source === 'synced' ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-orange" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">
                            {opt.tokens_saved > 0 ? `-${Math.round((opt.tokens_saved / opt.original_tokens) * 100)}%` : '0%'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            opt.source === 'extension'
                              ? 'bg-blue-500/20 text-blue-400'
                              : opt.source === 'dashboard'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {opt.source || 'extension'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(opt.created_at).toLocaleString()} · {opt.target_model}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-orange" />
                        {opt.tokens_saved} saved
                      </span>
                      {opt.cost_saved > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          {formatMoney(opt.cost_saved)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-3">
                      <div className="text-xs text-red-400 mb-1 font-medium">Original ({opt.original_tokens} tokens)</div>
                      <p className="text-sm text-gray-300">{opt.original_prompt}</p>
                    </div>

                    <button
                      onClick={() => setExpandedId(expandedId === opt.id ? null : opt.id)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-400 py-1"
                    >
                      {expandedId === opt.id ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Hide Optimized
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          Show Optimized
                        </>
                      )}
                    </button>

                    {expandedId === opt.id && (
                      <div className="bg-green-900/20 border border-green-900/30 rounded-lg p-3">
                        <div className="text-xs text-green-400 mb-1 font-medium">Optimized ({opt.optimized_tokens} tokens)</div>
                        <p className="text-sm text-gray-300">{opt.optimized_prompt}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        {Object.keys(weeklyData).length > 0 && (
          <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange" />
              Weekly Summary
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(weeklyData).reverse().map(([week, data]) => (
                <div key={week} className="bg-black/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">{week}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-lg font-bold text-white">{data.prompts}</div>
                      <div className="text-xs text-gray-500">Prompts</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-400">{data.tokens_saved}</div>
                      <div className="text-xs text-gray-500">Tokens</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">{formatMoney(data.cost_saved)}</div>
                      <div className="text-xs text-gray-500">Saved</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Prompt Optimizer */}
        <div className="mt-8 bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange" />
            Quick Prompt Optimizer
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Paste your prompt below and see how it can be optimized for better results and token savings.
          </p>
          <PromptOptimizer />
        </div>
      </div>
    </div>
  );
}

// Quick Prompt Optimizer Component
function PromptOptimizer() {
  const [prompt, setPrompt] = useState('');
  const [optimized, setOptimized] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOptimize = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setOptimized('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          target_model: 'chatgpt',
          user_id: 'optimizer'
        })
      });

      if (!response.ok) throw new Error('Optimization failed');

      const data = await response.json();
      if (data.suggestion?.text) {
        setOptimized(data.suggestion.text);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to optimize prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Your Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full h-32 bg-black/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:border-orange focus:ring-1 focus:ring-orange resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Optimized Prompt</label>
          <div className={`h-32 bg-black/50 border rounded-lg p-3 overflow-auto ${
            error ? 'border-red-500' : optimized ? 'border-green-500' : 'border-gray-700'
          }`}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : optimized ? (
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{optimized}</p>
            ) : (
              <p className="text-gray-500 text-sm">Optimized prompt will appear here...</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {prompt.split(' ').filter(w => w.length > 0).length} words, {prompt.length} characters
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setPrompt(''); setOptimized(''); setError(''); }}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Clear
          </button>
          <button
            onClick={handleOptimize}
            disabled={!prompt.trim() || loading}
            className="px-6 py-2 bg-orange hover:bg-orange-light text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Optimize
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}