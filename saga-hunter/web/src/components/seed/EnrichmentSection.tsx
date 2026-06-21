"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import EnrichmentContent, { type Enrichment, type ViewMode } from "./EnrichmentContent";

export default function EnrichmentSection({ enrichments: initial }: { enrichments: Enrichment[] }) {
  const t = useTranslations("seed");
  const tc = useTranslations("common");
  const [viewMode, setViewMode] = useState<ViewMode>("hybrid");
  const [localEnrichments, setLocalEnrichments] = useState(initial);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isAnyGenerating, setIsAnyGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setLocalEnrichments(initial); }, [initial]);

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
      setError(err.message || t("llm_error"));
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
    let completed = 0;

    const processOne = async (enr: Enrichment) => {
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
        completed++;
        setBulkProgress({ current: completed, total: toGenerate.length });
      }
    };

    const concurrency = 3;
    for (let i = 0; i < toGenerate.length; i += concurrency) {
      const chunk = toGenerate.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map(processOne));
    }

    setBulkProgress(null);
    setIsAnyGenerating(false);
    if (errors.length > 0) {
      setError(t("bulk_generation_result", { success: toGenerate.length - errors.length, total: toGenerate.length, errors: errors.join("; ") }));
    } else {
      setError(t("bulk_generation_done") || `All ${toGenerate.length} enrichments generated`);
    }
  }, [localEnrichments]);

  if (localEnrichments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-400">{t("no_analysis")}</p>
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
                ? <>{t("generating_progress", { current: bulkProgress.current, total: bulkProgress.total })}</>
                : <>{t("generate_all", { count: toGenerateCount })}</>}
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
            {t("heuristic")}
          </button>
          <button
            onClick={() => setViewMode("hybrid")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              viewMode === "hybrid" ? "bg-white shadow-sm text-gray-900 ring-1 ring-saga-300" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Hybrid
          </button>
          <button
            onClick={() => setViewMode("ai")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              viewMode === "ai" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t("ai")}
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
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t(`agents.${enr.agentName}`)}
                </h4>
                {viewMode === "hybrid" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-medium">Hybrid</span>
                )}
                {viewMode === "ai" && hasLlm && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 font-medium">{t("ai")}</span>
                )}
                {viewMode === "heuristic" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{t("heuristic")}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {viewMode === "hybrid" && hasLlm
                  ? `H: ${new Date(enr.createdAt).toLocaleDateString()} · AI: ${new Date(enr.llmGeneratedAt!).toLocaleDateString()}`
                  : viewMode === "ai" && hasLlm
                    ? new Date(enr.llmGeneratedAt!).toLocaleDateString()
                    : new Date(enr.createdAt).toLocaleDateString()}
              </span>
            </div>

            {viewMode === "heuristic" && <EnrichmentContent agentName={enr.agentName} data={enr.data} />}

            {viewMode === "hybrid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="text-[10px] uppercase font-semibold text-gray-400 mb-2 tracking-wider">Heuristic</div>
                  <EnrichmentContent agentName={enr.agentName} data={enr.data} />
                </div>
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20">
                  <div className="text-[10px] uppercase font-semibold text-purple-500 mb-2 tracking-wider">AI</div>
                  {hasLlm ? (
                    <EnrichmentContent agentName={enr.agentName} data={enr.llmData} />
                  ) : (
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
                          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t("generating_with_time", { elapsed })}</>
                        ) : (
                          <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M3 12h18" /></svg>{t("generate_with_ai")}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    {t("regenerate_with_ai")}
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
                      {t("generating_with_time", { elapsed })}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v18" /><path d="M3 12h18" />
                      </svg>
                      {t("generate_with_ai")}
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
