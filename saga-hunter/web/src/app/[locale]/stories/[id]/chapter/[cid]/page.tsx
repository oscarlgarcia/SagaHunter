"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Cloud, CloudOff } from "lucide-react";
import ChapterSettings from "@/components/chapter/ChapterSettings";
import { useToast } from "@/components/ui/Toast";

const WYSIWYGEditor = lazy(() => import("@/components/chapter/WYSIWYGEditor"));
const SceneList = lazy(() => import("@/components/chapter/SceneList"));
import type { Scene } from "@/components/chapter/SceneList";

interface ChapterData {
  id: string;
  chapterNumber: number;
  title: string;
  synopsis: string | null;
  content: string | null;
  wordCountTarget: number | null;
  scenes: Scene[];
  status: string;
}

interface ChapterPageData {
  chapter: ChapterData;
  story: {
    title: string;
    chapters: { id: string; chapterNumber: number; title: string }[];
  };
}

export default function ChapterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const cid = params.cid as string;
  const router = useRouter();

  const { addToast } = useToast();
  const [data, setData] = useState<ChapterPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("outline");
  const [wordCountTarget, setWordCountTarget] = useState<number | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const autoSave = useCallback(async () => {
    setAutoSaveStatus("saving");
    try {
      const r = await fetch(`/api/stories/${id}/chapter/${cid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, synopsis, content, status, wordCountTarget, scenes }),
      });
      setAutoSaveStatus(r.ok ? "saved" : "error");
    } catch { setAutoSaveStatus("error"); }
  }, [id, cid, title, synopsis, content, status, wordCountTarget, scenes]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAutoSaveStatus("idle");
    debounceRef.current = setTimeout(autoSave, 3000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [autoSave, title, synopsis, content, status, wordCountTarget, scenes]);

  const load = useCallback(async () => {
    if (!id || !cid) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/stories/${id}/chapter/${cid}`);
      if (!r.ok) { setData(null); return; }
      const d: ChapterPageData = await r.json();
      setData(d);
      setTitle(d.chapter.title);
      setSynopsis(d.chapter.synopsis || "");
      setContent(d.chapter.content || "");
      setStatus(d.chapter.status);
      setWordCountTarget(d.chapter.wordCountTarget);
      setScenes(Array.isArray(d.chapter.scenes) ? d.chapter.scenes : []);
      loadedRef.current = true;
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [id, cid]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/stories/${id}/chapter/${cid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, synopsis, content, status, wordCountTarget, scenes }),
      });
      if (r.ok) addToast("Saved");
      else addToast("Failed to save", "error");
    } catch { addToast("Failed to save", "error"); }
    finally { setSaving(false); }
  };

  const generate = async (mode: "synopsis" | "scenes") => {
    setGenerating(mode);
    try {
      const r = await fetch(`/api/stories/${id}/chapter/${cid}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (r.ok) {
        const result = await r.json();
        if (mode === "synopsis" && result.chapter?.synopsis) {
          setSynopsis(result.chapter.synopsis);
        }
        if (mode === "scenes" && Array.isArray(result.chapter?.scenes)) {
          setScenes(result.chapter.scenes);
        }
        addToast(`AI ${mode} generated`);
      } else {
        const err = await r.json().catch(() => ({ error: "Generation failed" }));
        addToast(err.error || "Generation failed", "error");
      }
    } catch { addToast("Generation failed", "error"); }
    finally { setGenerating(null); }
  };

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-9 bg-gray-200 rounded w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-96 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-4">🔍</p>
      <p className="text-lg">Chapter not found</p>
    </div>
  );

  const { chapter, story: storyMeta } = data;
  if (!storyMeta) return <div className="text-center py-16 text-gray-400"><p className="text-lg">Story not found</p></div>;
  const chIdx = storyMeta.chapters.findIndex((c) => c.id === cid);
  const prevCh = chIdx > 0 ? storyMeta.chapters[chIdx - 1] : null;
  const nextCh = chIdx < storyMeta.chapters.length - 1 ? storyMeta.chapters[chIdx + 1] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/stories/${id}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </h1>
            <p className="text-xs text-gray-500">
              <Link href={`/stories/${id}`} className="hover:text-saga-600 transition-colors">{storyMeta.title}</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {autoSaveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-500"><Cloud className="w-3 h-3" /> Saved</span>
          )}
          {autoSaveStatus === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-500"><CloudOff className="w-3 h-3" /> Save failed</span>
          )}
          {prevCh && (
            <Link href={`/stories/${id}/chapter/${prevCh.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-3 h-3" /> {prevCh.title.length > 20 ? `Ch ${prevCh.chapterNumber}` : prevCh.title}
            </Link>
          )}
          {nextCh && (
            <Link href={`/stories/${id}/chapter/${nextCh.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              {nextCh.title.length > 20 ? `Ch ${nextCh.chapterNumber}` : nextCh.title} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Editor</h2>
          <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
            <WYSIWYGEditor content={content} onChange={setContent} placeholder="Write your chapter here..." />
          </Suspense>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Settings</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ChapterSettings
              title={title} synopsis={synopsis} status={status} wordCountTarget={wordCountTarget}
              onTitleChange={setTitle} onSynopsisChange={setSynopsis}
              onStatusChange={setStatus} onWordCountChange={setWordCountTarget}
              onGenerateSynopsis={() => generate("synopsis")}
              onSave={save} saving={saving} generating={generating === "synopsis"}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scenes</h3>
            <Suspense fallback={<div className="h-40 bg-gray-100 rounded-xl animate-pulse" />}>
              <SceneList
                scenes={scenes} onChange={setScenes}
                onGenerate={() => generate("scenes")}
                generating={generating === "scenes"}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
