"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle2, XCircle, Copy, RefreshCw } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useUsageStore } from "@/store/usage-store";
import type { ApiKey } from "@/lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
];

const DEMO_KEYS: ApiKey[] = [
  {
    id: "1",
    provider: "openai",
    key_label: "Production Key",
    key_last4: "sk-or",
    active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 892,
    total_spent: 67.4,
  },
  {
    id: "2",
    provider: "anthropic",
    key_label: "Claude Production",
    key_last4: "sk-ant",
    active: true,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 540,
    total_spent: 31.8,
  },
  {
    id: "3",
    provider: "gemini",
    key_label: "Gemini Dev",
    key_last4: "AIza",
    active: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 124,
    total_spent: 6.13,
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10A37F",
  anthropic: "#D4A574",
  gemini: "#4285F4",
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
    // Simulate validation
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
            <h3 className="font-semibold text-black mb-4">Add New API Key</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  Provider
                </label>
                <Select
                  options={PROVIDERS}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={
                      provider === "openai"
                        ? "sk-..."
                        : provider === "anthropic"
                        ? "sk-ant-..."
                        : "AIza..."
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  Label (optional)
                </label>
                <Input
                  placeholder="My Production Key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAdd(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!apiKey || validating} className="flex-1">
                  {validating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Validating...
                    </>
                  ) : (
                    <>Add Key</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Keys list */}
        <div className="space-y-4">
          {keys.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
                <Plus size={20} className="text-black-muted" />
              </div>
              <h3 className="font-semibold text-black mb-2">No API keys yet</h3>
              <p className="text-sm text-black-muted mb-4">
                Add your first API key to start tracking usage.
              </p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add API Key
              </Button>
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="card flex items-center justify-between hover:shadow-card-hover transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: PROVIDER_COLORS[key.provider] || "#6B6B6B" }}
                  >
                    {key.provider === "openai"
                      ? "OA"
                      : key.provider === "anthropic"
                      ? "AN"
                      : "GM"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-black">{key.key_label}</h4>
                      <Badge
                        variant={
                          key.active
                            ? "success"
                            : "danger"
                        }
                      >
                        {key.active ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <XCircle size={10} />
                        )}{" "}
                        {key.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs text-black-muted">
                        ••••{key.key_last4}
                      </span>
                      <span className="text-xs text-black-muted">•</span>
                      <span className="text-xs text-black-muted capitalize">
                        {PROVIDER_LABELS[key.provider] || key.provider}
                      </span>
                      <span className="text-xs text-black-muted">•</span>
                      <span className="text-xs text-black-muted">
                        Added {formatDate(key.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {key.usage_count !== undefined && (
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-black">
                        {key.usage_count} calls
                      </p>
                      {key.total_spent !== undefined && (
                        <p className="text-xs text-black-muted">
                          ${key.total_spent.toFixed(2)} spent
                        </p>
                      )}
                    </div>
                  )}
                  <Button
                    variant={deleteConfirm === key.id ? "danger" : "ghost"}
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                  >
                    <Trash2 size={14} />
                    {deleteConfirm === key.id ? "Confirm?" : ""}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-black/5 rounded-lg border border-black-border">
          <p className="text-xs text-black-muted">
            <strong className="text-black">Security:</strong> API keys are stored as SHA-256 hashes and never sent in plain text. We only store the last 4 characters for identification. Free plan supports up to 3 API keys.
          </p>
        </div>
      </div>
    </div>
  );
}
