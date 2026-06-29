"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FeedForm } from "@/components/feeds/FeedForm";
import { BatchFeedForm } from "@/components/feeds/BatchFeedForm";
import { FilterBar } from "@/components/feed/FilterBar";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Feed {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  language: string;
  enabled: boolean;
  intervalMinutes: number;
  maxPages: number | null;
  maxEntries: number | null;
  lastFetchedAt: string | null;
}

interface FeedFormData {
  name: string;
  url: string;
  sourceType: "news" | "curiosity" | "trend";
  language: string;
  intervalMinutes: number;
  maxPages: number | null;
  maxEntries: number | null;
}

export default function FeedsPage() {
  const t = useTranslations("feeds");
  const tc = useTranslations("common");
  const { addToast } = useToast();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "news" | "curiosity" | "trend">("all");

  const filteredFeeds = useMemo(() => {
    let result = feeds;
    if (sourceFilter !== "all") {
      result = result.filter((f) => f.sourceType === sourceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.url.toLowerCase().includes(q));
    }
    return result;
  }, [feeds, sourceFilter, searchQuery]);

  const fetchFeeds = async () => {
    try {
      const r = await fetch("/api/feeds");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setFeeds(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feeds");
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeeds(); }, []);

  const handleCreate = async (data: FeedFormData) => {
    const r = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json();
      addToast(err.error?.fieldErrors ? Object.values(err.error.fieldErrors).flat().join(", ") : "Failed to create feed", "error");
      return;
    }
    setModalOpen(false);
    fetchFeeds();
  };

  const handleUpdate = async (data: FeedFormData) => {
    if (!editingFeed) return;
    const r = await fetch(`/api/feeds/${editingFeed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json();
      addToast(err.error?.fieldErrors ? Object.values(err.error.fieldErrors).flat().join(", ") : "Failed to update feed", "error");
      return;
    }
    setEditingFeed(null);
    setModalOpen(false);
    fetchFeeds();
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`/api/feeds/${id}`, { method: "DELETE" });
    if (!r.ok) { addToast("Failed to delete feed", "error"); return; }
    fetchFeeds();
  };

  const handleToggle = async (feed: Feed) => {
    await fetch(`/api/feeds/${feed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !feed.enabled }),
    });
    fetchFeeds();
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const r = await fetch("/api/feeds/reprocess", { method: "POST" });
      const data = await r.json();
      addToast(`${data.reprocessed} feeds queued for reprocessing`);
    } catch {
      addToast("Failed to reprocess feeds", "error");
    }
    setReprocessing(false);
  };

  const handleBatchSubmit = async (feeds: any[]) => {
    try {
      const r = await fetch("/api/feeds/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeds }),
      });
      const data = await r.json();
      if (!r.ok) {
        addToast(data.error || "Invalid request", "error");
        setBatchModalOpen(false);
        return;
      }
      const lines: string[] = [];
      if (data.created > 0) lines.push(`${data.created} created`);
      if (data.skipped > 0 && data.skippedUrls?.length > 0) {
        lines.push(`${data.skipped} skipped (duplicates): ${data.skippedUrls.join(", ")}`);
      } else if (data.skipped > 0) {
        lines.push(`${data.skipped} skipped (duplicates)`);
      }
      if (data.validationErrors?.length > 0) {
        const urls = data.validationErrors.map((e: any) => e.url).filter(Boolean).join(", ");
        lines.push(`${data.validationErrors.length} invalid${urls ? `: ${urls}` : ""}`);
      }
      if (data.errors?.length > 0) {
        const urls = data.errors.map((e: any) => e.url).filter(Boolean).join(", ");
        lines.push(`${data.errors.length} failed${urls ? `: ${urls}` : ""}`);
      }
      addToast(lines.join(" · ") || "No feeds processed", data.errors?.length > 0 || data.validationErrors?.length > 0 ? "error" : "success");
    } catch {
      addToast("Failed to add feeds", "error");
    }
    setBatchModalOpen(false);
    fetchFeeds();
  };

  if (error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{t("load_error")}</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
          <button onClick={fetchFeeds} className="mt-3 text-sm text-red-600 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
          </div>
          {feeds.length > 0 && (
            <span className="text-xs font-medium text-saga-600 bg-saga-50 px-2.5 py-1 rounded-full">
              {sourceFilter !== "all" || searchQuery.trim() ? `${filteredFeeds.length}/${feeds.length}` : `${feeds.length} total`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {feeds.length > 0 && (
            <Button variant="secondary" onClick={handleReprocess} disabled={reprocessing}>
              {reprocessing ? "Reprocessing..." : "Reprocess All"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setBatchModalOpen(true)}>
            Batch Add
          </Button>
          <Button onClick={() => { setEditingFeed(null); setModalOpen(true); }}>
            {t("add")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">📡</p>
          <p className="text-lg font-medium">{t("no_feeds")}</p>
          <p className="text-sm mt-1">{t("no_feeds_hint")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tc("search")}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent"
              />
            </div>
            <FilterBar active={sourceFilter} onChange={setSourceFilter} />
          </div>
          {filteredFeeds.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">{tc("no_results")}</p>
            </div>
          ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t("name")}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t("url")}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t("type")}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t("lang")}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t("interval")}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Pages</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Entries</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t("status")}</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeeds.map((feed) => (
                <tr key={feed.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{feed.name}</td>
                  <td className="px-5 py-4 text-gray-500 max-w-[300px] truncate">{feed.url}</td>
                  <td className="px-5 py-4 text-center">
                    <Badge className="bg-gray-100 text-gray-700">{feed.sourceType}</Badge>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-600 uppercase">{feed.language}</td>
                  <td className="px-5 py-4 text-center text-gray-600">{feed.intervalMinutes}m</td>
                  <td className="px-5 py-4 text-center text-gray-600">{feed.maxPages ?? "∞"}</td>
                  <td className="px-5 py-4 text-center text-gray-600">{feed.maxEntries ?? "∞"}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleToggle(feed)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        feed.enabled ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${feed.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                      {feed.enabled ? t("enabled") : t("disabled")}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingFeed(feed); setModalOpen(true); }}
                      >
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(feed.id)}>
                        🗑️
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingFeed ? t("edit") : t("add")}>
        <FeedForm
          initial={editingFeed ? {
            name: editingFeed.name,
            url: editingFeed.url,
            sourceType: editingFeed.sourceType as any,
            language: editingFeed.language,
            intervalMinutes: editingFeed.intervalMinutes,
            maxPages: editingFeed.maxPages,
            maxEntries: editingFeed.maxEntries,
          } : undefined}
          onSubmit={editingFeed ? handleUpdate : handleCreate}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title="Batch Add Feeds">
        <BatchFeedForm onSubmit={handleBatchSubmit} onCancel={() => setBatchModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete feed"
        message="Delete this feed? This action cannot be undone."
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); setDeleteConfirmId(null); }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
