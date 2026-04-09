"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Key, Loader2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { listApiKeys, addApiKey, deleteApiKey, type ApiKey } from "@/lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
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

export default function APIKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await listApiKeys();
      setKeys(data);
    } catch (e) {
      console.error("Failed to load keys:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleAdd = async () => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const newKey = await addApiKey({
        provider,
        api_key: apiKeyInput.trim(),
        key_label: label.trim() || `${PROVIDER_LABELS[provider]} Key`,
      });
      setKeys((prev) => [newKey, ...prev]);
      setShowAdd(false);
      setApiKeyInput("");
      setLabel("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add key");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirm(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete key");
    }
  };

  return (
    <div>
      <Header
        title="API Keys"
        description="Add your AI provider API keys (OpenAI, Anthropic, Gemini)"
        action={
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus size={14} /> Add Provider Key
          </Button>
        }
      />

      <div className="px-8 py-6">
        {/* Add key form */}
        {showAdd && (
          <div className="card mb-6 animate-slide-up">
            <h3 className="font-bold text-base mb-5">Add Provider API Key</h3>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
                {error}
              </div>
            )}
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
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
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
                <Button variant="outline" onClick={() => { setShowAdd(false); setError(null); }} className="flex-1 border-black text-black">
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!apiKeyInput.trim() || saving} className="flex-1">
                  {saving ? (
                    <><RefreshCw size={14} className="animate-spin" /> Saving...</>
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
          {loading ? (
            <div className="card text-center py-20">
              <Loader2 size={24} className="animate-spin mx-auto text-black-soft mb-3" />
              <p className="text-sm opacity-50">Loading your API keys...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="card text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
                <Key size={24} className="text-jaffa" />
              </div>
              <h3 className="font-bold text-lg mb-2">No provider keys yet</h3>
              <p className="text-sm opacity-50 mb-6">
                Add your OpenAI, Anthropic, or Gemini API key to start using the proxy gateway.
              </p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add Your First API Key
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
                      <h4 className="font-semibold text-base">
                        {k.key_label || `${PROVIDER_LABELS[k.provider]} Key`}
                      </h4>
                      <Badge variant={k.active ? "success" : "danger"}>
                        {k.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {k.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs opacity-50">
                        ••••{k.key_last4}
                      </span>
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
                      <p className="font-mono font-semibold text-sm">{k.usage_count.toLocaleString()} calls</p>
                      {k.total_spent !== undefined && (
                        <p className="font-mono text-xs opacity-50">{formatCurrency(k.total_spent)}</p>
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
              <strong className="opacity-80">Security:</strong> API keys are encrypted and never sent in plain text.
              Only the last 4 characters are stored for identification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
