"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn, formatScore, scoreColor, statusColor } from "@/lib/utils";
import { SourceIcon } from "@/components/ui/SourceIcon";

interface Enrichment {
  id: string;
  agentName: string;
  data: any;
  llmData: any | null;
  llmGeneratedAt: string | null;
  createdAt: string;
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

const AGENT_LABELS: Record<string, string> = {
  find_the_angle: "Find The Angle",
  story_structure: "Story Structure",
  kindle_pre_check: "Kindle Pre-Check",
  what_if_generator: "What If Generator",
  what_if: "What If Generator",
  world_builder: "World Builder",
  character_harvester: "Character Harvester",
  voice_tuner: "Voice Tone Tuner",
  blurb_generator: "Blurb Generator",
  series_connector: "Series Connector",
  plot_hole_detector: "Plot Hole Detector",
  angle_finder: "Angle Finder",
  story_structurer: "Story Structurer",
  genre_classifier: "Genre Classifier",
};

export default function SeedDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("raw");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/seeds/${id}`)
      .then((r) => r.json())
      .then(setSeed)
      .catch(() => setSeed(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/seeds/${id}`, { method: "DELETE" });
      if (r.ok) {
        router.push("/");
      } else {
        setToast({ message: "Failed to delete seed", type: "error" });
        setShowDeleteModal(false);
      }
    } catch {
      setToast({ message: "Failed to delete seed", type: "error" });
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }, [id, router]);

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
        <p className="text-lg">Seed not found</p>
      </div>
    );
  }

  const enrichments = seed.enrichments || [];
  const tabs = [
    { key: "raw", label: "Raw Text" },
    { key: "analysis", label: "Analysis", badge: enrichments.filter(e => ["angle_finder", "story_structurer", "genre_classifier", "find_the_angle", "story_structure", "kindle_pre_check"].includes(e.agentName)).length },
    { key: "creative", label: "Creative", badge: enrichments.filter(e => ["what_if_generator", "what_if", "world_builder", "character_harvester", "voice_tuner", "world_builder"].includes(e.agentName)).length },
    { key: "publishing", label: "Publishing", badge: enrichments.filter(e => ["blurb_generator", "series_connector", "plot_hole_detector"].includes(e.agentName)).length },
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
                  Source ↗
                </a>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{seed.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              fetch(`/api/seeds/${seed.id}/export`)
                .then((r) => r.json())
                .then((data) => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${seed.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Export seed data as JSON"
          >
            Export
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Delete this seed"
          >
            Delete
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Original Content</h3>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                {seed.rawText}
              </p>
            </div>
          )}

          {activeTab === "analysis" && (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(["angle_finder", "story_structurer", "genre_classifier", "find_the_angle", "story_structure", "kindle_pre_check"])} />
          )}

          {activeTab === "creative" && (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(["what_if_generator", "what_if", "world_builder", "character_harvester", "voice_tuner", "world_builder"])} />
          )}

          {activeTab === "publishing" && (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(["blurb_generator", "series_connector", "plot_hole_detector"])} />
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Metadata</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Discovered</dt>
                <dd className="text-gray-900">{new Date(seed.discoveredAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-900 capitalize">{seed.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Language</dt>
                <dd className="text-gray-900 uppercase">{seed.language}</dd>
              </div>
            </dl>
          </div>

          {seed.story && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📖 Story</h3>
              <p className="text-sm text-gray-600">Status: {seed.story.status}</p>
              <p className="text-xs text-gray-400 mt-1">Created: {new Date(seed.story.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

    {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Seed</h3>
          <p className="text-sm text-gray-600 mb-1">Are you sure you want to delete this seed and all its enrichments?</p>
          <p className="text-xs text-gray-400 mb-5">This action cannot be undone.</p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}

    {toast && (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-red-600 text-white">
        <span>!</span>
        <span>{toast.message}</span>
        <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
      </div>
    )}
    </>
  );
}

type ViewMode = "heuristic" | "ai";

function EnrichmentSection({ enrichments }: { enrichments: Enrichment[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("heuristic");
  const [localEnrichments, setLocalEnrichments] = useState(enrichments);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isAnyGenerating, setIsAnyGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setLocalEnrichments(enrichments); }, [enrichments]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const generateLLM = useCallback(async (enr: Enrichment) => {
    setGeneratingId(enr.id);
    setIsAnyGenerating(true);
    setError(null);
    startTimer();
    try {
      const r = await fetch(`/api/enrichments/${enr.id}/llm`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      const updated: Enrichment = await r.json();
      setLocalEnrichments((prev) =>
        prev.map((e) => (e.id === enr.id ? { ...e, llmData: updated.llmData, llmGeneratedAt: updated.llmGeneratedAt } : e))
      );
    } catch (err: any) {
      setError(err.message || "LLM enrichment failed. Is Ollama running?");
    } finally {
      setGeneratingId(null);
      setIsAnyGenerating(false);
      stopTimer();
    }
  }, [startTimer, stopTimer]);

  const generateAll = useCallback(async () => {
    const toGenerate = localEnrichments.filter(e => !e.llmData);
    if (toGenerate.length === 0) return;
    setIsAnyGenerating(true);
    setBulkProgress({ current: 0, total: toGenerate.length });
    setError(null);
    const errors: string[] = [];
    for (let i = 0; i < toGenerate.length; i++) {
      const enr = toGenerate[i];
      setGeneratingId(enr.id);
      setBulkProgress({ current: i + 1, total: toGenerate.length });
      setElapsed(0);
      startTimer();
      try {
        const r = await fetch(`/api/enrichments/${enr.id}/llm`, { method: "POST" });
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        const updated: Enrichment = await r.json();
        setLocalEnrichments((prev) =>
          prev.map((e) => (e.id === enr.id ? { ...e, llmData: updated.llmData, llmGeneratedAt: updated.llmGeneratedAt } : e))
        );
      } catch (err: any) {
        errors.push(`${enr.agentName}: ${(err.message || "failed").slice(0, 80)}`);
      } finally {
        setGeneratingId(null);
        stopTimer();
      }
    }
    setBulkProgress(null);
    setIsAnyGenerating(false);
    if (errors.length > 0) {
      setError(`Generated ${toGenerate.length - errors.length}/${toGenerate.length}. Errors: ${errors.join("; ")}`);
    }
  }, [localEnrichments, startTimer, stopTimer]);

  if (localEnrichments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-400">No analysis yet. Configure agents to process this seed.</p>
      </div>
    );
  }

  const toGenerateCount = localEnrichments.filter(e => !e.llmData).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {viewMode === "ai" && toGenerateCount > 0 && (
            <button
              onClick={generateAll}
              disabled={isAnyGenerating}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isAnyGenerating
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm"
              )}
            >
              {bulkProgress
                ? <>Generating {bulkProgress.current}/{bulkProgress.total}...</>
                : <>Generate All ({toGenerateCount})</>}
            </button>
          )}
        </div>
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setViewMode("heuristic")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              viewMode === "heuristic" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Heuristic
          </button>
          <button
            onClick={() => setViewMode("ai")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              viewMode === "ai" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            AI
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2" role="alert">
          <span className="text-red-500 mt-0.5 shrink-0">!</span>
          <p className="text-sm text-red-700 flex-1 leading-relaxed">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm font-medium shrink-0">✕</button>
        </div>
      )}

      {localEnrichments.map((enr) => {
        const isGeneratingThis = generatingId === enr.id;
        const hasLlm = !!enr.llmData;

        return (
          <div key={enr.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-700">
                  {AGENT_LABELS[enr.agentName] || enr.agentName}
                </h4>
                {viewMode === "ai" && hasLlm && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-medium">AI</span>
                )}
                {viewMode === "heuristic" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Heuristic</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {viewMode === "ai" && hasLlm
                  ? new Date(enr.llmGeneratedAt!).toLocaleDateString()
                  : new Date(enr.createdAt).toLocaleDateString()}
              </span>
            </div>

            {viewMode === "heuristic" && <EnrichmentContent agentName={enr.agentName} data={enr.data} />}

            {viewMode === "ai" && hasLlm && (
              <>
                <EnrichmentContent agentName={enr.agentName} data={enr.llmData} />
                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                  <button
                    onClick={() => generateLLM(enr)}
                    disabled={isAnyGenerating}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      isAnyGenerating
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Regenerate with AI
                  </button>
                </div>
              </>
            )}

            {viewMode === "ai" && !hasLlm && (
              <div className="text-center py-4">
                <button
                  onClick={() => generateLLM(enr)}
                  disabled={isAnyGenerating}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isGeneratingThis
                      ? "bg-purple-100 text-purple-700 cursor-wait"
                      : isAnyGenerating
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm"
                  )}
                >
                  {isGeneratingThis ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating... ({elapsed}s)
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v18" /><path d="M3 12h18" />
                      </svg>
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EnrichmentContent({ agentName, data }: { agentName: string; data: any }) {
  if (typeof data === "string") {
    return <p className="text-sm text-gray-600 whitespace-pre-wrap">{data}</p>;
  }

  if (agentName === "genre_classifier" && data.genre_scores) {
    const genres = Object.entries(data.genre_scores) as [string, { score: number; matches: number }][];
    const sorted = genres.sort(([, a], [, b]) => b.score - a.score);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {sorted.slice(0, 5).map(([genre, scores]) => (
            <span key={genre} className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              scores.score >= 50 ? "bg-saga-100 text-saga-700" :
              scores.score >= 20 ? "bg-blue-50 text-blue-600" :
              "bg-gray-100 text-gray-500"
            )}>
              {genre}
              <span className="opacity-60">{scores.score}%</span>
            </span>
          ))}
        </div>
        {data.primary_genre && (
          <p className="text-xs text-gray-400">
            Primary: <span className="font-medium text-gray-600 capitalize">{data.primary_genre}</span>
            {data.secondary_genre && <> · Secondary: <span className="font-medium text-gray-600 capitalize">{data.secondary_genre}</span></>}
          </p>
        )}
      </div>
    );
  }

  if (agentName === "story_structurer" && data.three_act_scores) {
    const acts = Object.entries(data.three_act_scores) as [string, { label: string; detected: boolean; matches: number }][];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {acts.map(([, act]) => (
            <span key={act.label} className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              act.detected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
            )}>
              {act.detected ? "+" : "o"} {act.label}
            </span>
          ))}
        </div>
        {data.structure_name && (
          <p className="text-xs text-gray-400">
            Structure: <span className="font-medium text-gray-600">{data.structure_name}</span>
          </p>
        )}
      </div>
    );
  }

  if (agentName === "angle_finder" && data.theme_scores) {
    const themeLabels: Record<string, string> = { conflict: "Conflict", mystery: "Mystery", arc: "Arc" };
    const themeColors: Record<string, string> = { conflict: "bg-red-400", mystery: "bg-purple-400", arc: "bg-blue-400" };
    return (
      <div className="space-y-3 text-sm text-gray-600">
        {data.summary && (
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-gray-400 text-lg leading-none mt-0.5 shrink-0">"</span>
            <p className="text-gray-700 italic leading-relaxed">{data.summary}</p>
          </div>
        )}
        {data.protagonists?.length > 0 && (
          <p><span className="text-gray-400">Protagonists:</span> <span className="font-medium text-gray-700">{data.protagonists.join(", ")}</span></p>
        )}
        {data.conflict_type && (
          <p><span className="text-gray-400">Conflict:</span> <span className="font-medium text-gray-700 capitalize">{data.conflict_type}</span></p>
        )}
        {data.settings?.length > 0 && (
          <p><span className="text-gray-400">Setting:</span> <span className="font-medium text-gray-700">{data.settings.join(", ")}</span></p>
        )}
        {data.theme_scores && (
          <div className="flex items-center gap-3 pt-1">
            {Object.entries(data.theme_scores).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", themeColors[key] || "bg-gray-400")} />
                <span className="text-xs text-gray-500">{themeLabels[key] || key}</span>
                <span className="text-xs font-semibold text-gray-700">{val as number}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agentName === "plot_hole_detector" && data.issues !== undefined) {
    const gradeColor = (grade: string) =>
      grade === "A" ? "text-green-600" :
      grade === "B" ? "text-blue-600" :
      grade === "C" ? "text-yellow-600" :
      grade === "D" ? "text-orange-600" : "text-red-600";
    const sevColor = (s: string) =>
      s === "critical" ? "bg-red-100 text-red-700 border-red-200" :
      s === "major" ? "bg-orange-100 text-orange-700 border-orange-200" :
      "bg-yellow-100 text-yellow-700 border-yellow-200";

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={cn("text-3xl font-bold tabular-nums", gradeColor(data.grade))}>{data.grade}</div>
            <div className="text-xs text-gray-400 mt-0.5">Grade</div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold tabular-nums", data.consistency_score >= 70 ? "text-green-600" : "text-orange-600")}>{data.consistency_score}%</div>
            <div className="text-xs text-gray-400 mt-0.5">Consistency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-gray-700">{data.total_issues}</div>
            <div className="text-xs text-gray-400 mt-0.5">Issues</div>
          </div>
        </div>

        {data.by_severity && (data.by_severity.critical > 0 || data.by_severity.major > 0 || data.by_severity.minor > 0) && (
          <div className="flex gap-3 text-xs">
            {data.by_severity.critical > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">{data.by_severity.critical} critical</span>}
            {data.by_severity.major > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">{data.by_severity.major} major</span>}
            {data.by_severity.minor > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">{data.by_severity.minor} minor</span>}
          </div>
        )}

        {data.issues?.length > 0 && (
          <div className="space-y-2">
            {data.issues.map((issue: any, i: number) => (
              <div key={i} className={cn("rounded-lg border p-3", sevColor(issue.severity))}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase">{issue.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-white/50">{issue.severity}</span>
                </div>
                <p className="text-xs opacity-80 mb-1">{issue.description}</p>
                <p className="text-xs opacity-60 italic">{issue.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {data.issues?.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-green-700">No issues detected</p>
            <p className="text-xs text-green-600 mt-1">Your narrative appears consistent across all enrichments.</p>
          </div>
        )}

        <p className="text-xs text-gray-400">Based on {data.agents_analyzed} enrichments</p>
      </div>
    );
  }

  if (agentName === "series_connector" && data.connections) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {data.total_connections > 0
            ? `This seed connects to ${data.total_connections} other seed${data.total_connections > 1 ? 's' : ''}.`
            : "No connections found."}
        </p>
        {data.connections.map((conn: any, i: number) => (
          <div key={i} className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-4">
            <div className={cn(
              "w-2 h-full min-h-[3rem] rounded-full shrink-0 mt-0.5",
              conn.connection_type === "character_overlap" ? "bg-purple-400" :
              conn.connection_type === "shared_universe" ? "bg-blue-400" :
              conn.connection_type === "thematic_saga" ? "bg-green-400" :
              "bg-gray-400"
            )} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{conn.seed_title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {conn.connection_label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{conn.connection_description}</p>
              <div className="flex flex-wrap gap-1.5">
                {conn.matches?.map((m: any, j: number) => (
                  <span key={j} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {m[0]}: {m[1].join(", ")}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-medium text-saga-600">{conn.score} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "blurb_generator" && data.variants) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400">Genre:</span>
          <span className="text-xs font-medium text-gray-600 capitalize">{data.genre}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">Best for:</span>
          <span className="text-xs font-medium text-gray-600">{data.best_for}</span>
        </div>
        {data.variants.map((v: any, i: number) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-saga-600 uppercase">{v.label}</span>
              <span className="text-xs text-gray-400">{v.word_count} words · {v.length}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic">{v.blurb}</p>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "voice_tuner" && data.narrative_voice) {
    const v = data.narrative_voice;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">POV</span>
            <span className="text-sm font-medium text-gray-800">{v.pov.label}</span>
            <span className="text-xs text-gray-400 ml-2">({v.pov.confidence}%)</span>
            <p className="text-xs text-gray-500 mt-1">{v.pov.description}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Tense</span>
            <span className="text-sm font-medium text-gray-800">{v.tense.label}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Register</span>
            <span className="text-sm font-medium text-gray-800">{v.primary_register}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Pacing</span>
            <span className="text-sm font-medium text-gray-800">{data.pacing.label}</span>
            <p className="text-xs text-gray-500 mt-1">{data.pacing.description}</p>
          </div>
        </div>

        {data.mood?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Mood</h5>
            <div className="flex flex-wrap gap-2">
              {data.mood.map((m: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.readability && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Readability</h5>
            <div className="flex items-center gap-3 text-sm">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                data.readability.level === "easy" ? "bg-green-100 text-green-700" :
                data.readability.level === "moderate" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {data.readability.level}
              </span>
              <span className="text-xs text-gray-500">{data.readability.avg_sentence_length} words/sentence</span>
              <span className="text-xs text-gray-500">{data.readability.long_word_ratio}% long words</span>
            </div>
          </div>
        )}

        {data.style_examples && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Style Exploration</h5>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-2">
              <span className="text-xs font-semibold text-blue-600 uppercase block mb-1">Original</span>
              <p className="text-xs text-blue-800 italic">{data.style_examples.original_style?.sample}</p>
            </div>
            {data.style_examples.alternatives?.map((alt: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
                <span className="text-xs font-semibold text-saga-600 uppercase block mb-1">Try: {alt.style}</span>
                <p className="text-xs text-gray-600 italic mb-1">{alt.example}</p>
                <p className="text-xs text-gray-400">{alt.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agentName === "character_harvester" && data.characters) {
    return (
      <div className="space-y-3">
        {data.characters.length === 0 && (
          <p className="text-sm text-gray-400">No characters detected in this seed.</p>
        )}
        {data.characters.map((ch: any, i: number) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-saga-100 flex items-center justify-center text-saga-700 font-bold text-sm shrink-0">
                {ch.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800 text-sm">{ch.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {ch.role}
                  </span>
                  {ch.is_protagonist && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                      Main
                    </span>
                  )}
                </div>
                {ch.context && (
                  <p className="text-xs text-gray-500 mb-2 italic">"{ch.context}"</p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ch.traits?.map((trait: string, j: number) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                      {trait}
                    </span>
                  ))}
                </div>
                {ch.motivations?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Motivations:</span> {ch.motivations.join(", ")}
                  </div>
                )}
                {ch.potential_arcs?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-xs font-medium text-gray-600">Potential arcs:</span>
                    {ch.potential_arcs.map((arc: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-saga-500">-</span>
                        <span className="font-medium text-gray-600">{arc.name}</span>
                        <span className="text-gray-400">({arc.confidence}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{ch.mentions}x</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "world_builder" && data.setting) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Setting</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              data.setting.confidence >= 50 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            )}>
              {data.setting.label} ({Math.round(data.setting.confidence)}%)
            </span>
          </div>
          <p className="text-sm text-gray-600">{data.setting.description}</p>
          {data.setting.tech_level && (
            <p className="text-xs text-gray-400 mt-1">Tech level: <span className="font-medium text-gray-600 capitalize">{data.setting.tech_level.replace("_", " ")}</span></p>
          )}
        </div>

        {data.geography?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Geography</h5>
            <div className="flex flex-wrap gap-2">
              {data.geography.map((g: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.atmosphere?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Atmosphere</h5>
            <div className="flex flex-wrap gap-2">
              {data.atmosphere.map((a: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.magic && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Magic</h5>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  data.magic.power_level === "high" ? "bg-indigo-200 text-indigo-800" :
                  data.magic.power_level === "low" ? "bg-indigo-100 text-indigo-600" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {data.magic.power_level === "none" ? "No Magic" : `${data.magic.power_level} magic`}
                </span>
              </div>
              {data.magic.systems?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.magic.systems.map((s: any, i: number) => (
                    <span key={i} className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {data.factions?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Factions</h5>
            <div className="space-y-1.5">
              {data.factions.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-400">-</span>
                  <span className="font-medium text-gray-700">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.world_rules?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">World Rules</h5>
            <ul className="space-y-1">
              {data.world_rules.map((rule: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-saga-500 mt-0.5 shrink-0">-</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (agentName === "what_if_generator" && data.variations) {
    const impactColor = (impact: string) =>
      impact === "major" ? "border-red-300 bg-red-50" :
      impact === "moderate" ? "border-yellow-300 bg-yellow-50" :
      "border-blue-200 bg-blue-50";
    const impactBadge = (impact: string) =>
      impact === "major" ? "bg-red-100 text-red-700" :
      impact === "moderate" ? "bg-yellow-100 text-yellow-700" :
      "bg-blue-100 text-blue-600";
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          Original: <span className="font-medium text-gray-600 capitalize">{data.original_genre}</span>
          {data.original_protagonist && <> · Protagonist: <span className="font-medium text-gray-600">{data.original_protagonist}</span></>}
        </p>
        {data.variations.map((v: any) => (
          <div key={v.id} className={cn("rounded-lg border p-4", impactColor(v.impact))}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">?</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{v.question}</p>
                <p className="text-xs text-gray-600 mt-1">{v.description}</p>
                <span className={cn("inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium", impactBadge(v.impact))}>
                  {v.impact} impact
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
