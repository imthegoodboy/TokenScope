'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles, TrendingUp, Target, Trophy, Zap, Clock, AlertTriangle,
  CheckCircle, ChevronDown, BarChart3, Eye, RefreshCw, Calendar,
  Award, Flame, Star, ArrowUp, ArrowDown, Minus, Settings, User,
  ChevronRight, Code, Globe, Lightbulb
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface UserScore {
  user_id: string;
  total_prompts: number;
  total_optimizations: number;
  total_tokens_saved: number;
  total_cost_saved: number;
  average_quality_score: number;
  average_efficiency_score: number;
  attention_score: number;
  rank: number;
  tier: string;
  best_score: number;
  worst_score: number;
  improvement_trend: number;
  streak_days: number;
  longest_streak: number;
}

interface GraphData {
  date: string;
  tokens_saved: number;
  prompts: number;
  avg_score: number;
}

interface Mistake {
  type: string;
  count: number;
  severity: string;
}

interface Improvement {
  type: string;
  count: number;
}

const TIER_CONFIG: Record<string, { color: string; icon: any; bg: string; label: string }> = {
  master: { color: 'text-yellow-400', icon: '👑', bg: 'bg-yellow-400/10', label: 'Master' },
  expert: { color: 'text-purple-400', icon: '⭐', bg: 'bg-purple-400/10', label: 'Expert' },
  advanced: { color: 'text-blue-400', icon: '🎯', bg: 'bg-blue-400/10', label: 'Advanced' },
  intermediate: { color: 'text-green-400', icon: '📈', bg: 'bg-green-400/10', label: 'Intermediate' },
  beginner: { color: 'text-gray-400', icon: '🌱', bg: 'bg-gray-400/10', label: 'Beginner' },
};

const CHART_COLORS = ['#FF6B00', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function UserDashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [score, setScore] = useState<UserScore | null>(null);
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [expandedMistakes, setExpandedMistakes] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const userId = user.id;

      const [scoreRes, graphRes, mistakesRes, improvementsRes] = await Promise.all([
        fetch(`${apiUrl}/scores/${userId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${apiUrl}/stats/graph/${userId}?days=${selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 365}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${apiUrl}/stats/mistakes/${userId}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${apiUrl}/stats/improvements/${userId}`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      setScore(scoreRes);
      setGraphData(graphRes);
      setMistakes(mistakesRes);
      setImprovements(improvementsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }

    if (isLoaded && isSignedIn && user) {
      loadData();
    }
  }, [isLoaded, isSignedIn, user, loadData, router]);

  // Radar chart data
  const radarData = score ? [
    { subject: 'Quality', score: score.average_quality_score, fullMark: 100 },
    { subject: 'Efficiency', score: score.average_efficiency_score, fullMark: 100 },
    { subject: 'Attention', score: score.attention_score, fullMark: 100 },
    { subject: 'Consistency', score: Math.max(0, 100 - (score.worst_score - score.best_score)), fullMark: 100 },
    { subject: 'Growth', score: Math.max(0, 50 + score.improvement_trend), fullMark: 100 },
  ] : [];

  // Pie chart for mistakes distribution
  const mistakesPieData = mistakes.slice(0, 6).map((m, i) => ({
    name: m.type.replace('_', ' '),
    value: m.count,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  // Bar chart for improvements
  const improvementsBarData = improvements.slice(0, 8).map((imp, i) => ({
    name: imp.type.replace('_', ' '),
    count: imp.count,
    fill: CHART_COLORS[i % CHART_COLORS.length]
  }));

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

  const getTrendIcon = (trend: number) => {
    if (trend > 2) return <ArrowUp className="w-4 h-4 text-green-400" />;
    if (trend < -2) return <ArrowDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const tierConfig = score ? TIER_CONFIG[score.tier] || TIER_CONFIG.beginner : TIER_CONFIG.beginner;

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
      <div className="bg-gradient-to-r from-orange via-orange-light to-orange">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center">
                <span className="text-orange font-bold text-2xl">TS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">User Dashboard</h1>
                <p className="text-black/70">Your prompt optimization insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="p-3 bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-black ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/extension-dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Code className="w-4 h-4" />
                Extension Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Attention Score Hero */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="relative">
              <div className="w-48 h-48 rounded-full border-8 border-gray-700 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange/20 to-transparent" />
                <div className="text-center z-10">
                  <div className={`text-5xl font-bold ${getScoreColor(score?.attention_score || 50)}`}>
                    {score?.attention_score?.toFixed(0) || '50'}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">/ 100</div>
                </div>
              </div>
              {/* Rank badge */}
              {score && score.rank > 0 && (
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-black font-bold text-lg">#{score.rank}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`px-4 py-2 rounded-full ${tierConfig.bg} ${tierConfig.color} font-semibold`}>
                  {tierConfig.icon} {tierConfig.label}
                </div>
                {score && score.improvement_trend !== 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full">
                    {getTrendIcon(score.improvement_trend)}
                    <span className="text-sm text-gray-400">
                      {score.improvement_trend > 0 ? '+' : ''}{score.improvement_trend.toFixed(1)} trend
                    </span>
                  </div>
                )}
              </div>

              <h2 className="text-3xl font-bold mb-2">
                {user.firstName || 'User'}'s Attention Score
              </h2>
              <p className="text-gray-400 mb-6">
                Your score is based on prompt quality, token efficiency, and optimization consistency.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Prompts</div>
                  <div className="text-2xl font-bold">{formatNumber(score?.total_prompts || 0)}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Tokens Saved</div>
                  <div className="text-2xl font-bold text-green-400">{formatNumber(score?.total_tokens_saved || 0)}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Cost Saved</div>
                  <div className="text-2xl font-bold text-blue-400">{formatMoney(score?.total_cost_saved || 0)}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Streak</div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-6 h-6 text-orange" />
                    <span className="text-2xl font-bold">{score?.streak_days || 0}</span>
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-700">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(score?.average_quality_score || 0)}`}>
                {score?.average_quality_score?.toFixed(0) || '0'}
              </div>
              <div className="text-sm text-gray-400 mt-1">Quality Score</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${score?.average_quality_score || 0}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(score?.average_efficiency_score || 0)}`}>
                {score?.average_efficiency_score?.toFixed(0) || '0'}
              </div>
              <div className="text-sm text-gray-400 mt-1">Efficiency Score</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${score?.average_efficiency_score || 0}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(score?.best_score || 0)}`}>
                {score?.best_score?.toFixed(0) || '0'}
              </div>
              <div className="text-sm text-gray-400 mt-1">Best Score</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-orange h-2 rounded-full transition-all"
                  style={{ width: `${score?.best_score || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Graph */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange" />
                Performance Over Time
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
            {graphData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={graphData}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="tokens_saved" stroke="#FF6B00" fill="url(#tokenGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p>No data yet</p>
                <p className="text-sm">Start optimizing prompts to see your performance</p>
              </div>
            )}
          </div>

          {/* Radar Chart - Skills Breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange" />
              Skills Breakdown
            </h2>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" stroke="#666" fontSize={12} />
                  <PolarRadiusAxis stroke="#333" fontSize={10} />
                  <Radar name="Score" dataKey="score" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <Target className="w-12 h-12 mb-3 opacity-50" />
                <p>Complete more optimizations</p>
              </div>
            )}
          </div>
        </div>

        {/* Mistakes and Improvements Analysis */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Mistakes Analysis */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Common Mistakes
              </h2>
              {mistakes.length > 5 && (
                <button
                  onClick={() => setExpandedMistakes(!expandedMistakes)}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  {expandedMistakes ? 'Show less' : 'Show all'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedMistakes ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {mistakes.length > 0 ? (
              <div className="space-y-3">
                {(expandedMistakes ? mistakes : mistakes.slice(0, 5)).map((mistake, index) => (
                  <div key={index} className="bg-black/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          mistake.severity === 'high' ? 'bg-red-500' :
                          mistake.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <span className="font-medium capitalize">{mistake.type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-orange font-bold">{mistake.count}x</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          mistake.severity === 'high' ? 'bg-red-500' :
                          mistake.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (mistake.count / (mistakes[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                <p>No mistakes recorded yet</p>
              </div>
            )}

            {/* Pie Chart */}
            {mistakes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={mistakesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {mistakesPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {mistakesPieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-gray-400">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Improvements Made */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-green-400" />
              Improvements Applied
            </h2>

            {improvements.length > 0 ? (
              <div className="space-y-3">
                {improvements.slice(0, 8).map((imp, index) => (
                  <div key={index} className="flex items-center justify-between bg-black/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="capitalize font-medium">{imp.type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-green-400 font-bold">{imp.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-orange/50" />
                <p>No improvements yet</p>
                <p className="text-sm">Start optimizing to see improvements</p>
              </div>
            )}

            {/* Bar Chart */}
            {improvements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={improvementsBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#666" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#666" fontSize={10} width={100} />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {improvementsBarData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips Section */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Quick Tips to Improve Your Score
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-orange" />
              </div>
              <h3 className="font-semibold mb-1">Be Specific</h3>
              <p className="text-sm text-gray-400">Add specific details and constraints to your prompts for better results.</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                <Code className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">Use Structure</h3>
              <p className="text-sm text-gray-400">Break down complex requests with numbered lists or clear sections.</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold mb-1">Define Output</h3>
              <p className="text-sm text-gray-400">Specify the format you want - JSON, bullet points, or paragraphs.</p>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Link
            href="/optimizer"
            className="flex items-center justify-between p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-orange transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Prompt Optimizer</h3>
                <p className="text-sm text-gray-400">Try optimizing your prompts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange transition-colors" />
          </Link>

          <Link
            href="/extension-dashboard"
            className="flex items-center justify-between p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Extension Dashboard</h3>
                <p className="text-sm text-gray-400">View detailed extension stats</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}