"use client";

import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Sparkles, Loader2, Edit3, RefreshCw, CheckCircle,
  BookText, MapPin, Users, Layout, FileText, Send, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

interface Chapter { id: string; chapterNumber: number; title: string; synopsis: string | null; status: string; wordCountTarget: number | null; }
interface Character { id: string; name: string; archetype: string | null; role: string | null; traits: any; backstory: string | null; arc: string | null; }
interface Location { id: string; name: string; type: string | null; description: string | null; significance: string | null; }
interface Arc { id: string; name: string; description: string | null; }

interface Story {
  id: string; title: string; type: string | null; synopsis: string | null;
  targetChapters: number | null; targetWordCount: number | null;
  narrativeStructure: string | null; pov: string | null; tense: string | null;
  register: string | null; pacing: string | null; mood: string | null;
  premise: string | null; status: string; createdAt: string;
  chapters: Chapter[]; characters: Character[]; locations: Location[]; arcs: Arc[];
  seed: { enrichments: Enrichment[] } | null;
}

const STEP_ORDER = ["story_type_classifier", "synopsis_generator", "chapter_outliner", "character_deepener", "location_builder"];
const STEP_LABELS: Record<string, string> = {
  story_type_classifier: "Type", synopsis_generator: "Synopsis",
  chapter_outliner: "Chapters", character_deepener: "Characters", location_builder: "World",
};
const STEP_ICONS: Record<string, any> = {
  story_type_classifier: BookText, synopsis_generator: FileText,
  chapter_outliner: Layout, character_deepener: Users, location_builder: MapPin,
};

const ANALYSIS_AGENTS = ["angle_finder", "story_structurer", "genre_classifier", "find_the_angle", "story_structure", "kindle_pre_check"];
const CREATIVE_AGENTS = ["what_if_generator", "what_if", "world_builder", "character_harvester", "voice_tuner", "world_builder"];
const PUBLISHING_AGENTS = ["blurb_generator", "series_connector", "plot_hole_detector", "story_critique", "auto_summary"];

function isStepDone(step: string, story: Story): boolean {
  switch (step) {
    case "story_type_classifier": return !!story.type;
    case "synopsis_generator": return !!story.synopsis;
    case "chapter_outliner": return story.chapters.length > 0;
    case "character_deepener": return story.characters.length > 0;
    case "location_builder": return story.locations.length > 0;
    default: return false;
  }
}

function isStepAccessible(step: string, story: Story): boolean {
  const idx = STEP_ORDER.indexOf(step);
  if (idx <= 0) return true;
  const prev = STEP_ORDER[idx - 1];
  return isStepDone(prev, story);
}

export default function StoryDetailPage() {
  const t = useTranslations("stories");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("history");
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [editingSynopsis, setEditingSynopsis] = useState(false);
  const [synopsisDraft, setSynopsisDraft] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/stories/${id}`);
      if (!r.ok) { setStory(null); return; }
      setStory(await r.json());
    } catch { setStory(null); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runStep = async (step: string) => {
    if (!isStepAccessible(step, story!)) return;
    setRunningStep(step);
    try {
      const r = await fetch(`/api/stories/${id}/step`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: t("step_order_error") }));
        console.error(err.error);
      }
      await load();
    } finally { setRunningStep(null); }
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      const r = await fetch(`/api/stories/${id}/run`, { method: "POST" });
      if (!r.ok) console.error("Run all failed");
      await load();
    } finally { setRunningAll(false); }
  };

  const saveSynopsis = async () => {
    await fetch(`/api/stories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ synopsis: synopsisDraft }),
    });
    setEditingSynopsis(false);
    await load();
  };

  const publishStory = async () => {
    setPublishing(true);
    try {
      await fetch(`/api/stories/${id}/publish`, { method: "POST" });
      await load();
    } finally { setPublishing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (!story) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-4">🔍</p>
      <p className="text-lg">{t("not_found")}</p>
    </div>
  );

  const doneCount = STEP_ORDER.filter(s => isStepDone(s, story)).length;
  const totalSteps = STEP_ORDER.length;
  const pct = Math.round((doneCount / totalSteps) * 100);
  const enrichments = (story.seed as any)?.enrichments || [];

  const tabs = [
    { key: "history", label: t("tab_history") },
    { key: "analysis", label: t("tab_analysis"), badge: enrichments.filter((e: Enrichment) => ANALYSIS_AGENTS.includes(e.agentName)).length },
    { key: "creative", label: t("tab_creative"), badge: enrichments.filter((e: Enrichment) => CREATIVE_AGENTS.includes(e.agentName)).length },
    { key: "publishing", label: t("tab_publishing"), badge: enrichments.filter((e: Enrichment) => PUBLISHING_AGENTS.includes(e.agentName)).length },
  ];

  const getEnrichmentsByCategory = (agents: string[]) =>
    enrichments.filter((e: Enrichment) => agents.includes(e.agentName));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/stories")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{story.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {story.type && <span className="capitalize">{story.type.replace(/_/g, " ")}</span>}
              {story.status && <span className="ml-2 capitalize">{t(story.status)}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "history" && (
            <>
              <Button size="sm" variant="ghost" onClick={runAll} disabled={runningAll}>
                {runningAll ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {t("run_all")}
              </Button>
              {story.status !== "published" && (
                <Button size="sm" onClick={publishStory} disabled={publishing}>
                  <Send className="w-4 h-4 mr-1" />
                  {t("published")}
                </Button>
              )}
            </>
          )}
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

      {activeTab === "history" && (
        <>
          <div className="flex items-center gap-2 mb-6 bg-white rounded-xl border border-gray-200 p-3">
            {STEP_ORDER.map((step, i) => {
              const done = isStepDone(step, story);
              const accessible = isStepAccessible(step, story);
              const Icon = STEP_ICONS[step];
              const prevStep = i > 0 ? STEP_LABELS[STEP_ORDER[i - 1]] : null;
              return (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => accessible && runStep(step)}
                    disabled={runningStep === step || !accessible}
                    title={!accessible && prevStep ? t("locked_step_tooltip", { step: prevStep }) : undefined}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      done ? "bg-green-50 text-green-700" : accessible ? "bg-gray-50 text-gray-500 hover:bg-gray-100" : "bg-gray-50 text-gray-300 cursor-not-allowed",
                      runningStep === step && "animate-pulse"
                    )}
                  >
                    {runningStep === step ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : done ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : !accessible ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <Icon className="w-3 h-3" />
                    {STEP_LABELS[step]}
                  </button>
                  {i < STEP_ORDER.length - 1 && <div className={cn("flex-1 h-px", done ? "bg-green-300" : "bg-gray-200")} />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">{t("synopsis")}</h2>
                  <div className="flex items-center gap-2">
                    {!editingSynopsis && (
                      <button onClick={() => { setSynopsisDraft(story.synopsis || ""); setEditingSynopsis(true); }}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> {t("edit")}
                      </button>
                    )}
                    {isStepAccessible("synopsis_generator", story) && (
                      <button onClick={() => runStep("synopsis_generator")} disabled={runningStep === "synopsis_generator"}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        {runningStep === "synopsis_generator" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {t("regenerate")}
                      </button>
                    )}
                  </div>
                </div>
                {editingSynopsis ? (
                  <div className="space-y-3">
                    <textarea value={synopsisDraft} onChange={(e) => setSynopsisDraft(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" rows={4} />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={saveSynopsis}>{t("confirm")}</Button>
                      <button onClick={() => setEditingSynopsis(false)} className="text-xs text-gray-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {story.synopsis || "—"}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">
                    <BookText className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Chapters ({story.chapters.length})
                  </h2>
                </div>
                {story.chapters.length === 0 ? (
                  <p className="text-sm text-gray-400">No chapters outlined yet.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {story.chapters.map((ch) => (
                      <div key={ch.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="text-xs font-mono text-gray-400 w-6">#{ch.chapterNumber}</span>
                        <span className="flex-1 font-medium text-gray-800">{ch.title}</span>
                        {ch.synopsis && <span className="text-xs text-gray-400 truncate max-w-[200px]">{ch.synopsis}</span>}
                        {ch.wordCountTarget && <span className="text-xs text-gray-400">{ch.wordCountTarget}w</span>}
                        <Badge className={cn(
                          ch.status === "drafted" ? "bg-green-100 text-green-700" :
                          ch.status === "revised" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        )}>{ch.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">
                    <MapPin className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Locations ({story.locations.length})
                  </h2>
                </div>
                {story.locations.length === 0 ? (
                  <p className="text-sm text-gray-400">No locations defined.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {story.locations.map((loc) => (
                      <div key={loc.id} className="py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{loc.name}</span>
                          {loc.type && <Badge className="bg-gray-100 text-gray-600">{loc.type}</Badge>}
                        </div>
                        {loc.significance && <p className="text-xs text-gray-400 mt-0.5">{loc.significance}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("progress")}</h3>
                <div className="flex items-center gap-1 mb-3">
                  {STEP_ORDER.map((step, i) => (
                    <div key={step} className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      isStepDone(step, story) ? "bg-saga-500" : "bg-gray-200"
                    )} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">{doneCount}/{totalSteps} steps &middot; {pct}%</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("structure_voice")}</h3>
                <dl className="space-y-2 text-sm">
                  {story.narrativeStructure && (
                    <div className="flex justify-between"><dt className="text-gray-500">Structure</dt><dd className="text-gray-800 capitalize">{story.narrativeStructure.replace(/_/g, " ")}</dd></div>
                  )}
                  {story.pov && <div className="flex justify-between"><dt className="text-gray-500">POV</dt><dd className="text-gray-800">{story.pov}</dd></div>}
                  {story.tense && <div className="flex justify-between"><dt className="text-gray-500">Tense</dt><dd className="text-gray-800 capitalize">{story.tense}</dd></div>}
                  {story.register && <div className="flex justify-between"><dt className="text-gray-500">Register</dt><dd className="text-gray-800 capitalize">{story.register}</dd></div>}
                  {story.pacing && <div className="flex justify-between"><dt className="text-gray-500">Pacing</dt><dd className="text-gray-800 capitalize">{story.pacing}</dd></div>}
                  {story.mood && <div className="flex justify-between"><dt className="text-gray-500">Mood</dt><dd className="text-gray-800 capitalize">{story.mood}</dd></div>}
                  {story.targetWordCount && <div className="flex justify-between"><dt className="text-gray-500">Target</dt><dd className="text-gray-800">{story.targetWordCount.toLocaleString()} words</dd></div>}
                </dl>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  <Users className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  Characters ({story.characters.length})
                </h3>
                {story.characters.length === 0 ? (
                  <p className="text-sm text-gray-400">No characters defined.</p>
                ) : (
                  <div className="space-y-3">
                    {story.characters.map((ch) => (
                      <div key={ch.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-saga-100 text-saga-700 flex items-center justify-center text-xs font-bold">
                            {ch.name.charAt(0)}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-gray-800">{ch.name}</span>
                            <div className="flex gap-1 mt-0.5">
                              {ch.role && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{ch.role}</Badge>}
                              {ch.archetype && <Badge className="bg-purple-100 text-purple-700 text-[10px]">{ch.archetype}</Badge>}
                            </div>
                          </div>
                        </div>
                        {ch.arc && <p className="text-xs text-gray-500 mt-1.5">{ch.arc}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "analysis" && (
        <Suspense fallback={<EnrichmentFallback />}>
          {!story.seed ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">{t("no_enrichments")}</p>
            </div>
          ) : (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(ANALYSIS_AGENTS)} />
          )}
        </Suspense>
      )}

      {activeTab === "creative" && (
        <Suspense fallback={<EnrichmentFallback />}>
          {!story.seed ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">{t("no_enrichments")}</p>
            </div>
          ) : (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(CREATIVE_AGENTS)} />
          )}
        </Suspense>
      )}

      {activeTab === "publishing" && (
        <Suspense fallback={<EnrichmentFallback />}>
          {!story.seed ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">{t("no_enrichments")}</p>
            </div>
          ) : (
            <EnrichmentSection enrichments={getEnrichmentsByCategory(PUBLISHING_AGENTS)} />
          )}
        </Suspense>
      )}
    </div>
  );
}
