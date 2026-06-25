"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BookText, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_FILTERS = ["outline", "drafting", "revising", "completed", "published", "all"];

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  outline: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  drafting: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" },
  revising: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  completed: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-400" },
  published: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
};

const TYPE_LABELS: Record<string, string> = {
  flash_fiction: "Flash Fiction", micro_tale: "Micro Tale", short_story: "Short Story",
  tale: "Tale", novella: "Novella", novel: "Novel", saga: "Saga",
};

interface StorySummary {
  id: string; title: string; type: string | null; status: string;
  targetChapters: number | null; synopsis: string | null;
  createdAt: string; premise: string | null;
  _count: { chapters: number; characters: number; locations: number };
  seed: { sourceType: string; sourceName: string | null; narrativeScore: number | null } | null;
}

export default function StoriesPage() {
  const t = useTranslations("stories");
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filter: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const r = await fetch(`/api/stories${params}`);
      if (!r.ok) throw new Error("Failed to load");
      const data = await r.json();
      setStories(data.stories || []);
    } catch {
      setError(t("load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(activeFilter); }, [activeFilter, load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> {t("new_story")}
        </Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => {
          const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.outline;
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                activeFilter === s
                  ? "bg-saga-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {s !== "all" && <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />}
              {t(s)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-gray-400">{error}</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20">
          <BookText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm">{t("no_stories")}</p>
          <p className="text-xs text-gray-300 mt-1">{t("no_stories_hint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => {
            const cfg = STATUS_CONFIG[story.status] || STATUS_CONFIG.outline;
            const totalSteps = 5;
            const done = [story.type, story.synopsis, story.targetChapters ? "chapters" : null,
              story._count.characters > 0 ? "chars" : null,
              story._count.locations > 0 ? "locs" : null].filter(Boolean).length;
            const pct = Math.round((done / totalSteps) * 100);

            return (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-saga-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{story.title}</h3>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
                        {t(story.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {story.type && (
                        <span>{t("type_label")}: {TYPE_LABELS[story.type] || story.type}</span>
                      )}
                      {story.seed && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {story.seed.sourceName || story.seed.sourceType}
                        </span>
                      )}
                      <span>
                        {story._count.chapters} {t("chapters")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{t("progress")}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              i < done ? "bg-saga-500" : "bg-gray-200"
                            )}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && <CreateStoryModal onClose={() => { setShowModal(false); load(activeFilter); }} />}
    </div>
  );
}

function CreateStoryModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("stories");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<"seed" | "scratch">("seed");
  const [seeds, setSeeds] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [developing, setDeveloping] = useState(false);

  useEffect(() => {
    if (tab !== "seed") return;
    fetch(`/api/seeds?limit=20`).then(r => r.json()).then(d => setSeeds(d.seeds || [])).catch(() => {});
  }, [tab]);

  const handleDevelop = async () => {
    setDeveloping(true);
    try {
      const body = tab === "seed"
        ? { seedId: selectedSeed, title }
        : { title: title || "Untitled Story", premise };
      const r = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        onClose();
        window.location.reload();
      }
    } finally {
      setDeveloping(false);
    }
  };

  const filtered = seeds.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t("new_story")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex border-b border-gray-100">
          {(["seed", "scratch"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setSelectedSeed(null); }}
              className={cn(
                "flex-1 pb-3 pt-3 text-sm font-medium border-b-2 transition-colors",
                tab === tabKey ? "border-saga-600 text-saga-600" : "border-transparent text-gray-500"
              )}
            >
              {tabKey === "seed" ? t("from_seed") : t("from_scratch")}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "seed" ? (
            <>
              <input
                type="text"
                placeholder={t("search_seeds")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3"
              />
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSeed(s.id); setTitle(s.title); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedSeed === s.id ? "bg-saga-50 border border-saga-200" : "hover:bg-gray-50 border border-transparent"
                    )}
                  >
                    <span className="font-medium text-gray-900">{s.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.sourceType} · {s.narrativeScore || "—"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Story title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                placeholder={t("premise_label")}
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{tCommon("cancel")}</button>
          <button
            onClick={handleDevelop}
            disabled={developing || (tab === "seed" && !selectedSeed) || !title}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {developing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("develop")}
          </button>
        </div>
      </div>
    </div>
  );
}
