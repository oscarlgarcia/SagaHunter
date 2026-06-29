"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, formatScore, scoreColor, statusColor } from "@/lib/utils";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { Enrichment } from "@/components/seed/EnrichmentContent";

const EnrichmentSection = lazy(() => import("@/components/seed/EnrichmentSection"));

function EnrichmentFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-100 rounded-lg w-48" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Story {
  id: string;
  status: string;
  createdAt: string;
}

interface Seed {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceName: string | null;
  rawText: string;
  language: string;
  narrativeScore: number | null;
  status: string;
  discoveredAt: string;
  enrichments: Enrichment[];
  story: Story | null;
}

export default function SeedDetailPage() {
  const t = useTranslations("seed");
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { addToast } = useToast();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("raw");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [developing, setDeveloping] = useState(false);

  useEffect(() => {
    fetch(`/api/seeds/${id}`)
      .then((r) => r.json())
      .then(setSeed)
      .catch(() => setSeed(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/seeds/${id}`, { method: "DELETE" });
      if (r.ok) {
        router.push("/");
      } else {
        addToast(t("delete_error"), "error");
        setShowDeleteModal(false);
      }
    } catch {
      addToast(t("delete_error"), "error");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }, [id, router, addToast]);

  const handleDevelopStory = useCallback(async () => {
    if (!seed) return;
    setDeveloping(true);
    try {
      const r = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedId: seed.id, title: seed.title }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.story) router.push(`/stories/${data.story.id}`);
        else addToast(t("develop_error"), "error");
      } else {
        addToast(t("develop_error"), "error");
      }
    } catch {
      addToast(t("develop_error"), "error");
    } finally {
      setDeveloping(false);
    }
  }, [seed, router, addToast]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!seed) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg">{t("not_found")}</p>
      </div>
    );
  }

  const enrichments = seed.enrichments || [];
  const tabs = [
    { key: "raw", label: t("raw_tab"), badge: 0 },
    { key: "analysis", label: t("analysis"), badge: enrichments.filter(e => ["angle_finder", "story_structurer", "genre_classifier"].includes(e.agentName)).length },
    { key: "creative", label: t("creative"), badge: enrichments.filter(e => ["what_if_generator", "world_builder", "character_harvester", "voice_tuner"].includes(e.agentName)).length },
    { key: "publishing", label: t("publishing"), badge: enrichments.filter(e => ["blurb_generator", "series_connector", "plot_hole_detector"].includes(e.agentName)).length },
  ];

  const getEnrichmentsByCategory = (agents: string[]) =>
    enrichments.filter((e) => agents.includes(e.agentName));

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500"><SourceIcon type={seed.sourceType} className="w-6 h-6" /></span>
            <span className="text-sm text-gray-500">{seed.sourceName || seed.sourceType}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500 uppercase">{seed.language}</span>
            {seed.sourceUrl && (
              <>
                <span className="text-gray-300">·</span>
                <a href={seed.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-saga-600 hover:underline">
                  {t("source_link")}
                </a>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{seed.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={async () => {
              try {
                const r = await fetch(`/api/seeds/${seed.id}/export`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${seed.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                addToast(t("export_error"), "error");
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            title={t("export_tooltip")}
          >
            {t("export")}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title={t("delete_tooltip")}
          >
            {tc("delete")}
          </button>
          <span className={cn("text-lg font-bold tabular-nums", scoreColor(seed.narrativeScore))}>
            {formatScore(seed.narrativeScore)}
          </span>
          <span className={cn("text-sm px-3 py-1 rounded-full font-medium", statusColor(seed.status))}>
            {seed.status}
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-saga-600 text-saga-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-2 bg-saga-100 text-saga-700 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === "raw" && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t("raw")}</h3>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                {seed.rawText}
              </p>
            </div>
          )}

          {activeTab === "analysis" && (
            <Suspense fallback={<EnrichmentFallback />}>
              <EnrichmentSection enrichments={getEnrichmentsByCategory(["angle_finder", "story_structurer", "genre_classifier"])} />
            </Suspense>
          )}

          {activeTab === "creative" && (
            <Suspense fallback={<EnrichmentFallback />}>
              <EnrichmentSection enrichments={getEnrichmentsByCategory(["what_if_generator", "world_builder", "character_harvester", "voice_tuner"])} />
            </Suspense>
          )}

          {activeTab === "publishing" && (
            <Suspense fallback={<EnrichmentFallback />}>
              <EnrichmentSection enrichments={getEnrichmentsByCategory(["blurb_generator", "series_connector", "plot_hole_detector"])} />
            </Suspense>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("metadata")}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t("discovered")}</dt>
                <dd className="text-gray-900 dark:text-gray-200">{new Date(seed.discoveredAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t("status")}</dt>
                <dd className="text-gray-900 dark:text-gray-200 capitalize">{seed.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t("language")}</dt>
                <dd className="text-gray-900 dark:text-gray-200 uppercase">{seed.language}</dd>
              </div>
            </dl>
          </div>

          {seed.story && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("story")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("story_status")} {seed.story.status}</p>
              <p className="text-xs text-gray-400 mt-1">{t("story_created")} {new Date(seed.story.createdAt).toLocaleDateString()}</p>
              <button
                onClick={() => router.push(`/stories/${seed.story!.id}`)}
                className="w-full mt-3 px-3 py-2 text-xs font-medium text-saga-700 bg-saga-50 hover:bg-saga-100 rounded-lg transition-colors"
              >
                {t("view_story")}
              </button>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("develop_story")}</h3>
            <p className="text-xs text-gray-500 mb-3">{t("develop_hint")}</p>
            <button
              onClick={handleDevelopStory}
              disabled={developing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {developing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t("develop")}
            </button>
          </div>
        </div>
      </div>

    {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("delete_modal_title")}</h3>
          <p className="text-sm text-gray-600 mb-1">{t("delete_confirm")}</p>
          <p className="text-xs text-gray-400 mb-5">{t("delete_warning")}</p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              {tc("cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? t("deleting") : tc("delete")}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

