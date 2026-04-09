"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TokenHighlighter } from "@/components/analyzer/token-highlighter";
import { OptimizationPanel } from "@/components/analyzer/optimization-panel";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Wand2, Zap, TrendingDown, Loader2 } from "lucide-react";
import type { AnalyzeResult, OptimizeResult } from "@/lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

function generateDemoAnalysis(prompt: string, provider: string, model: string): AnalyzeResult {
  const words = prompt.split(/\s+/);
  const tokens = Math.ceil(words.length * 1.3);
  const wordCount = words.length;
  const charCount = prompt.length;

  const inputPrice = provider === "openai" ? (model === "gpt-4o" ? 5 : 0.15) / 1_000_000 : provider === "anthropic" ? 3 / 1_000_000 : 0.075 / 1_000_000;
  const outputPrice = provider === "openai" ? (model === "gpt-4o" ? 15 : 0.6) / 1_000_000 : provider === "anthropic" ? 15 / 1_000_000 : 0.30 / 1_000_000;

  const estInput = tokens * inputPrice;
  const estOutput = Math.ceil(tokens * 0.7) * outputPrice;

  const tokenScores = words.map((word) => {
    const rand = Math.random();
    const importance: "high" | "medium" | "low" = rand > 0.7 ? "high" : rand > 0.4 ? "medium" : "low";
    return {
      token: word.replace(/[.,!?;:'"()[\]{}]/g, ""),
      score: Math.random(),
      importance,
    };
  });

  return {
    tokens,
    word_count: wordCount,
    char_count: charCount,
    estimated_cost_input: estInput,
    estimated_cost_output: estOutput,
    estimated_cost_total: estInput + estOutput,
    token_scores: tokenScores,
    top_important: tokenScores.slice(0, 10),
  };
}

function generateDemoOptimization(analysis: AnalyzeResult, targetTokens?: number): OptimizeResult {
  const target = targetTokens || Math.floor(analysis.tokens * 0.7);
  const kept = analysis.token_scores.slice(0, target);

  const words = analysis.token_scores.slice(0, target).map(t => t.token);
  const optimized = words.join(" ");

  const savedTokens = analysis.tokens - target;
  const savedCost = analysis.estimated_cost_input * (savedTokens / analysis.tokens);

  return {
    original: "",
    optimized,
    original_tokens: analysis.tokens,
    optimized_tokens: target,
    saved_tokens: savedTokens,
    saved_cost_input: savedCost,
    saved_cost_output: savedCost * 0.7,
    saved_cost_total: savedCost + savedCost * 0.7,
    kept_key_tokens: kept.slice(0, 15),
  };
}

export default function AnalyzerPage() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [targetTokens, setTargetTokens] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [optimization, setOptimization] = useState<OptimizeResult | null>(null);
  const [activeTab, setActiveTab] = useState("analyze");

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const result = generateDemoAnalysis(prompt, provider, model);
    setAnalysis(result);
    setOptimization(null);
    setAnalyzing(false);
  };

  const handleOptimize = async () => {
    if (!analysis) return;
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const result = generateDemoOptimization(
      analysis,
      targetTokens ? parseInt(targetTokens) : undefined
    );
    result.original = prompt;
    setOptimization(result);
    setActiveTab("optimize");
    setOptimizing(false);
  };

  return (
    <div>
      <Header
        title="Prompt Analyzer"
        description="Analyze token usage and optimize prompts with TF-IDF"
      />

      <div className="px-8 py-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-black-muted mb-1.5">
                    Provider
                  </label>
                  <Select
                    options={PROVIDERS}
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setModel(MODELS[e.target.value][0].value);
                      setAnalysis(null);
                      setOptimization(null);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-black-muted mb-1.5">
                    Model
                  </label>
                  <Select
                    options={MODELS[provider]}
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setAnalysis(null);
                      setOptimization(null);
                    }}
                  />
                </div>
                {activeTab === "optimize" && (
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-black-muted mb-1.5">
                      Target Tokens
                    </label>
                    <Input
                      type="number"
                      placeholder="Auto"
                      value={targetTokens}
                      onChange={(e) => setTargetTokens(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  Enter your prompt
                </label>
                <textarea
                  className="w-full h-40 p-3 rounded-lg border border-black-border bg-surface text-sm text-black placeholder:text-black-muted resize-none focus:outline-none focus:ring-2 focus:ring-black transition-all font-mono"
                  placeholder="Enter your AI prompt here to analyze token usage and get optimization suggestions..."
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setAnalysis(null);
                    setOptimization(null);
                  }}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <Button onClick={handleAnalyze} disabled={!prompt.trim() || analyzing} className="flex-1">
                  {analyzing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} /> Analyze Prompt
                    </>
                  )}
                </Button>
                {analysis && (
                  <Button variant="outline" onClick={handleOptimize} disabled={optimizing} className="flex-1">
                    {optimizing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Optimizing...
                      </>
                    ) : (
                      <>
                        <TrendingDown size={14} /> Optimize
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {analysis ? (
              <>
                <div className="card">
                  <h3 className="font-semibold text-black mb-4">Analysis Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-black-border">
                      <span className="text-sm text-black-muted">Tokens</span>
                      <span className="font-mono font-medium text-black">{formatNumber(analysis.tokens)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black-border">
                      <span className="text-sm text-black-muted">Words</span>
                      <span className="font-mono font-medium text-black">{analysis.word_count}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black-border">
                      <span className="text-sm text-black-muted">Characters</span>
                      <span className="font-mono font-medium text-black">{formatNumber(analysis.char_count)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black-border">
                      <span className="text-sm text-black-muted">Input Cost</span>
                      <span className="font-mono font-medium text-black">{formatCurrency(analysis.estimated_cost_input)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black-border">
                      <span className="text-sm text-black-muted">Est. Output Cost</span>
                      <span className="font-mono font-medium text-black">{formatCurrency(analysis.estimated_cost_output)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-black">Total Estimated</span>
                      <span className="font-mono font-bold text-black">{formatCurrency(analysis.estimated_cost_total)}</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-black mb-3">Top Important Tokens</h3>
                  <div className="space-y-2">
                    {analysis.top_important.slice(0, 8).map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-black-muted w-4">{i + 1}.</span>
                          <span className={`text-sm font-mono px-1.5 py-0.5 rounded ${
                            t.importance === "high"
                              ? "token-high"
                              : t.importance === "medium"
                              ? "token-med"
                              : "token-low"
                          }`}>
                            {t.token}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-black-muted">
                          {t.score.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="card text-center py-12">
                <Wand2 size={32} className="text-black-border mx-auto mb-3" />
                <p className="text-sm text-black-muted">
                  Enter a prompt and click Analyze to see token breakdown and TF-IDF scores.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Token Highlighted View */}
        {analysis && prompt && (
          <div className="mt-6 card">
            <h3 className="font-semibold text-black mb-3">Token Importance Map</h3>
            <p className="text-xs text-black-muted mb-4">
              Red = high importance (high TF-IDF) • Yellow = medium • Green = low
            </p>
            <TokenHighlighter tokens={analysis.token_scores} prompt={prompt} />
          </div>
        )}

        {/* Optimization Panel */}
        {optimization && (
          <div className="mt-6 card animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={18} className="text-success" />
              <h3 className="font-semibold text-black">Optimization Results</h3>
            </div>
            <OptimizationPanel result={optimization} />
          </div>
        )}
      </div>
    </div>
  );
}
