"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  GitBranch, Plus, Play, Trash2, ChevronRight,
  Newspaper, BookOpen, Flame, Search, Layout, Tag,
  Shuffle, Globe, Users, PenTool, BookText, Bug,
  Radio, Sparkles, Send
} from "lucide-react";
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
}

interface PipelineConnection {
  id: string;
  name: string | null;
  triggerAgent: string;
  actionAgent: string;
  condition: any;
  enabled: boolean;
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

const ALL_AGENTS = [
  "news_aggregator", "curiosity_engine", "trend_hunter",
  "angle_finder", "story_structurer", "genre_classifier",
  "what_if_generator", "world_builder", "character_harvester", "voice_tuner",
  "blurb_generator", "series_connector", "plot_hole_detector",
];

const STAGES = [
  { key: "mining", icon: <Radio className="w-5 h-5" />, agents: ["news_aggregator", "curiosity_engine", "trend_hunter"], color: { border: "border-l-blue-400", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400", line: "stroke-blue-400" } },
  { key: "analysis", icon: <Search className="w-5 h-5" />, agents: ["angle_finder", "story_structurer", "genre_classifier"], color: { border: "border-l-amber-400", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", line: "stroke-amber-400" } },
  { key: "creative", icon: <Sparkles className="w-5 h-5" />, agents: ["what_if_generator", "world_builder", "character_harvester", "voice_tuner"], color: { border: "border-l-purple-400", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400", line: "stroke-purple-400" } },
  { key: "publishing", icon: <Send className="w-5 h-5" />, agents: ["blurb_generator", "series_connector", "plot_hole_detector"], color: { border: "border-l-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", line: "stroke-emerald-400" } },
];

export default function PipelinesPage() {
  const t = useTranslations();
  const [connections, setConnections] = useState<PipelineConnection[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [logs, setLogs] = useState<AgentRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState("news_aggregator");
  const [newTrigger, setNewTrigger] = useState("news_aggregator");
  const [newAction, setNewAction] = useState("angle_finder");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = async () => {
    const [connRes, agentRes, logsRes] = await Promise.all([
      fetch("/api/pipelines"),
      fetch("/api/agents"),
      fetch("/api/agents/logs?limit=50"),
    ]);
    if (connRes.ok) setConnections(await connRes.json());
    if (agentRes.ok) setAgents(await agentRes.json());
    if (logsRes.ok) setLogs(await logsRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const agentMap = new Map(agents.map((a) => [a.agentName, a]));

  const addConnection = async () => {
    await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerAgent: newTrigger, actionAgent: newAction, enabled: true }),
    });
    setShowAddForm(false);
    fetchData();
  };

  const toggleConnection = async (conn: PipelineConnection) => {
    await fetch(`/api/pipelines/${conn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !conn.enabled }),
    });
    fetchData();
  };

  const deleteConnection = async (id: string) => {
    await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    fetchData();
  };

  const runPipeline = async () => {
    setPipelineRunning(true);
    try {
      await fetch("/api/pipelines/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerAgent: selectedTrigger }),
      });
    } catch {}
    setPipelineRunning(false);
    fetchData();
  };

  const connectionsByTrigger = (trigger: string) =>
    connections.filter((c) => c.triggerAgent === trigger);

  const stageAgents = (names: string[]) =>
    names.map((name) => agentMap.get(name) || { agentName: name, enabled: false, mode: "manual", languages: [], schedule: null, params: {} });

  const pipelineLogs = logs.filter((l) => l.message?.startsWith("[pipeline]")).slice(0, 20);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("nav.pipelines")}</h1>
          </div>
        </div>
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.pipelines")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("pipelines.subtitle")}</p>
        </div>
        <GitBranch className="w-8 h-8 text-saga-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          {STAGES.map((stage, idx) => (
            <div key={stage.key} className="flex-1">
              <div className={cn("rounded-lg border border-l-4 p-4", stage.color.border)}>
                <div className={cn("flex items-center gap-2 mb-3", stage.color.bg, "-mx-4 -mt-4 px-4 py-2 rounded-t-lg border-b border-gray-100")}>
                  <span className={stage.color.text}>{stage.icon}</span>
                  <span className={cn("font-semibold text-sm", stage.color.text)}>{t(`agents.stages.${stage.key}`)}</span>
                </div>
                <div className="space-y-1.5">
                  {stageAgents(stage.agents).map((a) => (
                    <div key={a.agentName} className="flex items-center gap-2 text-sm">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", a.enabled ? "bg-green-400" : "bg-gray-300")} />
                      <span className={a.enabled ? "text-gray-700" : "text-gray-400"}>{a.agentName.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
          {STAGES.slice(0, -1).map((s) => (
            <span key={s.key} className={cn("h-0.5 w-8 rounded", s.color.dot)} />
          ))}
          <span className="text-gray-400">pipeline flow</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1.5" /> {t("pipelines.add_connection")}
        </Button>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-500">{t("pipelines.run_trigger")}</span>
          <select
            value={selectedTrigger}
            onChange={(e) => setSelectedTrigger(e.target.value)}
            className="text-sm border-0 bg-transparent focus:outline-none text-gray-700"
          >
            {ALL_AGENTS.map((name) => (
              <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Button size="sm" onClick={runPipeline} disabled={pipelineRunning}>
            <Play className="w-4 h-4 mr-1" />
            {pipelineRunning ? t("pipelines.running") : t("pipelines.run")}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">{t("pipelines.new_connection")}</h3>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t("pipelines.trigger_agent")}</label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                {ALL_AGENTS.map((name) => (
                  <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 mb-2" />
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t("pipelines.action_agent")}</label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                {ALL_AGENTS.map((name) => (
                  <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={addConnection}>{t("common.save")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t("pipelines.connections")} ({connections.length})</h2>
        </div>
        {connections.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">{t("pipelines.no_connections")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 font-medium">{t("pipelines.trigger_agent")}</th>
                  <th className="px-5 py-3 font-medium">{t("pipelines.action_agent")}</th>
                  <th className="px-5 py-3 font-medium">{t("pipelines.status")}</th>
                  <th className="px-5 py-3 font-medium text-right">{t("pipelines.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 capitalize text-gray-700">{conn.triggerAgent.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 capitalize text-gray-700">{conn.actionAgent.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleConnection(conn)}>
                        <Badge className={conn.enabled ? "bg-green-100 text-green-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-pointer"}>
                          {conn.enabled ? t("agents.enabled") : t("agents.disabled")}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => deleteConnection(conn.id)}>
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t("pipelines.recent_runs")}</h2>
        </div>
        {pipelineLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">{t("pipelines.no_runs")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 font-medium">{t("pipelines.agent")}</th>
                  <th className="px-5 py-3 font-medium">{t("pipelines.status_col")}</th>
                  <th className="px-5 py-3 font-medium">{t("pipelines.seeds")}</th>
                  <th className="px-5 py-3 font-medium">{t("pipelines.time")}</th>
                </tr>
              </thead>
              <tbody>
                {pipelineLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 capitalize text-gray-700">{log.agentName.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-xs font-medium",
                        log.status === "success" ? "text-green-600" :
                        log.status === "fail" ? "text-yellow-600" :
                        log.status === "crash" ? "text-red-600" : "text-blue-600"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{log.seedsCreated}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
