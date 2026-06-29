"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/feed/FilterBar";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useEventStream } from "@/hooks/useEventStream";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, formatScore, scoreColor, statusColor } from "@/lib/utils";
import { trpc } from "@/trpc/client";

type Filter = "all" | "news" | "curiosity" | "trend";

export default function DashboardPage() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("score");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"delete-all" | "delete-selected" | null>(null);
  const [developing, setDeveloping] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const { addToast } = useToast();
  const { events } = useEventStream();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchAll = useCallback(() => {
    utils.seeds.list.invalidate();
    utils.stats.dashboard.invalidate();
  }, [utils]);

  const utils = trpc.useUtils();

  const seedQuery = trpc.seeds.list.useQuery(
    {
      sortBy: sortBy as "score" | "date",
      sourceType: activeFilter !== "all" ? activeFilter : undefined,
      search: search || undefined,
      limit: displayLimit,
    },
    { placeholderData: (prev) => prev },
  );

  const statsQuery = trpc.stats.dashboard.useQuery(undefined, { refetchInterval: 30_000 });

  const deleteMutation = trpc.seeds.deleteMany.useMutation({
    onSuccess: (data) => {
      addToast(`${data.deleted} seeds deleted`);
      setSelectedIds(new Set());
      utils.seeds.list.invalidate();
      utils.stats.dashboard.invalidate();
    },
    onError: (err) => addToast(err.message || "Delete failed", "error"),
  });

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (
        latest.channel === "sagahunter:seeds:new" ||
        latest.channel === "sagahunter:enrichment:new" ||
        latest.channel === "sagahunter:agent:run"
      ) {
        refetchAll();
      }
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [events, refetchAll]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      seedQuery.refetch();
    }, 300);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const seeds = seedQuery.data?.seeds || [];
    if (selectedIds.size === seeds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(seeds.map((s) => s.id)));
    }
  };

  const handleDeleteAll = useCallback(async () => {
    setConfirmAction(null);
    const seeds = seedQuery.data?.seeds || [];
    deleteMutation.mutate({ ids: seeds.map((s) => s.id) });
  }, [seedQuery.data, deleteMutation]);

  const handleDeleteSelected = useCallback(async () => {
    setConfirmAction(null);
    deleteMutation.mutate({ ids: Array.from(selectedIds) });
  }, [selectedIds, deleteMutation]);

  const handleDevelopSelected = useCallback(async () => {
    setDeveloping(true);
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const seedId of ids) {
      try {
        const seed = seedQuery.data?.seeds.find((s) => s.id === seedId);
        const r = await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seedId, title: seed?.title || "Untitled" }),
        });
        if (r.ok) count++;
      } catch { /* skip */ }
    }
    setDeveloping(false);
    setSelectedIds(new Set());
    addToast(`Developed ${count} stories`);
  }, [selectedIds, seedQuery.data, addToast]);

  const seeds = seedQuery.data?.seeds || [];
  const stats = statsQuery.data;

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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white"><AnimatedCounter value={stats.totalSeeds} /></p>
            <p className="text-xs text-gray-500 mt-1">{t("total_seeds")}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-2xl font-bold text-saga-600"><AnimatedCounter value={stats.totalEnrichments} /></p>
            <p className="text-xs text-gray-500 mt-1">{t("enrichments")}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-2xl font-bold text-blue-600"><AnimatedCounter value={stats.totalFeeds} /></p>
            <p className="text-xs text-gray-500 mt-1">{t("active_feeds")}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-2xl font-bold text-purple-600"><AnimatedCounter value={stats.agentRunCount} /></p>
            <p className="text-xs text-gray-500 mt-1">{t("agent_runs")}</p>
          </div>
        </div>
      )}

      {seeds.length > 0 && (
        <div className="mb-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Live Feed</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {seeds.slice(0, 6).map((seed, i) => (
              <Link
                key={seed.id}
                href={`/seed/${seed.id}`}
                className="animate-fade-in shrink-0 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <SourceIcon type={seed.sourceType} className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 truncate flex-1">{seed.sourceName || seed.sourceType}</span>
                  <span className={cn("text-xs font-bold tabular-nums", scoreColor(seed.narrativeScore))}>
                    {formatScore(seed.narrativeScore)}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                  {seed.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={tc("search")}
          className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <FilterBar active={activeFilter} onChange={(f) => { setActiveFilter(f); setSearch(""); setDisplayLimit(20); setSelectedIds(new Set()); }} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSortBy("score"); setDisplayLimit(20); }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              sortBy === "score"
                ? "bg-saga-100 text-saga-700 ring-1 ring-saga-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            Best Score
          </button>
          <button
            onClick={() => { setSortBy("date"); setDisplayLimit(20); }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              sortBy === "date"
                ? "bg-saga-100 text-saga-700 ring-1 ring-saga-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            Most Recent
          </button>
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
      </div>

      {seedQuery.isLoading && !seedQuery.data ? (
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
                      {seed.sourceUrl && (
                        <span onClick={(e) => { e.stopPropagation(); if (seed.sourceUrl) window.open(seed.sourceUrl, '_blank', 'noreferrer'); }} className="text-xs text-saga-500 hover:text-saga-700 hover:underline shrink-0 cursor-pointer">
                          ↗
                        </span>
                      )}
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
          {seedQuery.data?.hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 20)}
                disabled={seedQuery.isFetching}
                className="px-6 py-2.5 text-sm font-medium text-saga-600 bg-saga-50 hover:bg-saga-100 border border-saga-200 rounded-xl transition-colors disabled:opacity-50"
              >
                {seedQuery.isFetching ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Loading...
                  </span>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedIds.size > 0 && confirmAction !== "delete-selected" && confirmAction !== "delete-all" && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">{selectedIds.size} selected</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t("clear_selection")}</button>
            <button onClick={handleDevelopSelected} disabled={developing} className="px-4 py-1.5 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50">
              {developing ? "Developing..." : `Develop (${selectedIds.size})`}
            </button>
            <button onClick={() => setConfirmAction("delete-selected")} className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === "delete-all"}
        title="Delete all seeds"
        message={`Delete all ${activeFilter !== "all" ? activeFilter : ""} seeds (${seeds.length})? This action cannot be undone.`}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === "delete-selected"}
        title="Delete selected seeds"
        message={`Delete ${selectedIds.size} selected seeds? This action cannot be undone.`}
        onConfirm={handleDeleteSelected}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
