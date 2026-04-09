import { create } from "zustand";
import type { UsageSummary, UsageRecord, ApiKey } from "@/lib/api";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds

interface UsageState {
  summary: UsageSummary | null;
  history: UsageRecord[];
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  selectedProvider: string | null;
  dateRange: { start: string | null; end: string | null };

  // Cache
  _summaryCache: CacheEntry<UsageSummary> | null;
  _historyCache: CacheEntry<{ records: UsageRecord[]; total: number }> | null;

  setSummary: (summary: UsageSummary) => void;
  setHistory: (records: UsageRecord[]) => void;
  setApiKeys: (keys: ApiKey[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedProvider: (provider: string | null) => void;
  setDateRange: (range: { start: string | null; end: string | null }) => void;
  addUsageRecord: (record: UsageRecord) => void;
  removeApiKey: (id: string) => void;
  invalidateSummary: () => void;
  isCacheValid: () => boolean;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  summary: null,
  history: [],
  apiKeys: [],
  isLoading: false,
  error: null,
  selectedProvider: null,
  dateRange: { start: null, end: null },
  _summaryCache: null,
  _historyCache: null,

  setSummary: (summary) =>
    set({ summary, _summaryCache: { data: summary, timestamp: Date.now() } }),
  setHistory: (history) =>
    set({ history }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setDateRange: (dateRange) => set({ dateRange }),
  addUsageRecord: (record) =>
    set((state) => ({
      history: [record, ...state.history].slice(0, 100),
    })),
  removeApiKey: (id) =>
    set((state) => ({
      apiKeys: state.apiKeys.filter((k) => k.id !== id),
    })),
  invalidateSummary: () =>
    set({ _summaryCache: null }),
  isCacheValid: () => {
    const cache = get()._summaryCache;
    if (!cache) return false;
    return Date.now() - cache.timestamp < CACHE_TTL;
  },
}));
