"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FeedForm } from "@/components/feeds/FeedForm";

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
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);

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
      alert(err.error?.fieldErrors ? Object.values(err.error.fieldErrors).flat().join(", ") : "Failed to create feed");
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
      alert(err.error?.fieldErrors ? Object.values(err.error.fieldErrors).flat().join(", ") : "Failed to update feed");
      return;
    }
    setEditingFeed(null);
    setModalOpen(false);
    fetchFeeds();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feed?")) return;
    const r = await fetch(`/api/feeds/${id}`, { method: "DELETE" });
    if (!r.ok) { alert("Failed to delete feed"); return; }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditingFeed(null); setModalOpen(true); }}>
          {t("add")}
        </Button>
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
              {feeds.map((feed) => (
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
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(feed.id)}>
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
    </div>
  );
}
