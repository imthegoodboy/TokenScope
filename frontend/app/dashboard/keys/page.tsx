"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Key } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUsageStore } from "@/store/usage-store";
import type { ApiKey } from "@/lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const DEMO_KEYS: ApiKey[] = [
  {
    id: "1", provider: "openai", key_label: "Production Key",
    key_last4: "sk-or", active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 892, total_spent: 67.4,
  },
  {
    id: "2", provider: "anthropic", key_label: "Claude Production",
    key_last4: "sk-ant", active: true,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 540, total_spent: 31.8,
  },
  {
    id: "3", provider: "gemini", key_label: "Gemini Dev",
    key_last4: "AIza", active: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 124, total_spent: 6.13,
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#F07F3C",
  anthropic: "#16563B",
  gemini: "#002F4B",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};

export default function KeysPage() {
  const { apiKeys, setApiKeys, removeApiKey } = useUsageStore();
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [validating, setValidating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const keys = apiKeys.length > 0 ? apiKeys : DEMO_KEYS;

  const handleAdd = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newKey: ApiKey = {
      id: Math.random().toString(),
      provider,
      key_label: label || `${PROVIDER_LABELS[provider]} Key`,
      key_last4: apiKey.slice(-8),
      active: true,
      created_at: new Date().toISOString(),
      usage_count: 0,
      total_spent: 0,
    };
    setApiKeys([...apiKeys, newKey]);
    setShowAdd(false);
    setApiKey("");
    setLabel("");
    setValidating(false);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      removeApiKey(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div>
      <Header
        title="API Keys"
        description="Manage your AI provider API keys"
        action={
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus size={14} /> Add Key
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Add key form */}
        {showAdd && (
          <div className="card mb-6 animate-slide-up">
            <h3 className="font-bold text-base mb-5">Add New API Key</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                  Provider
                </label>
                <Select
                  options={PROVIDERS}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                  API Key
                </label>
                <Input
                  type="password"
                  placeholder={
                    provider === "openai" ? "sk-..." :
                    provider === "anthropic" ? "sk-ant-..." : "AIza..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-1.5">
                  Label (optional)
                </label>
                <Input
                  placeholder="My Production Key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 border-black text-black">
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!apiKey || validating} className="flex-1">
                  {validating ? (
                    <><RefreshCw size={14} className="animate-spin" /> Validating...</>
                  ) : (
                    <>Add Key</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Keys list */}
        <div className="space-y-3">
          {keys.length === 0 ? (
            <div className="card text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
                <Key size={24} className="text-jaffa" />
              </div>
              <h3 className="font-bold text-lg mb-2">No API keys yet</h3>
              <p className="text-sm opacity-50 mb-6">
                Add your first API key to start tracking usage.
              </p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add API Key
              </Button>
            </div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="card flex items-center justify-between hover:shadow-card-hover transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: PROVIDER_COLORS[k.provider] || "#6B6B6B" }}
                  >
                    {k.provider === "openai" ? "OA" : k.provider === "anthropic" ? "AN" : "GM"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-semibold text-base">{k.key_label}</h4>
                      <Badge variant={k.active ? "success" : "danger"}>
                        {k.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {k.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs opacity-50">••••{k.key_last4}</span>
                      <span className="opacity-30">·</span>
                      <span className="text-xs opacity-50">{PROVIDER_LABELS[k.provider]}</span>
                      <span className="opacity-30">·</span>
                      <span className="text-xs opacity-40">{formatDate(k.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  {k.usage_count !== undefined && (
                    <div className="text-right">
                      <p className="font-mono font-semibold text-sm">{k.usage_count} calls</p>
                      {k.total_spent !== undefined && (
                        <p className="font-mono text-xs opacity-50">${k.total_spent.toFixed(2)}</p>
                      )}
                    </div>
                  )}
                  <Button
                    variant={deleteConfirm === k.id ? "danger" : "ghost"}
                    size="sm"
                    onClick={() => handleDelete(k.id)}
                    className={deleteConfirm === k.id ? "text-white" : "text-black-soft"}
                  >
                    <Trash2 size={14} />
                    {deleteConfirm === k.id ? "Confirm?" : ""}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-jaffa/5 rounded-xl border border-jaffa/15">
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 mt-0.5 flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="none" className="w-full h-full text-jaffa">
                <path d="M8 1a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" opacity=".5"/>
                <path d="M8 11a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" fill="currentColor"/>
              </svg>
            </div>
            <p className="text-xs opacity-60">
              <strong className="opacity-80">Security:</strong> API keys are stored as SHA-256 hashes and never sent in plain text. Only the last 8 characters are stored for identification. Free plan supports up to 3 API keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
