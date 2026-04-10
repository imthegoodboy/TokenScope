'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Sparkles, TrendingUp, Clock, Target, Zap, DollarSign, MessageSquare, BarChart3, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Link2, AlertCircle } from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExtensionStats {
  total_optimizations: number;
  total_accepts: number;
  total_rejects: number;
  total_tokens_saved: number;
  total_cost_saved: number;
  avg_attention_score: number;
  acceptance_rate: number;
  weekly_optimizations: number;
  weekly_tokens_saved: number;
  weekly_cost_saved: number;
}

interface DailyStat {
  date: string;
  optimizations: number;
  tokens_saved: number;
  cost_saved: number;
  attention_score: number;
}

interface ChatbotStat {
  chatbot: string;
  total: number;
  tokens_saved: number;
  cost_saved: number;
  avg_attention_score: number;
}

interface HistoryItem {
  id: number;
  original_prompt: string;
  optimized_prompt: string;
  original_tokens: number;
  optimized_tokens: number;
  tokens_saved: number;
  cost_original: number;
  cost_optimized: number;
  cost_saved: number;
  attention_score: number;
  chatbot: string;
  accepted: boolean;
  created_at: string;
}

const CHATBOT_COLORS: Record<string, string> = {
  chatgpt: '#10A37F',
  claude: '#D97706',
  gemini: '#EAb308',
  perplexity: '#6366F1',
  manual: '#8B5CF6'
};

const CHATBOT_ICONS: Record<string, string> = {
  chatgpt: '🤖',
  claude: '🧠',
  gemini: '✨',
  perplexity: '🔍',
  manual: '✍️'
};

export default function ExtensionPage() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<ExtensionStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [chatbotStats, setChatbotStats] = useState<ChatbotStat[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const userId = user.id;

      // Check connection status
      const storedId = localStorage.getItem('tokenscope_user_id');
      setIsConnected(storedId === userId);

      const [statsRes, dailyRes, chatbotRes, historyRes] = await Promise.all([
        fetch(`${apiUrl}/extension/stats/overview`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch(`${apiUrl}/extension/stats/daily?days=30`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => []),

        fetch(`${apiUrl}/extension/stats/by-chatbot`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => []),

        fetch(`${apiUrl}/extension/history?limit=50`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      setStats(statsRes);
      setDailyStats(dailyRes);
      setChatbotStats(chatbotRes);
      setHistory(historyRes);
    } catch (err) {
      console.error('Failed to load extension stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sync user ID to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('tokenscope_user_id', user.id);
      localStorage.setItem('tokenscope_user_email', user.emailAddresses[0]?.emailAddress || '');
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
    }
  }, [isLoaded, user, loadData]);

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

  const chartData = dailyStats.map(day => ({
    date: day.date?.slice(5) || day.date,
    optimizations: day.optimizations || 0,
    tokensSaved: day.tokens_saved || 0,
    attentionScore: day.attention_score || 0
  })).reverse();

  const pieData = chatbotStats.map(stat => ({
    name: stat.chatbot,
    value: stat.total,
    color: CHATBOT_COLORS[stat.chatbot] || '#666'
  }));

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={48} rounded="xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Extension Stats</h1>
              <p className="text-gray-400 text-sm">Track your Chrome extension performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {isConnected ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm">{isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Connection Help */}
        {!isConnected && (
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="text-yellow-400" size={20} />
              <div>
                <p className="font-medium">Extension not connected to your account</p>
                <p className="text-sm text-gray-400">Connect your extension to sync your stats</p>
              </div>
            </div>
            <Link href="/connect" className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
              Connect Extension
            </Link>
          </div>
        )}

        {loading && !stats && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange/10 rounded-lg flex items-center justify-center">
                <Sparkles className="text-orange" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Total Optimizations</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatNumber(stats?.total_optimizations || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(stats?.weekly_optimizations || 0)} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Zap className="text-green-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Tokens Saved</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatNumber(stats?.total_tokens_saved || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(stats?.weekly_tokens_saved || 0)} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-blue-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Cost Saved</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatMoney(stats?.total_cost_saved || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatMoney(stats?.weekly_cost_saved || 0)} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Target className="text-purple-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Attention Score</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : ((stats?.avg_attention_score || 0) * 100).toFixed(0) + '%'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Acceptance rate: {(stats?.acceptance_rate || 0).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Optimizations Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="text-orange" size={18} />
                Daily Optimizations
              </h2>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="optGradient" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="optimizations"
                    stroke="#FF6B00"
                    fill="url(#optGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p>No data yet</p>
                <p className="text-sm">Use the extension to start tracking</p>
              </div>
            )}
          </div>

          {/* Tokens Saved Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="text-green-400" size={18} />
                Tokens Saved Over Time
              </h2>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
                    dataKey="tokensSaved"
                    stroke="#22c55e"
                    fill="url(#tokenGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p>No data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chatbot Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="text-orange" size={18} />
              By Chatbot
            </h2>
            {chatbotStats.length > 0 ? (
              <div className="space-y-4">
                {chatbotStats.map((stat) => (
                  <div key={stat.chatbot} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-2xl">{CHATBOT_ICONS[stat.chatbot] || '🤖'}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{stat.chatbot}</span>
                        <span className="text-orange font-bold">{stat.total}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatNumber(stat.tokens_saved)} tokens saved</span>
                        <span>{formatMoney(stat.cost_saved)} saved</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="text-purple-400" size={14} />
                      <span className="text-purple-400 font-medium">{(stat.avg_attention_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No chatbot data yet</p>
              </div>
            )}
          </div>

          {/* Acceptance Stats */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="text-green-400" size={18} />
              Acceptance Rate
            </h2>
            {stats && stats.total_optimizations > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#333"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#22c55e"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(stats.acceptance_rate / 100) * 352} 352`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-green-400">{stats.acceptance_rate.toFixed(0)}%</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">Acceptance Rate</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="text-green-400" size={20} />
                      <span className="text-gray-400 text-sm">Accepted</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatNumber(stats.total_accepts)}
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle className="text-red-400" size={20} />
                      <span className="text-gray-400 text-sm">Dismissed</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {formatNumber(stats.total_rejects)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No acceptance data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent History */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-orange" size={18} />
            Recent Optimizations
          </h2>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{CHATBOT_ICONS[item.chatbot] || '🤖'}</span>
                        <span className="text-xs text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${item.accepted ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {item.accepted ? 'Accepted' : 'Dismissed'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        <span className="line-through text-red-400/60">{item.original_prompt.slice(0, 80)}...</span>
                      </div>
                      <div className="text-sm text-green-400">
                        → {item.optimized_prompt.slice(0, 80)}...
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-orange">-{item.tokens_saved} tokens</span>
                        <span className="text-green-400">-{formatMoney(item.cost_saved)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="text-purple-400" size={12} />
                        <span className="text-purple-400 text-xs">{(item.attention_score * 100).toFixed(0)}%</span>
                      </div>
                      <button
                        onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                      >
                        {expandedHistory === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {expandedHistory === item.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Original Tokens</p>
                          <p className="font-mono">{item.original_tokens}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Optimized Tokens</p>
                          <p className="font-mono">{item.optimized_tokens}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Cost Original</p>
                          <p className="font-mono">{formatMoney(item.cost_original || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Cost Optimized</p>
                          <p className="font-mono">{formatMoney(item.cost_optimized || 0)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-gray-500 mb-1">Full Original Prompt</p>
                        <p className="text-sm bg-gray-900 p-2 rounded font-mono">{item.original_prompt}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-gray-500 mb-1">Full Optimized Prompt</p>
                        <p className="text-sm bg-gray-900 p-2 rounded font-mono">{item.optimized_prompt}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No optimization history yet</p>
              <p className="text-sm mt-1">Use the Chrome extension to start optimizing prompts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}