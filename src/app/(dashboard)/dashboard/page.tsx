'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Plus, Copy, Trash2, Check, AlertCircle, Activity, Zap, DollarSign, Clock, RefreshCw, ExternalLink, Settings, Play, BarChart3, Puzzle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import ExtensionAuthSync from '@/components/ExtensionAuthSync';

interface ProxyKey {
  id: number;
  proxy_id: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  auto_enhance: boolean;
  created_at: string;
}

interface LogEntry {
  type: string;
  proxy_id?: string;
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  latency_ms?: number;
  timestamp?: string;
  error?: string;
}

interface Stats {
  total_tokens: number;
  total_cost: number;
  total_requests: number;
  avg_latency_ms: number;
  weekly_tokens: number;
  weekly_cost: number;
  weekly_requests: number;
}

const PROVIDERS: Record<string, { name: string; color: string; models: string[] }> = {
  openai: { name: 'OpenAI', color: '#10A37F', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  gemini: { name: 'Gemini', color: '#EAb308', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'] },
  anthropic: { name: 'Anthropic', color: '#D97706', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [keys, setKeys] = useState<ProxyKey[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingProxy, setTestingProxy] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [newKey, setNewKey] = useState({
    api_key: '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 2048,
    system_prompt: '',
    auto_enhance: false,
  });

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const baseUrl = apiUrl.replace('/api/v1', '');
      const userId = user.id;

      const [keysRes, statsRes, dailyRes, recentLogs] = await Promise.all([
        fetch(`${apiUrl}/keys`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${apiUrl}/stats/overview`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${apiUrl}/stats/daily?days=7`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${apiUrl}/stats/recent?limit=50`, {
          headers: { 'X-User-Id': userId }
        }).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      // Transform recent logs to log format
      const transformedLogs = recentLogs.map((log: any) => ({
        type: log.status === 'success' ? 'request' : 'error',
        proxy_id: log.proxy_id,
        provider: log.provider,
        model: log.model,
        prompt_tokens: log.prompt_tokens,
        completion_tokens: log.completion_tokens,
        total_tokens: log.total_tokens,
        cost: log.cost,
        latency_ms: log.latency_ms,
        error: log.error_message,
        timestamp: log.created_at
      }));

      setKeys(keysRes);
      setStats(statsRes);
      setDailyStats(dailyRes);
      setLogs(transformedLogs);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to connect to backend. Please ensure the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const connectSSE = useCallback(() => {
    if (!user) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const eventSource = new EventSource(`${apiUrl}/logs/stream?user_id=${user.id}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Skip heartbeats and disconnected messages
        if (data.type === 'request' || data.type === 'error') {
          setLogs(prev => {
            // Check if log already exists
            const exists = prev.some(l => l.timestamp === data.timestamp);
            if (exists) return prev;
            return [data, ...prev].slice(0, 100);
          });
        }
      } catch (e) {
        // Ignore parse errors for heartbeats
      }
    };

    eventSource.onerror = () => {
      // Don't auto-reconnect too aggressively
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }, 10000);
    };
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isLoaded, user, loadData, connectSSE]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createProxyKey = async () => {
    if (!user || !newKey.api_key.trim()) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify(newKey),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create proxy key');
      }

      setShowCreateModal(false);
      setNewKey({
        api_key: '',
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 2048,
        system_prompt: '',
        auto_enhance: false,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create proxy key');
    }
  };

  const deleteProxyKey = async (proxyId: string) => {
    if (!user || !confirm('Are you sure you want to delete this proxy key?')) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/keys/${proxyId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': user.id },
      });

      if (!res.ok) {
        throw new Error('Failed to delete proxy key');
      }

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete proxy key');
    }
  };

  const testProxy = async (proxyId: string) => {
    if (!user) return;

    setTestingProxy(proxyId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/proxy/${proxyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say "TokenScope is working!" in exactly those words.' }]
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Request failed');
      }

      alert('Test successful! Check the live logs for the response.');
      loadData();
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTestingProxy(null);
    }
  };

  const getProxyUrl = (proxyId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}/api/v1/proxy/${proxyId}`;
  };

  const chartData = dailyStats.map(day => ({
    date: day.date?.slice(5) || day.date,
    tokens: Object.values(day.providers || {}).reduce((sum: number, p: any) => sum + (p.tokens || 0), 0),
    cost: Object.values(day.providers || {}).reduce((sum: number, p: any) => sum + (p.cost || 0), 0),
  })).reverse();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ExtensionAuthSync />
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/extension"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Puzzle size={18} />
                Extension Stats
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-orange hover:bg-orange-light text-black font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={18} />
                Create Proxy URL
              </button>
            </div>
          </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={loadData}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange/10 rounded-lg flex items-center justify-center">
                <Zap className="text-orange" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Total Tokens</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatNumber(stats?.total_tokens || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(stats?.weekly_tokens || 0)} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Total Cost</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${(stats?.total_cost || 0).toFixed(4)}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${(stats?.weekly_cost || 0).toFixed(4)} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Activity className="text-blue-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Total Requests</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatNumber(stats?.total_requests || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.weekly_requests || 0} this week
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Clock className="text-purple-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Avg Latency</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${stats?.avg_latency_ms || 0}ms`}
            </div>
            <div className="text-xs text-gray-500 mt-1">Response time</div>
          </div>
        </div>

        {/* Charts and Logs */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Token Usage Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Token Usage (7 Days)</h2>
              <button
                onClick={loadData}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
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
                    dataKey="tokens"
                    stroke="#FF6B00"
                    fill="url(#tokenGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p>No usage data yet</p>
                <p className="text-sm">Start making requests to see your stats</p>
              </div>
            )}
          </div>

          {/* Live Logs */}
          <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <h2 className="text-sm font-medium text-gray-400">Live Terminal</h2>
              </div>
              <span className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-500 font-mono">LIVE</span>
              </span>
            </div>
            <div className="h-[280px] overflow-y-auto p-4 font-mono text-sm">
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.slice(0, 50).map((log, i) => {
                    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                    const isError = log.type === 'error';
                    const isSuccess = log.type === 'request';

                    return (
                      <div key={`${log.timestamp}-${i}`} className={`animate-fadeIn ${isError ? 'text-red-400' : 'text-green-400'}`}>
                        <span className="text-gray-600">[{timestamp}]</span>{' '}
                        <span className={isError ? 'text-red-500' : 'text-green-500'}>
                          {isError ? '[ERROR]' : '[SUCCESS]'}
                        </span>{' '}
                        {isError ? (
                          <span className="text-red-300">{log.error}</span>
                        ) : (
                          <>
                            <span className="text-orange-400">{log.provider?.toUpperCase()}</span>{' '}
                            <span className="text-gray-400">/</span>{' '}
                            <span className="text-cyan-400">{log.model}</span>{' '}
                            <span className="text-gray-600">-&gt;</span>{' '}
                            <span className="text-gray-300">tokens:</span>{' '}
                            <span className="text-blue-400">{log.prompt_tokens}</span>
                            <span className="text-gray-600">/</span>
                            <span className="text-purple-400">{log.completion_tokens}</span>{' '}
                            <span className="text-gray-300">cost:</span>{' '}
                            <span className="text-yellow-400">${log.cost?.toFixed(4)}</span>{' '}
                            <span className="text-gray-300">latency:</span>{' '}
                            <span className="text-gray-400">{log.latency_ms}ms</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                  <div className="text-center">
                    <p className="text-lg mb-2">$ Awaiting requests...</p>
                    <p className="text-sm">Make API calls to see live logs</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Proxy Keys */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Your Proxy URLs</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-3">Loading...</p>
            </div>
          ) : keys.length > 0 ? (
            <div className="space-y-4">
              {keys.map((key) => (
                <div
                  key={key.proxy_id}
                  className="bg-gray-800/50 rounded-xl p-4 md:flex md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 mb-4 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${PROVIDERS[key.provider]?.color}20`,
                          color: PROVIDERS[key.provider]?.color,
                        }}
                      >
                        {PROVIDERS[key.provider]?.name}
                      </span>
                      <span className="text-white font-mono text-sm">{key.model}</span>
                      {key.auto_enhance && (
                        <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs">
                          Auto-Enhance
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-gray-400 text-xs md:text-sm bg-gray-900 px-3 py-1 rounded truncate max-w-[300px] md:max-w-none">
                        {getProxyUrl(key.proxy_id)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(getProxyUrl(key.proxy_id), key.proxy_id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        title="Copy URL"
                      >
                        {copiedId === key.proxy_id ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                      <span>Temp: {key.temperature}</span>
                      <span>Max: {key.max_tokens}</span>
                    </div>
                    <button
                      onClick={() => testProxy(key.proxy_id)}
                      disabled={testingProxy === key.proxy_id}
                      className="p-2 hover:bg-green-900/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                      title="Test Proxy"
                    >
                      {testingProxy === key.proxy_id ? (
                        <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteProxyKey(key.proxy_id)}
                      className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-500 mb-4">No proxy URLs yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-orange hover:underline"
              >
                Create your first proxy URL
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Create Proxy URL</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={newKey.api_key}
                  onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                  placeholder="sk-... or your API key"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange focus:ring-1 focus:ring-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Provider</label>
                  <select
                    value={newKey.provider}
                    onChange={(e) => setNewKey({
                      ...newKey,
                      provider: e.target.value,
                      model: PROVIDERS[e.target.value].models[0]
                    })}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-orange"
                  >
                    {Object.entries(PROVIDERS).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Model</label>
                  <select
                    value={newKey.model}
                    onChange={(e) => setNewKey({ ...newKey, model: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-orange"
                  >
                    {PROVIDERS[newKey.provider]?.models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Temperature: {newKey.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={newKey.temperature}
                    onChange={(e) => setNewKey({ ...newKey, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-orange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Max Tokens: {newKey.max_tokens}
                  </label>
                  <input
                    type="number"
                    value={newKey.max_tokens}
                    onChange={(e) => setNewKey({ ...newKey, max_tokens: parseInt(e.target.value) || 2048 })}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  System Prompt <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={newKey.system_prompt}
                  onChange={(e) => setNewKey({ ...newKey, system_prompt: e.target.value })}
                  placeholder="You are a helpful assistant..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:border-orange"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-800/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newKey.auto_enhance}
                  onChange={(e) => setNewKey({ ...newKey, auto_enhance: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded bg-black border-gray-700 text-orange focus:ring-orange"
                />
                <div>
                  <span className="font-medium">Auto-Enhance Prompts</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically optimize prompts using TF-IDF before sending to reduce token usage
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProxyKey}
                disabled={!newKey.api_key.trim()}
                className="flex-1 px-4 py-3 bg-orange text-black font-medium rounded-lg hover:bg-orange-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Proxy URL
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
