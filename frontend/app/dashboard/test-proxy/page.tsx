"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Play, Loader2, Terminal, CheckCircle2, AlertCircle, Clock,
  Cpu, DollarSign, Zap, ArrowRight, Copy, Check, Settings,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Request {
  id: string;
  endpoint: string;
  method: string;
  proxyKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
  response?: {
    status: number;
    data?: unknown;
    error?: string;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
    provider?: string;
  };
  timestamp: Date;
}

export default function TestProxyPage() {
  const [endpoint, setEndpoint] = useState(API_URL);
  const [proxyKey, setProxyKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("Say hello in one sentence.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Request[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const extractProvider = (modelValue: string) => {
    if (modelValue.includes("claude")) return "anthropic";
    if (modelValue.includes("gemini")) return "gemini";
    return "openai";
  };

  const handleSend = useCallback(async () => {
    if (!proxyKey.trim()) return;
    if (!userPrompt.trim()) return;

    setLoading(true);

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const reqId = `req_${Date.now()}`;
    const request: Request = {
      id: reqId,
      endpoint: `${endpoint}/v1/chat/completions`,
      method: "POST",
      proxyKey,
      model,
      messages,
      temperature,
      maxTokens,
      timestamp: new Date(),
    };

    setHistory((prev) => [request, ...prev]);

    const startTime = Date.now();

    try {
      const res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${proxyKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        setHistory((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? { ...r, response: { status: res.status, error: data.detail || JSON.stringify(data), latencyMs } }
              : r
          )
        );
      } else {
        const usage = data.usage || {};
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || 0;
        const provider = extractProvider(model);

        // Rough cost estimation
        const pricing: Record<string, Record<string, number>> = {
          openai: { "gpt-4o": 0.005, "gpt-4o-mini": 0.00015, "gpt-4-turbo": 0.01, "gpt-3.5-turbo": 0.0005 },
          anthropic: { "claude-3-5-sonnet-20241022": 0.003, "claude-3-5-haiku": 0.0008 },
          gemini: { "gemini-2.0-flash": 0, "gemini-1.5-flash": 0.000075, "gemini-1.5-pro": 0.00125 },
        };
        const inputPrice = pricing[provider]?.[model] || 0.001;
        const cost = (promptTokens * inputPrice / 1000) + (completionTokens * inputPrice * 3 / 1000);

        setHistory((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  response: {
                    status: res.status,
                    data: data.choices?.[0]?.message?.content || "No content",
                    latencyMs,
                    promptTokens,
                    completionTokens,
                    totalTokens,
                    cost,
                    provider,
                  },
                }
              : r
          )
        );
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      setHistory((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? { ...r, response: { status: 0, error: err instanceof Error ? err.message : "Network error", latencyMs } }
            : r
        )
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint, proxyKey, model, systemPrompt, userPrompt, temperature, maxTokens]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <Header
        title="Proxy Tester"
        description="Test your TokenScope proxy endpoint with real API requests"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-black-soft" />
            <h3 className="font-semibold text-sm">Request Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                Proxy Endpoint
              </label>
              <Input
                placeholder="http://localhost:8000"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                Proxy Key (Bearer token)
              </label>
              <Input
                type="password"
                placeholder="tsk_live_xxxxx..."
                value={proxyKey}
                onChange={(e) => setProxyKey(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                Model
              </label>
              <Select
                options={MODELS}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                System Prompt (optional)
              </label>
              <Input
                placeholder="You are a helpful assistant..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black-border rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min={16}
                  max={4096}
                  step={16}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-black-border rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
              User Prompt
            </label>
            <textarea
              className="w-full h-28 p-4 rounded-xl border border-black-border bg-bg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-jaffa/40 transition-all code-scroll"
              placeholder="Your message to the AI..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="jaffa" className="font-mono text-xs">
                {model}
              </Badge>
              <Badge variant="black" className="font-mono text-xs">
                temp: {temperature}
              </Badge>
              <Badge variant="black" className="font-mono text-xs">
                max: {maxTokens}
              </Badge>
            </div>
            <Button
              onClick={handleSend}
              disabled={!proxyKey.trim() || !userPrompt.trim() || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Terminal size={14} className="text-black-soft" />
              cURL Equivalent
            </h3>
            <Button variant="ghost" size="sm"
              onClick={() => copyToClipboard(`curl -X POST '${endpoint}/v1/chat/completions' \\
  -H 'Authorization: Bearer ${proxyKey}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ model, messages: [{ role: "user", content: userPrompt }], temperature, max_tokens: maxTokens }, null, 2)}'`, "curl")}
              className="text-black-soft">
              {copied === "curl" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "curl" ? "Copied" : "Copy cURL"}
            </Button>
          </div>
          <pre className="bg-bg rounded-lg p-4 font-mono text-xs overflow-x-auto code-scroll">
            <code className="text-black-soft">
              <span className="text-green font-bold">curl</span> -X POST{' '}
              <span className="text-jaffa">'{endpoint}/v1/chat/completions'</span>{'\n'}
              {'  '}-H <span className="text-jaffa">'Authorization: Bearer {proxyKey ? proxyKey.slice(0, 12) + "..." : "tsk_live_xxx"}'</span>{'\n'}
              {'  '}-H <span className="text-jaffa">'Content-Type: application/json'</span>{'\n'}
              {`  -d '{"model": "`}
              <span className="text-green">{model}</span>
              {`", "messages": [...], "temperature": ${temperature}, "max_tokens": ${maxTokens}}'`}
            </code>
          </pre>
        </div>

        {/* Response History */}
        {history.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock size={14} className="text-black-soft" />
              Response History ({history.length})
            </h3>

            {history.map((req, idx) => {
              const r = req.response;
              const isSuccess = r && r.status >= 200 && r.status < 300;

              return (
                <div key={req.id} className="card animate-slide-up">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {r ? (
                        isSuccess ? (
                          <CheckCircle2 size={16} className="text-green" />
                        ) : (
                          <AlertCircle size={16} className="text-danger" />
                        )
                      ) : (
                        <Loader2 size={16} className="animate-spin text-jaffa" />
                      )}
                      <div>
                        <p className="text-sm font-medium font-mono">{req.model}</p>
                        <p className="text-xs opacity-50">{formatDateTime(req.timestamp.toISOString())}</p>
                      </div>
                    </div>
                    {r && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isSuccess ? "success" : "danger"}
                          className="font-mono text-xs"
                        >
                          {r.status || "ERR"}
                        </Badge>
                        <Badge variant="black" className="font-mono text-xs">
                          <Clock size={9} className="inline mr-0.5" />
                          {r.latencyMs}ms
                        </Badge>
                      </div>
                    )}
                  </div>

                  {r && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {r.promptTokens !== undefined && (
                        <>
                          <div className="bg-bg rounded-lg p-2.5 text-center">
                            <Cpu size={12} className="text-black-soft mx-auto mb-1" />
                            <p className="text-xs font-mono font-semibold">{formatNumber(r.promptTokens)}</p>
                            <p className="text-[10px] opacity-50">Prompt</p>
                          </div>
                          <div className="bg-bg rounded-lg p-2.5 text-center">
                            <Zap size={12} className="text-black-soft mx-auto mb-1" />
                            <p className="text-xs font-mono font-semibold">{formatNumber(r.completionTokens || 0)}</p>
                            <p className="text-[10px] opacity-50">Completion</p>
                          </div>
                          <div className="bg-bg rounded-lg p-2.5 text-center">
                            <DollarSign size={12} className="text-black-soft mx-auto mb-1" />
                            <p className="text-xs font-mono font-semibold">{formatCurrency(r.cost || 0)}</p>
                            <p className="text-[10px] opacity-50">Cost</p>
                          </div>
                          <div className="bg-bg rounded-lg p-2.5 text-center">
                            <Clock size={12} className="text-black-soft mx-auto mb-1" />
                            <p className="text-xs font-mono font-semibold">{r.latencyMs}ms</p>
                            <p className="text-[10px] opacity-50">Total</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Response body */}
                  {r && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-medium opacity-50 uppercase tracking-wider">
                          {r.error ? "Error" : "Response"}
                        </p>
                        {r.data != null && (
                          <Button variant="ghost" size="sm"
                            onClick={() => copyToClipboard(typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2), req.id)}
                            className="text-black-soft h-6 text-xs">
                            {copied === req.id ? <Check size={10} /> : <Copy size={10} />}
                            {copied === req.id ? "Copied" : "Copy"}
                          </Button>
                        )}
                      </div>
                      <div className={`rounded-lg p-4 font-mono text-xs overflow-x-auto code-scroll max-h-48 ${
                        r.error ? "bg-danger/5 border border-danger/10 text-danger" : "bg-bg"
                      }`}>
                        {r.error ? (
                          r.error
                        ) : typeof r.data === "string" ? (
                          r.data
                        ) : (
                          <pre className="whitespace-pre-wrap">{JSON.stringify(r.data, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  )}

                  {!r && (
                    <div className="flex items-center gap-2 text-sm text-black-soft">
                      <Loader2 size={12} className="animate-spin" />
                      Waiting for response...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {history.length === 0 && (
          <div className="card text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
              <Terminal size={24} className="text-jaffa" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ready to test</h3>
            <p className="text-sm opacity-50 max-w-md mx-auto">
              Configure your proxy endpoint and key above, then send a test request to see the response here.
              Check the logs page to see the full request log.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <a href="/dashboard/proxy-keys">
                <Button variant="outline" size="sm">Get Proxy Key</Button>
              </a>
              <a href="/dashboard/logs">
                <Button variant="outline" size="sm">
                  View Logs <ArrowRight size={12} />
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
