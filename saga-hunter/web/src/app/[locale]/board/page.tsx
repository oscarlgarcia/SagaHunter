"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  narrativeScore: number | null;
  status: string;
  _count?: { enrichments: number };
}

export default function BoardPage() {
  const t = useTranslations("board");
  const tc = useTranslations("common");
  const COLUMNS = [
    { key: "discovered", label: t("discovered"), color: "border-blue-400" },
    { key: "analyzed", label: t("analyzed"), color: "border-purple-400" },
    { key: "developing", label: t("developing"), color: "border-green-400" },
    { key: "published", label: t("published"), color: "border-gray-600" },
  ];
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchSeeds = useCallback(async (searchTerm = "") => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const r = await fetch(`/api/seeds?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSeeds(data.seeds);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load seeds");
      setSeeds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchSeeds(value), 300);
  };

  useEffect(() => { fetchSeeds(); }, [fetchSeeds]);

  const handleDrop = async (seedId: string, newStatus: string) => {
    setSeeds((prev) =>
      prev.map((s) => (s.id === seedId ? { ...s, status: newStatus } : s))
    );
    try {
      const r = await fetch(`/api/seeds/${seedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Failed to update");
    } catch {
      fetchSeeds();
    }
  };

  const getColumnSeeds = (status: string) =>
    seeds.filter((s) => s.status === status);

  if (loading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-8rem)] overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex-1 min-w-[250px] bg-gray-100 rounded-xl p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
            <div className="space-y-3">
              <div className="h-20 bg-white rounded-lg" />
              <div className="h-20 bg-white rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{t("load_error")}</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
           <button onClick={() => fetchSeeds()} className="mt-3 text-sm text-red-600 underline">{t("retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={tc("search")}
          className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent placeholder:text-gray-400"
        />
      </div>
      <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.label}
            status={col.key}
            seeds={getColumnSeeds(col.key)}
            borderColor={col.color}
            onDrop={handleDrop}
            onDragStart={(id) => setDraggedId(id)}
            onDragEnd={() => setDraggedId(null)}
          />
        ))}
      </div>
    </div>
  );
}
