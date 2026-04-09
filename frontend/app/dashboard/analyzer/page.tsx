"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PromptRating } from "@/components/analyzer/prompt-rating";
import { TokenHighlighter } from "@/components/analyzer/token-highlighter";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Wand2,
  TrendingDown,
  Loader2,
  Lightbulb,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Target,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { analyzePrompt, optimizePrompt, type TokenScore } from "@/lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
    { value: "claude-3-opus", label: "Claude 3 Opus" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

interface AnalysisResult {
  tokens: number;
  word_count: number;
  char_count: number;
  estimated_cost_input: number;
  estimated_cost_output: number;
  estimated_cost_total: number;
  token_scores: TokenScore[];
  top_important: TokenScore[];
  score?: number;
  breakdown?: { clarity: number; conciseness: number; specificity: number; efficiency: number };
}

interface OptimizeResult {
  original: string;
  optimized: string;
  original_tokens: number;
  optimized_tokens: number;
  saved_tokens: number;
  saved_cost_total: number;
}

function getSuggestions(analysis: AnalysisResult): Array<{ icon: React.ElementType; title: string; desc: string; impact: "high" | "medium" | "low" }> {
  const suggestions = [];
  if (analysis.tokens > 2000) {
    suggestions.push({
      icon: TrendingDown,
      title: "Reduce token count",
      desc: `Your prompt is ${analysis.tokens} tokens. Consider trimming unnecessary words.`,
      impact: "high",
    });
  }
  if (analysis.breakdown && analysis.breakdown.clarity < 70) {
    suggestions.push({
      icon: MessageSquare,
      title: "Improve clarity",
      desc: "Be more explicit about the task. Use step-by-step instructions.",
      impact: "high",
    });
  }
  if (analysis.breakdown && analysis.breakdown.specificity < 70) {
    suggestions.push({
      icon: Target,
      title: "Add specificity",
      desc: "Include examples, format requirements, or constraints to guide the model.",
      impact: "medium",
    });
  }
  if (!analysis.token_scores.some((t) => t.token.includes("format") || t.token.includes("output"))) {
    suggestions.push({
      icon: Sparkles,
      title: "Specify output format",
      desc: "Tell the model how to structure its response (JSON, bullet points, etc.).",
      impact: "low",
    });
  }
  return suggestions;
}

export default function AnalyzerPage() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [optimized, setOptimized] = useState<OptimizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"analyze" | "improve">("analyze");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzePrompt({ prompt, model, provider });
      // Compute score locally
      const avgScore = result.token_scores.reduce((s, t) => s + t.score, 0) / (result.token_scores.length || 1);
      const words = prompt.split(/\s+/);
      const wordCount = words.length;
      const clarity = Math.min(100, Math.floor(50 + avgScore * 50 + (wordCount < 100 ? 20 : 0)));
      const conciseness = Math.min(100, Math.floor(100 - Math.max(0, result.tokens - 500) * 0.3));
      const specificity = Math.min(100, Math.floor(30 + avgScore * 70));
      const efficiency = Math.min(100, Math.floor(100 - Math.max(0, result.tokens - 800) * 0.15));
      const overallScore = Math.floor((clarity + conciseness + specificity + efficiency) / 4);
      setAnalysis({
        ...result,
        score: overallScore,
        breakdown: { clarity, conciseness, specificity, efficiency },
      });
      setOptimized(null);
      setActiveTab("analyze");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [prompt, provider, model]);

  const handleOptimize = useCallback(async () => {
    if (!prompt.trim()) return;
    setOptimizing(true);
    setError(null);
    try {
      const result = await optimizePrompt({ prompt, model, provider });
      setOptimized(result);
      setActiveTab("improve");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  }, [prompt, provider, model]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Header
        title="Prompt Analyzer"
        description="Analyze token usage, get TF-IDF insights, and optimize prompts for cost savings"
      />

      <div className="px-8 py-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium opacity-60 mb-1.5">Provider</label>
            <Select
              options={PROVIDERS}
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(MODELS[e.target.value][0].value);
                setAnalysis(null);
                setOptimized(null);
              }}
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium opacity-60 mb-1.5">Model</label>
            <Select
              options={MODELS[provider]}
              value={model}
              onChange={(e) => { setModel(e.target.value); setAnalysis(null); setOptimized(null); }}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={!prompt.trim() || analyzing} className="h-10">
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {analyzing ? "Analyzing..." : "Analyze Prompt"}
          </Button>
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Input + Warm Highlighted View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Prompt input */}
            <div className="card">
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-3">
                Your Prompt
              </label>
              <textarea
                className="w-full h-48 p-4 rounded-xl border border-black-border bg-bg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-jaffa/40 transition-all code-scroll"
                placeholder="Enter your AI prompt here to analyze token usage and get optimization suggestions..."
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setAnalysis(null); setOptimized(null); }}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-4 text-xs opacity-60">
                  <span>{prompt.split(/\s+/).filter(Boolean).length} words</span>
                  <span>~{Math.ceil(prompt.split(/\s+/).filter(Boolean).length * 1.3)} tokens</span>
                  <span>{prompt.length} chars</span>
                </div>
                {analysis && (
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(prompt)}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                )}
              </div>
              {error && (
                <div className="mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
                  {error}
                </div>
              )}
            </div>

            {/* Token Map */}
            {analysis && activeTab === "analyze" && (
              <div className="card animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Token Importance Map</h3>
                    <p className="text-xs opacity-60 mt-0.5">
                      Warm orange = high impact tokens · Gray = low impact
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-jaffa inline-block" /> High
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-jaffa/50 inline-block" /> Medium
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-black-border inline-block" /> Low
                    </span>
                  </div>
                </div>
                <TokenHighlighter tokens={analysis.token_scores} prompt={prompt} />
              </div>
            )}

            {/* Improved version */}
            {activeTab === "improve" && optimized && (
              <div className="card animate-slide-up border-jaffa/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-jaffa" />
                  <h3 className="font-semibold">Optimized Prompt</h3>
                  <Badge className="bg-green-bg text-green border-green/20">
                    Saved {optimized.saved_tokens} tokens
                  </Badge>
                </div>
                <div className="p-3 bg-green-bg rounded-lg border border-green/20 font-mono text-sm whitespace-pre-wrap">
                  {optimized.optimized}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-jaffa hover:text-jaffa-dark hover:bg-jaffa-bg"
                    onClick={() => handleCopy(optimized.optimized)}
                  >
                    <Copy size={12} /> Copy optimized prompt
                  </Button>
                  <span className="text-xs opacity-60">
                    {optimized.optimized_tokens} tokens (was {optimized.original_tokens})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Analysis Panel */}
          <div className="lg:col-span-2 space-y-4">
            {analysis ? (
              <>
                {/* Score */}
                {analysis.score !== undefined && analysis.breakdown && (
                  <div className="card">
                    <PromptRating score={analysis.score} breakdown={analysis.breakdown} />
                  </div>
                )}

                {/* Token Stats */}
                <div className="card">
                  <h3 className="font-semibold mb-4">Token Breakdown</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Tokens", value: formatNumber(analysis.tokens), mono: true },
                      { label: "Input Cost", value: formatCurrency(analysis.estimated_cost_input), mono: true, color: "text-jaffa-dark" },
                      { label: "Est. Output Cost", value: formatCurrency(analysis.estimated_cost_output), mono: true },
                      { label: "Total Cost", value: formatCurrency(analysis.estimated_cost_total), mono: true, bold: true },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center py-2 border-b border-black-border last:border-0">
                        <span className="text-sm opacity-70">{item.label}</span>
                        <span className={`font-mono font-medium ${item.color || ""} ${item.bold ? "font-bold" : ""}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Important Tokens */}
                {analysis.top_important.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold mb-3">Key Tokens (TF-IDF)</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.top_important.slice(0, 15).map((t, i) => (
                        <span
                          key={i}
                          className={
                            t.importance === "very_high"
                              ? "token-very-high"
                              : t.importance === "high"
                              ? "token-high"
                              : t.importance === "medium"
                              ? "token-medium"
                              : "token-low"
                          }
                          title={`Score: ${t.score.toFixed(4)}`}
                        >
                          {t.token}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {(() => {
                  const suggestions = getSuggestions(analysis);
                  if (!suggestions.length) return null;
                  return (
                    <div className="card">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb size={14} className="text-jaffa" />
                        Suggestions
                      </h3>
                      <div className="space-y-3">
                        {suggestions.map((s, i) => (
                          <div key={i} className="flex gap-3">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              s.impact === "high" ? "bg-jaffa-bg" : s.impact === "medium" ? "bg-navy-bg" : "bg-black-border/50"
                            }`}>
                              <s.icon size={12} className={
                                s.impact === "high" ? "text-jaffa" : s.impact === "medium" ? "text-navy" : "text-black-soft"
                              } />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{s.title}</p>
                              <p className="text-xs opacity-60 mt-0.5">{s.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <Button
                  className="w-full"
                  onClick={activeTab === "analyze" ? handleOptimize : () => setActiveTab("analyze")}
                  disabled={activeTab === "analyze" ? optimizing : false}
                >
                  {activeTab === "analyze" ? (
                    optimizing ? (
                      <><RefreshCw size={14} className="animate-spin" /> Optimizing...</>
                    ) : (
                      <><Sparkles size={14} /> Get Optimized Version</>
                    )
                  ) : (
                    <ArrowRight size={14} /> Back to Analysis
                  )}
                </Button>
              </>
            ) : (
              <div className="card text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-jaffa-bg flex items-center justify-center mx-auto mb-4">
                  <Wand2 size={28} className="text-jaffa" />
                </div>
                <h3 className="font-semibold mb-2">Prompt Analyzer</h3>
                <p className="text-sm opacity-60 max-w-xs mx-auto">
                  Enter your AI prompt and click Analyze to get token breakdown, TF-IDF importance scores, and optimization suggestions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
