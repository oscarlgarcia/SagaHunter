"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FilterBar } from "@/components/feed/FilterBar";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { cn, formatScore, scoreColor, statusColor } from "@/lib/utils";

type Filter = "all" | "news" | "curiosity" | "trend";

interface Stats {
  totalSeeds: number;
  totalEnrichments: number;
  totalFeeds: number;
  agentRunCount: number;
  seedsByStatus: Record<string, number>;
}

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceName: string | null;
  language: string;
  narrativeScore: number | null;
  status: string;
  discoveredAt: string;
}

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all",
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      <span>{type === "success" ? "✓" : "!"}</span>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

function ConfirmBar({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed bottom-0 left-64 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
      <p className="text-sm text-gray-700 font-medium">{message}</p>
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("home");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"delete-all" | "delete-selected" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchSeeds = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ sortBy: "score" });
    if (activeFilter !== "all") params.set("sourceType", activeFilter);
    fetch(`/api/seeds?${params}`)
      .then((r) => r.json())
      .then((data) => setSeeds(data.seeds || []))
      .catch(() => setSeeds([]))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => { fetchSeeds(); }, [fetchSeeds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === seeds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(seeds.map((s) => s.id)));
    }
  };

  const handleDeleteAll = useCallback(async () => {
    setConfirmAction(null);
    setToast(null);
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("sourceType", activeFilter);
    try {
      const r = await fetch(`/api/seeds?${params}`, { method: "DELETE" });
      const data = await r.json();
      if (r.ok) {
        setToast({ message: `${data.deleted} seeds deleted`, type: "success" });
        setSelectedIds(new Set());
        fetchSeeds();
      } else {
        setToast({ message: data.error || "Delete failed", type: "error" });
      }
    } catch {
      setToast({ message: "Delete failed. Is the server running?", type: "error" });
    }
  }, [activeFilter, fetchSeeds]);

  const handleDeleteSelected = useCallback(async () => {
    setConfirmAction(null);
    setToast(null);
    const ids = Array.from(selectedIds);
    try {
      const r = await fetch(`/api/seeds?ids=${ids.join(",")}`, { method: "DELETE" });
      const data = await r.json();
      if (r.ok) {
        setToast({ message: `${data.deleted} seeds deleted`, type: "success" });
        setSelectedIds(new Set());
        fetchSeeds();
      } else {
        setToast({ message: data.error || "Delete failed", type: "error" });
      }
    } catch {
      setToast({ message: "Delete failed. Is the server running?", type: "error" });
    }
  }, [selectedIds, fetchSeeds]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.totalSeeds}</p>
            <p className="text-xs text-gray-500 mt-1">{t("total_seeds")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-saga-600">{stats.totalEnrichments}</p>
            <p className="text-xs text-gray-500 mt-1">{t("enrichments")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.totalFeeds}</p>
            <p className="text-xs text-gray-500 mt-1">{t("active_feeds")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-purple-600">{stats.agentRunCount}</p>
            <p className="text-xs text-gray-500 mt-1">{t("agent_runs")}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <FilterBar active={activeFilter} onChange={(f) => { setActiveFilter(f); setSelectedIds(new Set()); }} />
        {seeds.length > 0 && (
          <button
            onClick={() => setConfirmAction("delete-all")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete All
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : seeds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">?</p>
          <p className="text-lg font-medium">{t("no_seeds")}</p>
          <p className="text-sm mt-1">{t("no_seeds_hint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seeds.length > 1 && (
            <label className="flex items-center gap-2 px-1 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === seeds.length}
                onChange={selectAll}
                className="w-4 h-4 rounded border-gray-300 text-saga-600 focus:ring-saga-500"
              />
              <span className="text-xs text-gray-400 font-medium">Select all ({seeds.length})</span>
            </label>
          )}
          {seeds.map((seed) => (
            <div key={seed.id} className="flex items-start gap-3 group">
              <div className="pt-5 pl-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(seed.id)}
                  onChange={() => toggleSelect(seed.id)}
                  className="w-4 h-4 rounded border-gray-300 text-saga-600 focus:ring-saga-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={selectedIds.has(seed.id) ? { opacity: 1 } : undefined}
                />
              </div>
              <Link
                href={`/seed/${seed.id}`}
                className="flex-1 block bg-white rounded-xl p-5 border border-gray-100 hover:border-saga-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500" title={seed.sourceType}>
                        <SourceIcon type={seed.sourceType} className="w-5 h-5" />
                      </span>
                      <span className="text-xs text-gray-400 uppercase">{seed.sourceName || seed.sourceType}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 uppercase">{seed.language}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 truncate">{seed.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn("text-sm font-bold tabular-nums", scoreColor(seed.narrativeScore))}>
                      {formatScore(seed.narrativeScore)}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(seed.status))}>
                      {seed.status}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && confirmAction !== "delete-selected" && confirmAction !== "delete-all" && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">{selectedIds.size} selected</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Clear</button>
            <button onClick={() => setConfirmAction("delete-selected")} className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {confirmAction === "delete-all" && (
        <ConfirmBar
          message={`Delete all ${activeFilter !== "all" ? activeFilter : ""} seeds (${seeds.length})? This action cannot be undone.`}
          onConfirm={handleDeleteAll}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === "delete-selected" && (
        <ConfirmBar
          message={`Delete ${selectedIds.size} selected seeds? This action cannot be undone.`}
          onConfirm={handleDeleteSelected}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
