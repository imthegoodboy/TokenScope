"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Terminal, Code2, Zap, Copy, Check, Globe,
  ArrowRight, Wand2, BarChart3, Shield,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-bg rounded-xl p-4 font-mono text-xs overflow-x-auto code-scroll border border-black-border/50">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-surface border border-black-border/50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={12} className="text-green" /> : <Copy size={12} className="text-black-soft" />}
      </button>
    </div>
  );
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "openai-sdk" | "python" | "curl" | "features">("quickstart");

  const tabs = [
    { id: "quickstart" as const, label: "Quick Start", icon: Zap },
    { id: "openai-sdk" as const, label: "OpenAI SDK", icon: Code2 },
    { id: "python" as const, label: "Python", icon: Terminal },
    { id: "curl" as const, label: "cURL", icon: Terminal },
    { id: "features" as const, label: "Features", icon: BookOpen },
  ];

  return (
    <div>
      <Header
        title="Documentation"
        description="Learn how to integrate TokenScope into your applications"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Overview */}
        <div className="card border-jaffa/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-jaffa flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">How TokenScope Works</h3>
              <p className="text-xs opacity-60 mt-1 leading-relaxed max-w-2xl">
                TokenScope is a drop-in proxy for AI APIs. Instead of calling OpenAI, Anthropic, or Gemini directly,
                point your app at TokenScope. We forward your requests, track every token, calculate costs, and optionally
                auto-enhance prompts to save money. Your app gets the same response format — zero code changes needed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="jaffa">OpenAI Compatible</Badge>
            <Badge variant="success">Multi-Provider</Badge>
            <Badge variant="black">Token Tracking</Badge>
            <Badge variant="black">Auto-Enhance</Badge>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center py-5">
            <div className="w-10 h-10 rounded-full bg-jaffa text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">1</div>
            <h4 className="font-semibold text-sm mb-1">Add Provider Keys</h4>
            <p className="text-xs opacity-60">Add your OpenAI, Anthropic, or Gemini API keys in the API Keys page.</p>
            <a href="/dashboard/api-keys" className="inline-flex items-center gap-1 text-xs text-jaffa mt-2 hover:text-jaffa-dark">
              Go to API Keys <ArrowRight size={10} />
            </a>
          </div>
          <div className="card text-center py-5">
            <div className="w-10 h-10 rounded-full bg-jaffa text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">2</div>
            <h4 className="font-semibold text-sm mb-1">Create Proxy Key</h4>
            <p className="text-xs opacity-60">Generate a proxy key (tsk_live_xxx) to authenticate your app with TokenScope.</p>
            <a href="/dashboard/proxy-keys" className="inline-flex items-center gap-1 text-xs text-jaffa mt-2 hover:text-jaffa-dark">
              Create Proxy Key <ArrowRight size={10} />
            </a>
          </div>
          <div className="card text-center py-5">
            <div className="w-10 h-10 rounded-full bg-jaffa text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">3</div>
            <h4 className="font-semibold text-sm mb-1">Use the Endpoint</h4>
            <p className="text-xs opacity-60">Replace your AI API URL with TokenScope. All requests are logged and tracked.</p>
            <a href="/dashboard/test-proxy" className="inline-flex items-center gap-1 text-xs text-jaffa mt-2 hover:text-jaffa-dark">
              Test Proxy <ArrowRight size={10} />
            </a>
          </div>
        </div>

        {/* Endpoint Info */}
        <div className="card">
          <h3 className="font-semibold mb-3">Your Proxy Endpoint</h3>
          <div className="bg-bg rounded-xl p-4 font-mono text-sm border border-black-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green font-bold text-xs">POST</span>
              <span className="text-black break-all">{API_URL}/v1/chat/completions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-jaffa font-bold text-xs opacity-60">AUTH</span>
              <span className="text-black-soft text-xs">Bearer <span className="text-green">tsk_live_your_key_here</span></span>
            </div>
          </div>
          <p className="text-xs opacity-50 mt-3">
            This endpoint is 100% compatible with the OpenAI Chat Completions API. Just change the base URL and API key.
          </p>
        </div>

        {/* Code Tabs */}
        <div className="card">
          <div className="flex items-center gap-1 mb-5 border-b border-black-border pb-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-jaffa text-white"
                    : "text-black-soft hover:text-black hover:bg-black/5"
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "quickstart" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Quick Start — 3 Steps</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium opacity-60 mb-2">1. Add your provider API key in the dashboard</p>
                  <p className="text-xs opacity-50">Go to API Keys page and add your OpenAI, Anthropic, or Gemini key.</p>
                </div>
                <div>
                  <p className="text-xs font-medium opacity-60 mb-2">2. Create a proxy key</p>
                  <p className="text-xs opacity-50">Go to Proxy Keys page and create a new key. Save it securely — it&apos;s only shown once.</p>
                </div>
                <div>
                  <p className="text-xs font-medium opacity-60 mb-2">3. Use it in your app</p>
                  <CopyBlock code={`// Just change 2 things in your existing code:
// 1. Base URL → TokenScope endpoint
// 2. API Key → Your proxy key (tsk_live_xxx)

fetch("${API_URL}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer tsk_live_YOUR_PROXY_KEY"
  },
  body: JSON.stringify({
    model: "gpt-4o",        // or claude-3-5-sonnet, gemini-2.0-flash
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" }
    ],
    temperature: 0.7,
    max_tokens: 256
  })
})`} language="javascript" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "openai-sdk" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Using the OpenAI SDK (Node.js)</h4>
              <p className="text-xs opacity-60">TokenScope is fully compatible with the OpenAI SDK. Just change the base URL and API key.</p>
              <CopyBlock code={`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${API_URL}/v1",
  apiKey: "tsk_live_YOUR_PROXY_KEY",  // Your TokenScope proxy key
});

const response = await client.chat.completions.create({
  model: "gpt-4o",  // Works with: gpt-4o, claude-3-5-sonnet, gemini-2.0-flash
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in simple terms." }
  ],
  temperature: 0.7,
  max_tokens: 512,
});

console.log(response.choices[0].message.content);`} language="typescript" />
              <div className="p-3 rounded-lg bg-jaffa/5 border border-jaffa/15 text-xs">
                <strong className="text-jaffa-dark">Note:</strong> The same code works for Anthropic and Gemini models too.
                Just change the <code className="bg-black/5 px-1 rounded">model</code> parameter.
                TokenScope detects the provider from the model name and routes accordingly.
              </div>
            </div>
          )}

          {activeTab === "python" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Python (OpenAI SDK)</h4>
              <CopyBlock code={`from openai import OpenAI

client = OpenAI(
    base_url="${API_URL}/v1",
    api_key="tsk_live_YOUR_PROXY_KEY",
)

response = client.chat.completions.create(
    model="gpt-4o",  # or "claude-3-5-sonnet", "gemini-2.0-flash"
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is machine learning?"},
    ],
    temperature=0.7,
    max_tokens=512,
)

print(response.choices[0].message.content)`} language="python" />

              <h4 className="font-semibold text-sm mt-6">Python (requests)</h4>
              <CopyBlock code={`import requests

response = requests.post(
    "${API_URL}/v1/chat/completions",
    headers={
        "Authorization": "Bearer tsk_live_YOUR_PROXY_KEY",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": "Hello!"}
        ],
        "temperature": 0.7,
        "max_tokens": 256,
    },
)

data = response.json()
print(data["choices"][0]["message"]["content"])`} language="python" />
            </div>
          )}

          {activeTab === "curl" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">cURL</h4>
              <CopyBlock code={`curl -X POST '${API_URL}/v1/chat/completions' \\
  -H 'Authorization: Bearer tsk_live_YOUR_PROXY_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'`} language="bash" />
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-5">
              <h4 className="font-semibold text-sm">Features</h4>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-jaffa/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={14} className="text-jaffa" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Token Usage Tracking</h5>
                    <p className="text-xs opacity-60 mt-0.5">Every request logs prompt tokens, completion tokens, and calculates cost in USD based on the model&apos;s pricing.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                    <Wand2 size={14} className="text-green" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Auto-Enhance (TF-IDF Optimization)</h5>
                    <p className="text-xs opacity-60 mt-0.5">
                      When enabled on a proxy key, TokenScope uses TF-IDF analysis to identify the most important tokens
                      in your prompt and creates an optimized version. This can reduce token usage while keeping key meaning.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <Globe size={14} className="text-navy" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Multi-Provider Support</h5>
                    <p className="text-xs opacity-60 mt-0.5">
                      Use OpenAI, Anthropic, and Google Gemini through a single endpoint. TokenScope detects the provider
                      from the model name and routes accordingly. All responses are normalized to OpenAI format.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={14} className="text-green" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Secure Key Management</h5>
                    <p className="text-xs opacity-60 mt-0.5">
                      Provider API keys are encrypted at rest with Fernet (AES-128). Proxy keys are hashed with SHA-256.
                      Your end users never see your provider keys.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Supported Models</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-bg rounded-lg p-3 border border-black-border/50">
                    <p className="text-xs font-bold mb-2 text-jaffa-dark">OpenAI</p>
                    <div className="space-y-1 text-xs font-mono opacity-70">
                      <p>gpt-4o</p>
                      <p>gpt-4o-mini</p>
                      <p>gpt-4-turbo</p>
                      <p>gpt-3.5-turbo</p>
                    </div>
                  </div>
                  <div className="bg-bg rounded-lg p-3 border border-black-border/50">
                    <p className="text-xs font-bold mb-2 text-green">Anthropic</p>
                    <div className="space-y-1 text-xs font-mono opacity-70">
                      <p>claude-3-5-sonnet</p>
                      <p>claude-3-5-haiku</p>
                      <p>claude-3-opus</p>
                    </div>
                  </div>
                  <div className="bg-bg rounded-lg p-3 border border-black-border/50">
                    <p className="text-xs font-bold mb-2 text-navy">Google Gemini</p>
                    <div className="space-y-1 text-xs font-mono opacity-70">
                      <p>gemini-2.0-flash</p>
                      <p>gemini-1.5-pro</p>
                      <p>gemini-1.5-flash</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Reference */}
        <div className="card">
          <h3 className="font-semibold mb-4">API Reference</h3>
          <div className="space-y-3">
            {[
              { method: "POST", path: "/v1/chat/completions", desc: "Send a chat completion request (OpenAI-compatible)" },
              { method: "GET", path: "/v1/models", desc: "List all available models across providers" },
              { method: "GET", path: "/v1/models/{model}", desc: "Get info for a specific model" },
              { method: "GET", path: "/health", desc: "Health check endpoint" },
            ].map((ep, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-black-border last:border-0">
                <Badge variant={ep.method === "POST" ? "jaffa" : "success"} className="font-mono text-[10px] w-12 justify-center flex-shrink-0">
                  {ep.method}
                </Badge>
                <div>
                  <code className="text-xs font-mono font-medium">{ep.path}</code>
                  <p className="text-xs opacity-50 mt-0.5">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
