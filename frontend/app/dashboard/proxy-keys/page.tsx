"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, RefreshCw, Terminal, Copy, Check, Wand2, Zap,
  ExternalLink, Loader2, Globe,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useApi, type ProxyKey } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProxyKeysPage() {
  const { request } = useApi();
  const [keys, setKeys] = useState<ProxyKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState<{ id: string; key: string; label: string } | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await request<ProxyKey[]>("/api/v1/proxy-keys/");
      setKeys(data);
    } catch (e) {
      console.error("Failed to load proxy keys:", e);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await request<{ id: string; key: string; key_label: string; active: boolean; rate_limit: number; auto_enhance: boolean; created_at: string }>(
        "/api/v1/proxy-keys/",
        { method: "POST", body: JSON.stringify({ label: newLabel.trim() || "Default" }) }
      );
      setKeys((prev) => [{ ...result, key_label: result.key_label }, ...prev]);
      setShowKeyModal({ id: result.id, key: result.key, label: result.key_label });
      setNewLabel("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create proxy key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    try {
      await request(`/api/v1/proxy-keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirm(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete key");
    }
  };

  const handleToggleEnhance = async (id: string, current: boolean) => {
    setTogglingKey(id);
    try {
      const result = await request<{ auto_enhance: boolean }>(
        `/api/v1/proxy-keys/${id}/toggle-enhance?enabled=${!current}`,
        { method: "PATCH" }
      );
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, auto_enhance: result.auto_enhance } : k));
    } catch (e: unknown) {
      console.error("Failed to toggle enhance:", e);
    } finally {
      setTogglingKey(null);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div>
      <Header
        title="Proxy Keys"
        description="Create API keys for your applications to use the TokenScope gateway"
      />

      <div className="px-8 py-6 space-y-6">
        {/* How to use */}
        <div className="card border-jaffa/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-jaffa flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">How to use your proxy endpoint</h3>
              <p className="text-xs opacity-60 mt-0.5">
                Replace your OpenAI/Anthropic/Gemini API endpoint with TokenScope to track and optimize all requests.
              </p>
            </div>
          </div>
          <div className="bg-bg rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green font-bold">POST</span>
              <span className="text-black-soft break-all">{API_URL}/v1/chat/completions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-jaffa font-bold opacity-60">AUTH</span>
              <span className="text-black-soft">Bearer <span className="text-green">tsk_live_xxxxx...</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-navy font-bold opacity-60">BODY</span>
              <span className="text-black-soft">model: "gpt-4o", messages: [...], temperature: 0.7</span>
            </div>
          </div>
        </div>

        {/* Create key */}
        <div className="card">
          <h3 className="font-semibold mb-4">Create New Proxy Key</h3>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                placeholder="Key label (e.g., Production App)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <><RefreshCw size={14} className="animate-spin" /> Creating...</> : <><Plus size={14} /> Create Key</>}
            </Button>
          </div>
        </div>

        {/* Keys list */}
        {loading ? (
          <div className="card text-center py-20">
            <Loader2 size={24} className="animate-spin mx-auto text-black-soft mb-3" />
            <p className="text-sm opacity-50">Loading proxy keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-jaffa/8 flex items-center justify-center mx-auto mb-4">
              <Terminal size={24} className="text-jaffa" />
            </div>
            <h3 className="font-bold text-lg mb-2">No proxy keys yet</h3>
            <p className="text-sm opacity-50 mb-6">
              Create your first proxy key to start routing API calls through TokenScope.
            </p>
            <Button onClick={handleCreate} disabled={creating}>
              <Plus size={14} /> Create Your First Proxy Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((k) => (
              <div key={k.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h4 className="font-semibold text-base">{k.key_label}</h4>
                      <Badge variant={k.active ? "success" : "danger"}>{k.active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-xs opacity-50">Created {formatDate(k.created_at)}</p>
                  </div>
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

                <div className="mb-4">
                  <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-2">Proxy Endpoint</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-bg border border-black-border rounded-lg px-3 py-2 text-xs font-mono text-black-soft truncate">
                      {API_URL}/v1/chat/completions
                    </code>
                    <Button variant="outline" size="sm"
                      onClick={() => copyToClipboard(`${API_URL}/v1/chat/completions`, `url-${k.id}`)}
                      className="border-black text-black flex-shrink-0">
                      {copiedKey === `url-${k.id}` ? <Check size={12} /> : <Copy size={12} />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-black-border">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-black-soft" />
                    <span className="text-xs opacity-60">{k.rate_limit} req/min</span>
                  </div>

                  <button
                    onClick={() => handleToggleEnhance(k.id, k.auto_enhance)}
                    disabled={togglingKey === k.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      k.auto_enhance ? "bg-green/10 text-green border border-green/20" : "bg-black/4 text-black-soft border border-transparent hover:bg-black/8"
                    }`}
                  >
                    {togglingKey === k.id ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Auto-Enhance {k.auto_enhance ? "ON" : "OFF"}
                  </button>

                  <a href="/dashboard/logs" className="flex items-center gap-1 text-xs text-jaffa hover:text-jaffa-dark transition-colors ml-auto">
                    View Logs <ExternalLink size={11} />
                  </a>
                </div>

                {k.auto_enhance && (
                  <div className="mt-3 p-2.5 rounded-lg bg-green/5 border border-green/10 text-xs text-green/80">
                    <Wand2 size={11} className="inline mr-1" />
                    Auto-enhancement is active. Prompts will be optimized before being sent to the provider.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Docs */}
        <div className="p-4 bg-surface rounded-xl border border-black-border">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <ExternalLink size={14} className="text-jaffa" /> API Documentation
          </h4>
          <p className="text-xs opacity-50 mb-3">Full API reference at the docs page. The proxy endpoint is OpenAI-compatible.</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="jaffa">OpenAI Compatible</Badge>
            <Badge variant="success">Multi-Provider</Badge>
            <Badge variant="gemini">Token Tracking</Badge>
            <Badge variant="black">Auto-Enhance</Badge>
          </div>
        </div>
      </div>

      {/* Modal for showing the raw key */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-black-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-jaffa flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Proxy Key Created</h3>
                <p className="text-xs opacity-50">{showKeyModal.label}</p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-danger/8 border border-danger/15">
              <p className="text-xs font-bold text-danger flex items-center gap-1.5">
                <Zap size={12} /> Save this key now — it will not be shown again!
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-medium opacity-50 uppercase tracking-wider mb-2">Your Proxy Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-bg border border-black-border rounded-lg px-3 py-2.5 text-xs font-mono break-all bg-jaffa/5">
                  {showKeyModal.key}
                </code>
                <Button variant="outline" size="sm"
                  onClick={() => copyToClipboard(showKeyModal.key, showKeyModal.id)}
                  className="border-black text-black flex-shrink-0">
                  {copiedKey === showKeyModal.id ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={() => setShowKeyModal(null)}>
              Done, I have saved my key
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
