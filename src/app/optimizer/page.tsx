'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Sparkles, Copy, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const MODEL_OPTIONS = [
  { value: 'chatgpt', label: 'GPT-4o', color: '#10A37F' },
  { value: 'gemini', label: 'Gemini 1.5 Flash', color: '#EAB308' },
  { value: 'claude', label: 'Claude 3.5 Sonnet', color: '#D97757' },
];

interface TokenScore {
  token: string;
  score: number;
  importance: 'high' | 'medium' | 'low';
}

/** Match Python's str.split(): tokens separated by whitespace. */
function tokenizeWords(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  return t.split(/\s+/);
}

/** LCS backtrack: which word indices align between original and optimized. */
function lcsMatchedIndices(a: string[], b: string[]): { orig: Set<number>; enh: Set<number> } {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const orig = new Set<number>();
  const enh = new Set<number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      orig.add(i - 1);
      enh.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return { orig, enh };
}

function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return '$0.00';
  if (abs < 0.0001) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumSignificantDigits: 4,
    }).format(n);
  }
  if (abs < 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(n);
}

function heatFromScore(score: number): { bg: string; text: string } {
  const t = Math.max(0, Math.min(1, score));
  const r = Math.round(239 - t * (239 - 113));
  const gB = Math.round(68 + t * (113 - 68));
  const bB = Math.round(68 + t * (122 - 68));
  return {
    bg: `rgba(${r}, ${gB}, ${bB}, ${0.2 + t * 0.35})`,
    text: t > 0.45 ? 'text-zinc-100' : 'text-zinc-400',
  };
}

function TokenDiffRow({
  tokens,
  matched,
  mode,
}: {
  tokens: string[];
  matched: Set<number>;
  mode: 'original' | 'optimized';
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-sm leading-relaxed">
      <div className="flex flex-wrap gap-y-1.5">
        {tokens.map((tok, i) => {
          const isKept = matched.has(i);
          const isOrig = mode === 'original';
          const bg = isOrig
            ? isKept
              ? 'rgba(161, 161, 170, 0.22)'
              : 'rgba(185, 28, 28, 0.42)'
            : isKept
              ? 'rgba(161, 161, 170, 0.22)'
              : 'rgba(13, 148, 136, 0.35)';
          const textClass = isOrig
            ? isKept
              ? 'text-zinc-200'
              : 'text-red-50'
            : isKept
              ? 'text-zinc-200'
              : 'text-teal-50';
          return (
            <span
              key={`${mode}-${i}-${tok}`}
              className={`inline rounded px-1 py-0.5 ${textClass}`}
              style={{ backgroundColor: bg, boxDecorationBreak: 'clone' as const }}
              title={
                isOrig
                  ? isKept
                    ? 'Also appears in optimized prompt'
                    : 'Dropped or condensed in optimized version'
                  : isKept
                    ? 'Carried over from your prompt'
                    : 'Added by optimizer'
              }
            >
              {tok}
            </span>
          );
        })}
      </div>
    </div>
  );
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
  const [originalCost, setOriginalCost] = useState<number | null>(null);
  const [enhancedCost, setEnhancedCost] = useState<number | null>(null);
  const [costSavingsPercent, setCostSavingsPercent] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const diffIndices = useMemo(() => {
    const a = tokenizeWords(prompt);
    const b = tokenizeWords(enhancedPrompt);
    if (!a.length || !b.length) return { orig: new Set<number>(), enh: new Set<number>() };
    return lcsMatchedIndices(a, b);
  }, [prompt, enhancedPrompt]);

  const origTokensArr = useMemo(() => tokenizeWords(prompt), [prompt]);
  const enhTokensArr = useMemo(() => tokenizeWords(enhancedPrompt), [enhancedPrompt]);

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
      setOriginalTokens(result.original?.tokens ?? tokenizeWords(prompt).length);
      setEnhancedTokens(result.suggestion?.tokens ?? 0);
      setSavings(result.suggestion?.token_savings ?? 0);
      setEnhancedPrompt(result.suggestion?.text || '');
      setOriginalCost(result.original?.estimated_cost ?? null);
      setEnhancedCost(result.suggestion?.estimated_cost ?? null);
      const pct = result.suggestion?.cost_savings_percent;
      setCostSavingsPercent(typeof pct === 'number' ? pct : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze prompt');
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
      setOriginalTokens(result.original_tokens ?? tokenizeWords(prompt).length);
      setEnhancedTokens(result.enhanced_tokens ?? 0);
      setSavings(result.token_savings ?? 0);
      setOriginalCost(result.estimated_cost_original ?? null);
      setEnhancedCost(result.estimated_cost_enhanced ?? null);
      const pct = result.cost_savings_percent;
      setCostSavingsPercent(typeof pct === 'number' ? pct : null);
      setTokenScores([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt');
    } finally {
      setEnhancing(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dollarSaved =
    originalCost != null && enhancedCost != null ? originalCost - enhancedCost : null;

  const selectedModelLabel = MODEL_OPTIONS.find((m) => m.value === targetModel)?.label ?? targetModel;

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
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Prompt Optimizer</h1>
            <p className="text-gray-400">
              Compare your prompt to the optimized version: heatmap by what changed, token counts, and
              estimated input cost for {selectedModelLabel}.
            </p>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-400 mb-2">Target model (pricing)</label>
              <div className="flex flex-wrap gap-2">
                {MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => setTargetModel(model.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      targetModel === model.value
                        ? 'bg-white text-black font-medium'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                    {model.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Cost uses API input rates per 1M tokens; word count is used as a simple token estimate.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Your prompt</label>
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
              type="button"
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
                  Analyze prompt
                </>
              )}
            </button>
            <button
              type="button"
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
                  Enhance prompt
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

        {prompt.trim() && enhancedPrompt && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn space-y-5">
            <div>
              <h2 className="text-lg font-semibold mb-1">Token comparison</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Gray spans align across both versions. Red-tinted words were dropped or condensed; teal
                spans were added (for example the closing instruction).
              </p>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
                    Your words
                  </div>
                  <TokenDiffRow tokens={origTokensArr} matched={diffIndices.orig} mode="original" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
                    Optimized
                  </div>
                  <TokenDiffRow tokens={enhTokensArr} matched={diffIndices.enh} mode="optimized" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-3 rounded-sm bg-[rgba(161,161,170,0.35)]" />
                Shared
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-3 rounded-sm bg-[rgba(185,28,28,0.45)]" />
                Removed from original
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-3 rounded-sm bg-[rgba(13,148,136,0.4)]" />
                Added in optimized
              </div>
            </div>
          </div>
        )}

        {(originalCost != null || enhancedCost != null || originalTokens > 0) && enhancedPrompt && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4">Tokens &amp; estimated input cost</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Rough spend for this prompt alone on <span className="text-zinc-300">{selectedModelLabel}</span>{' '}
              (input pricing only; actual LLM tokenization may differ).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-black rounded-lg p-4 border border-zinc-800">
                <div className="text-2xl font-bold tabular-nums">{originalTokens}</div>
                <div className="text-sm text-gray-400">Words (original)</div>
              </div>
              <div className="bg-black rounded-lg p-4 border border-zinc-800">
                <div className="text-2xl font-bold tabular-nums text-orange">{enhancedTokens}</div>
                <div className="text-sm text-gray-400">Words (optimized)</div>
              </div>
              <div className="bg-black rounded-lg p-4 border border-zinc-800">
                <div className="text-xl font-bold tabular-nums text-zinc-100">
                  {originalCost != null ? formatUsd(originalCost) : '—'}
                </div>
                <div className="text-sm text-gray-400">Est. cost before</div>
              </div>
              <div className="bg-black rounded-lg p-4 border border-zinc-800">
                <div className="text-xl font-bold tabular-nums text-teal-400">
                  {enhancedCost != null ? formatUsd(enhancedCost) : '—'}
                </div>
                <div className="text-sm text-gray-400">Est. cost after</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-zinc-950/80 border border-zinc-800 px-4 py-3">
              {savings !== 0 && (
                <span className="text-sm text-zinc-300">
                  <span className="font-semibold text-green-400">-{savings}</span> words saved
                  {originalTokens > 0 && (
                    <span className="text-zinc-500">
                      {' '}
                      (~{Math.round((savings / originalTokens) * 100)}% fewer)
                    </span>
                  )}
                </span>
              )}
              {dollarSaved != null && dollarSaved > 0 && (
                <span className="text-sm text-green-400 font-medium">
                  Save ~{formatUsd(dollarSaved)} per request
                  {costSavingsPercent != null && costSavingsPercent > 0 && (
                    <span className="text-green-300/90 font-normal"> ({Math.round(costSavingsPercent)}% lower input cost)</span>
                  )}
                </span>
              )}
              {dollarSaved != null && dollarSaved <= 0 && savings === 0 && (
                <span className="text-sm text-zinc-500">No word or cost reduction for this prompt.</span>
              )}
            </div>
          </div>
        )}

        {tokenScores.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-1">Word importance heatmap</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Red tones = higher TF‑IDF-style weight in this demo; gray = lower weight.
            </p>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-3 font-mono text-sm leading-relaxed flex flex-wrap gap-y-1.5">
              {tokenScores.map((item, i) => {
                const { bg, text } = heatFromScore(item.score);
                return (
                  <span
                    key={`${i}-${item.token}`}
                    className={`inline rounded px-1 py-0.5 ${text}`}
                    style={{ backgroundColor: bg }}
                    title={`score ${item.score.toFixed(2)} · ${item.importance}`}
                  >
                    {item.token}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>Heat scale:</span>
              <span className="flex h-2 flex-1 min-w-[120px] max-w-xs overflow-hidden rounded-full">
                <span className="flex-1 bg-[rgba(113,113,122,0.5)]" />
                <span className="flex-1 bg-[rgba(150,50,50,0.45)]" />
                <span className="flex-1 bg-[rgba(185,28,28,0.55)]" />
              </span>
              <span>low → high</span>
            </div>
          </div>
        )}

        {enhancedPrompt && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold">Optimized prompt (plain text)</h2>
              <button
                type="button"
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

            <div className="bg-black rounded-lg p-4 border border-zinc-800">
              <p className="text-white leading-relaxed whitespace-pre-wrap font-mono text-sm">{enhancedPrompt}</p>
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
