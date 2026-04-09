'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Sparkles, Copy, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const MODEL_OPTIONS = [
  { value: 'chatgpt', label: 'ChatGPT (GPT-4)', color: '#10A37F' },
  { value: 'gemini', label: 'Gemini', color: '#EAb308' },
];

interface TokenScore {
  token: string;
  score: number;
  importance: 'high' | 'medium' | 'low';
}

function OptimizerContent() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [prompt, setPrompt] = useState('');
  const [targetModel, setTargetModel] = useState('chatgpt');
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [tokenScores, setTokenScores] = useState<TokenScore[]>([]);
  const [originalTokens, setOriginalTokens] = useState(0);
  const [enhancedTokens, setEnhancedTokens] = useState(0);
  const [savings, setSavings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const analyzePrompt = async () => {
    if (!prompt.trim()) return;

    setAnalyzing(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || 'anonymous',
        },
        body: JSON.stringify({ prompt, target_model: targetModel }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze prompt');
      }

      const result = await res.json();
      setTokenScores(result.token_scores || []);
      setOriginalTokens(result.original?.tokens || prompt.split(' ').length);
      setEnhancedTokens(result.suggestion?.tokens || 0);
      setSavings(result.suggestion?.token_savings || 0);
      setEnhancedPrompt(result.suggestion?.text || '');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze prompt');
    } finally {
      setAnalyzing(false);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;

    setEnhancing(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${baseUrl}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || 'anonymous',
        },
        body: JSON.stringify({ prompt, target_model: targetModel }),
      });

      if (!res.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const result = await res.json();
      setEnhancedPrompt(result.enhanced || '');
      setEnhancedTokens(result.enhanced_tokens || result.enhanced.split(' ').length);
      setSavings(prompt.split(' ').length - (result.enhanced_tokens || result.enhanced.split(' ').length));
    } catch (err: any) {
      setError(err.message || 'Failed to enhance prompt');
    } finally {
      setEnhancing(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-400 bg-red-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-gray-400 bg-gray-800/50';
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Prompt Optimizer</h1>
            <p className="text-gray-400">Analyze and optimize your prompts with TF-IDF</p>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Target Model
              </label>
              <div className="flex gap-3">
                {MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setTargetModel(model.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      targetModel === model.value
                        ? 'bg-white text-black font-medium'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: model.color }}
                    />
                    {model.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste your prompt here to analyze and optimize..."
              rows={6}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:border-orange focus:ring-1 focus:ring-orange"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={analyzePrompt}
              disabled={!prompt.trim() || analyzing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyze Prompt
                </>
              )}
            </button>
            <button
              onClick={enhancePrompt}
              disabled={!prompt.trim() || enhancing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange hover:bg-orange-light text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enhancing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Enhance Prompt
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {tokenScores.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4">Token Importance Analysis</h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {tokenScores.map((item, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getImportanceColor(item.importance)}`}
                  style={{
                    opacity: 0.4 + item.score * 0.6,
                  }}
                >
                  {item.token}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-400">High importance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-400">Medium importance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-gray-400">Low importance</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Token Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black rounded-lg p-4">
                  <div className="text-2xl font-bold">{originalTokens}</div>
                  <div className="text-sm text-gray-400">Original Tokens</div>
                </div>
                <div className="bg-black rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange">{enhancedTokens}</div>
                  <div className="text-sm text-gray-400">Optimized Tokens</div>
                </div>
                <div className="bg-black rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">-{savings}</div>
                  <div className="text-sm text-gray-400">Token Savings</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {enhancedPrompt && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Optimized Prompt</h2>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="bg-black rounded-lg p-4 mb-4">
              <p className="text-white leading-relaxed whitespace-pre-wrap">{enhancedPrompt}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{enhancedTokens} tokens</span>
              {savings > 0 && originalTokens > 0 && (
                <span className="text-green-400">
                  Save ~{Math.round((savings / originalTokens) * 100)}% tokens
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OptimizerPage() {
  return <OptimizerContent />;
}
