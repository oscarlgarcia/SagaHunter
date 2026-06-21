"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Newspaper, BookOpen, Flame, Search, Layout, Tag, Shuffle, Globe, Users, PenTool, BookText, GitBranch, Bug, Radio, Sparkles, Send, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AgentConfig {
  agentName: string;
  enabled: boolean;
  mode: string;
  schedule: string | null;
  languages: string[];
  params: any;
  llmPrompt?: string | null;
}

interface AgentRunLog {
  id: string;
  agentName: string;
  status: string;
  seedsCreated: number;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
}

const AGENT_META: Record<string, { icon: React.ReactNode; description: string }> = {
  news_aggregator: { icon: <Newspaper className="w-6 h-6" />, description: "Fetches news articles from RSS feeds" },
  curiosity_engine: { icon: <BookOpen className="w-6 h-6" />, description: "Discovers historical events, mysteries, and oddities" },
  trend_hunter: { icon: <Flame className="w-6 h-6" />, description: "Finds trending stories and writing prompts" },
  angle_finder: { icon: <Search className="w-6 h-6" />, description: "Extracts narrative angles from seed text" },
  story_structurer: { icon: <Layout className="w-6 h-6" />, description: "Identifies story structure markers" },
  genre_classifier: { icon: <Tag className="w-6 h-6" />, description: "Classifies seed text into narrative genres" },
  what_if_generator: { icon: <Shuffle className="w-6 h-6" />, description: "Generates alternative narrative twists and speculative variations" },
  world_builder: { icon: <Globe className="w-6 h-6" />, description: "Builds world settings, geography, atmosphere, and lore from seeds" },
  character_harvester: { icon: <Users className="w-6 h-6" />, description: "Extracts character profiles, roles, traits, and motivations from seeds" },
  voice_tuner: { icon: <PenTool className="w-6 h-6" />, description: "Analyzes narrative voice, POV, register, pacing, and mood from seeds" },
  blurb_generator: { icon: <BookText className="w-6 h-6" />, description: "Generates multiple blurb variants from seeds and their enrichments" },
  series_connector: { icon: <GitBranch className="w-6 h-6" />, description: "Detects connections between seeds to form series and sagas" },
  plot_hole_detector: { icon: <Bug className="w-6 h-6" />, description: "Detects narrative inconsistencies and plot holes across enrichments" },
  story_critique: { icon: <BookText className="w-6 h-6" />, description: "Analyzes narrative coherence, pacing, and emotional arc via LLM" },
  auto_summary: { icon: <Sparkles className="w-6 h-6" />, description: "Generates a concise LLM summary when all enrichments complete" },
};

const PIPELINE_STAGES: { key: string; icon: React.ReactNode; agents: string[] }[] = [
  { key: "mining", icon: <Radio className="w-5 h-5" />, agents: ["news_aggregator", "curiosity_engine", "trend_hunter"] },
  { key: "analysis", icon: <Search className="w-5 h-5" />, agents: ["angle_finder", "story_structurer", "genre_classifier"] },
  { key: "creative", icon: <Sparkles className="w-5 h-5" />, agents: ["what_if_generator", "world_builder", "character_harvester", "voice_tuner"] },
  { key: "publishing", icon: <Send className="w-5 h-5" />, agents: ["blurb_generator", "series_connector", "plot_hole_detector", "story_critique", "auto_summary"] },
];

const STAGE_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  mining: { border: "border-l-blue-400", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  analysis: { border: "border-l-amber-400", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  creative: { border: "border-l-purple-400", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  publishing: { border: "border-l-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};

export default function AgentsPage() {
  const t = useTranslations("agents");
  const ts = useTranslations("agents.stages");
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, AgentRunLog[]>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<{ agentName: string; prompt: string; defaultPrompt: string; isCustom: boolean } | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptToast, setPromptToast] = useState<string | null>(null);
  const [timingModal, setTimingModal] = useState<{ agentName: string; intervalMinutes: number; timeoutSeconds: number } | null>(null);
  const [savingTiming, setSavingTiming] = useState(false);
  const [timingToast, setTimingToast] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const r = await fetch("/api/agents");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setAgents(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("load_error"));
    }
    setLoading(false);
  };

  const fetchLogs = async (agentName: string) => {
    try {
      const r = await fetch(`/api/agents/logs?name=${agentName}&limit=10`);
      if (r.ok) {
        const data = await r.json();
        setLogs((prev) => ({ ...prev, [agentName]: data }));
      }
    } catch {}
  };

  useEffect(() => { fetchAgents(); }, []);

  useEffect(() => {
    if (!promptToast) return;
    const t = setTimeout(() => setPromptToast(null), 4000);
    return () => clearTimeout(t);
  }, [promptToast]);

  useEffect(() => {
    if (!timingToast) return;
    const t = setTimeout(() => setTimingToast(null), 4000);
    return () => clearTimeout(t);
  }, [timingToast]);

  const openPromptModal = async (agentName: string) => {
    try {
      const r = await fetch(`/api/agents/${agentName}/prompt`);
      if (r.ok) {
        const data = await r.json();
        setPromptModal({
          agentName,
          prompt: data.prompt || "",
          defaultPrompt: data.defaultPrompt || "",
          isCustom: data.isCustom,
        });
      }
    } catch {}
  };

  const savePrompt = async () => {
    if (!promptModal) return;
    setSavingPrompt(true);
    try {
      const r = await fetch(`/api/agents/${promptModal.agentName}/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptModal.prompt }),
      });
      if (r.ok) {
        setPromptToast("Prompt saved");
        setPromptModal(null);
        fetchAgents();
      } else {
        setPromptToast("Failed to save prompt");
      }
    } catch {
      setPromptToast("Failed to save prompt");
    } finally {
      setSavingPrompt(false);
    }
  };

  const openTimingModal = (agent: AgentConfig) => {
    setTimingModal({
      agentName: agent.agentName,
      intervalMinutes: agent.params?.interval_minutes || 15,
      timeoutSeconds: agent.params?.timeout_seconds || 300,
    });
  };

  const saveTiming = async () => {
    if (!timingModal) return;
    setSavingTiming(true);
    try {
      const r = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: timingModal.agentName,
          intervalMinutes: timingModal.intervalMinutes,
          timeoutSeconds: timingModal.timeoutSeconds,
        }),
      });
      if (r.ok) {
        setTimingToast("Timing saved");
        setTimingModal(null);
        fetchAgents();
      } else {
        setTimingToast("Failed to save timing");
      }
    } catch {
      setTimingToast("Failed to save timing");
    } finally {
      setSavingTiming(false);
    }
  };

  const toggleExpanded = (agentName: string) => {
    if (expandedAgent === agentName) {
      setExpandedAgent(null);
    } else {
      setExpandedAgent(agentName);
      if (!logs[agentName]) fetchLogs(agentName);
    }
  };

  const toggleEnabled = async (agentName: string, current: boolean) => {
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName, enabled: !current }),
    });
    fetchAgents();
  };

  const toggleMode = async (agentName: string, current: string) => {
    const newMode = current === "auto" ? "manual" : "auto";
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName, mode: newMode }),
    });
    fetchAgents();
  };

  const runNow = async (agentName: string) => {
    await fetch(`/api/agents/run?name=${agentName}`, { method: "POST" });
  };

  const agentMap = new Map(agents.map((a) => [a.agentName, a]));

  const renderAgentCard = (agent: AgentConfig) => {
    const meta = AGENT_META[agent.agentName] || { icon: null, description: "" };
    const agentLogs = logs[agent.agentName];
    return (
      <div key={agent.agentName} className="bg-white rounded-xl border border-gray-200">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <span className="text-saga-600 mt-0.5">{meta.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {agent.agentName.replace(/_/g, " ")}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{meta.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={agent.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {agent.enabled ? t("enabled") : t("disabled")}
                  </Badge>
                  <Badge className={agent.mode === "auto" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}>
                    {agent.mode === "auto" ? t("auto") : t("manual")}
                  </Badge>
                  {agent.schedule && (
                    <span className="text-xs text-gray-400 font-mono">
                      {agent.schedule}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {agent.languages.join(", ").toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {agent.mode === "manual" && (
                <Button size="sm" onClick={() => runNow(agent.agentName)}>
                  {t("run_now")}
                </Button>
              )}
              <Button
                size="sm"
                variant={agent.mode === "auto" ? "secondary" : "primary"}
                onClick={() => toggleMode(agent.agentName, agent.mode)}
              >
                {agent.mode === "auto" ? t("manual") : t("auto")}
              </Button>
              <Button
                size="sm"
                variant={agent.enabled ? "ghost" : "primary"}
                onClick={() => toggleEnabled(agent.agentName, agent.enabled)}
              >
                {agent.enabled ? t("disabled") : t("enabled")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openPromptModal(agent.agentName)}
                title="Configure LLM prompt"
              >
                Prompt
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openTimingModal(agent)}
                title="Configure timing"
              >
                Timing
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleExpanded(agent.agentName)}
              >
                {expandedAgent === agent.agentName ? t("hide_logs") : t("logs")}
              </Button>
            </div>
          </div>
        </div>

        {expandedAgent === agent.agentName && (
          <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-xl">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("recent_runs")}</h4>
            {!agentLogs ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : agentLogs.length === 0 ? (
              <p className="text-sm text-gray-400">{t("no_runs")}</p>
            ) : (
              <div className="space-y-1.5">
                {agentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      log.status === "success" ? "bg-green-500" :
                      log.status === "running" ? "bg-blue-500" :
                      log.status === "crash" ? "bg-red-500" : "bg-yellow-500"
                    )} />
                    <span className="text-gray-500 text-xs font-mono">
                      {new Date(log.startedAt).toLocaleString()}
                    </span>
                    <span className={cn(
                      "text-xs font-medium capitalize",
                      log.status === "success" ? "text-green-700" :
                      log.status === "fail" ? "text-yellow-700" :
                      log.status === "crash" ? "text-red-700" : "text-blue-700"
                    )}>
                      {log.status}
                    </span>
                      {log.seedsCreated > 0 && (
                          <span className="text-xs text-saga-600">
                            {log.seedsCreated} {t("seeds")}
                          </span>
                        )}
                    {log.message && (
                      <span className="text-xs text-gray-400 truncate max-w-[300px]">
                        {log.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
          <button onClick={fetchAgents} className="mt-3 text-sm text-red-600 underline">{t("retry")}</button>
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
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-0">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageAgents = stage.agents.map((name) => agentMap.get(name)).filter(Boolean) as AgentConfig[];
            if (stageAgents.length === 0) return null;
            const colors = STAGE_COLORS[stage.key];
            return (
              <div key={stage.key}>
                {idx > 0 && (
                  <div className="flex justify-center py-2">
                    <ChevronRight className="w-5 h-5 text-gray-300 rotate-90" />
                  </div>
                )}
                <div className={cn("bg-white rounded-xl border border-gray-200 border-l-4", colors.border)}>
                  <div className={cn("px-5 py-3 rounded-t-xl flex items-center gap-3", colors.bg)}>
                    <span className={colors.text}>{stage.icon}</span>
                    <h2 className={cn("font-semibold", colors.text)}>{ts(stage.key)}</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {stageAgents.map(renderAgentCard)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !savingPrompt && setPromptModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">LLM Prompt — {promptModal.agentName}</h3>
              <button onClick={() => setPromptModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <textarea
              value={promptModal.prompt}
              onChange={(e) => setPromptModal({ ...promptModal, prompt: e.target.value })}
              className="w-full h-64 p-3 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent"
              placeholder={promptModal.defaultPrompt || "No default prompt available"}
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPromptModal({ ...promptModal, prompt: promptModal.defaultPrompt })}
                className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
              >
                Reset to default
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPromptModal(null)}
                  disabled={savingPrompt}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePrompt}
                  disabled={savingPrompt}
                  className="px-4 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingPrompt ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {timingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !savingTiming && setTimingModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Timing — {timingModal.agentName}</h3>
              <button onClick={() => setTimingModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={timingModal.intervalMinutes}
                  onChange={(e) => setTimingModal({ ...timingModal, intervalMinutes: parseInt(e.target.value) || 15 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">How often this agent runs in auto mode (1–1440 min)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  min={1}
                  max={3600}
                  value={timingModal.timeoutSeconds}
                  onChange={(e) => setTimingModal({ ...timingModal, timeoutSeconds: parseInt(e.target.value) || 300 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saga-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Max execution time per run (1–3600 s)</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setTimingModal(null)}
                disabled={savingTiming}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTiming}
                disabled={savingTiming}
                className="px-4 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingTiming ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-600 text-white">
          <span>✓</span>
          <span>{promptToast}</span>
          <button onClick={() => setPromptToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {timingToast && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-600 text-white">
          <span>✓</span>
          <span>{timingToast}</span>
          <button onClick={() => setTimingToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
