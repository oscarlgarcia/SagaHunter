"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Activity, Radio, Search, Sparkles, Send, Play, Trash2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventStream, SSEEvent } from "@/hooks/useEventStream";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface RunningAgent {
  agentName: string;
  description: string;
  startedAt: Date;
  progress?: string;
}

interface LiveEvent {
  id: string;
  agentName: string;
  status: "started" | "success" | "fail" | "crash";
  description?: string;
  seedsCreated?: number;
  timestamp: Date;
  duration?: number;
}

interface PipelineStats {
  started: number;
  success: number;
  fail: number;
  crash: number;
  total: number;
}

const AGENT_STAGE: Record<string, string> = {
  news_aggregator: "mining", curiosity_engine: "mining", trend_hunter: "mining",
  angle_finder: "analysis", story_structurer: "analysis", genre_classifier: "analysis",
  what_if_generator: "creative", world_builder: "creative", character_harvester: "creative", voice_tuner: "creative",
  blurb_generator: "publishing", series_connector: "publishing", plot_hole_detector: "publishing",
};

const STAGE_CONFIG: Record<string, { label: string; icon: React.ReactNode; border: string; bg: string; text: string; dot: string }> = {
  mining: { label: "stage_mining", icon: <Radio className="w-4 h-4" />, border: "border-l-blue-400", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  analysis: { label: "stage_analysis", icon: <Search className="w-4 h-4" />, border: "border-l-amber-400", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  creative: { label: "stage_creative", icon: <Sparkles className="w-4 h-4" />, border: "border-l-purple-400", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  publishing: { label: "stage_publishing", icon: <Send className="w-4 h-4" />, border: "border-l-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};

const STATUS_CONFIG = {
  started: { icon: "→", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" },
  success: { icon: "✓", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-400" },
  fail: { icon: "⚠", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  crash: { icon: "✗", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
};

let eventCounter = 0;

export default function MonitorPage() {
  const t = useTranslations();
  const { events, connected } = useEventStream();
  const [running, setRunning] = useState<Map<string, RunningAgent>>(new Map());
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState<PipelineStats>({ started: 0, success: 0, fail: 0, crash: 0, total: 0 });
  const [eventCount, setEventCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    events.forEach((evt) => {
      const channel = evt.channel;
      const msg = evt.message;
      const timestamp = new Date(evt.timestamp);

      if (channel === "sagahunter:agent:start") {
        const [name, ...descParts] = msg.split("|");
        const description = descParts.join("|");
        const agentName = name.trim();

        setRunning((prev) => {
          const next = new Map(prev);
          next.set(agentName, { agentName, description, startedAt: timestamp });
          return next;
        });

        const id = `evt-${++eventCounter}`;
        setFeed((prev) => [{ id, agentName, status: "started", description, timestamp }, ...prev].slice(0, 50));
        setStats((prev) => ({ ...prev, started: prev.started + 1, total: prev.total + 1 }));
        setEventCount((c) => c + 1);
      }

      if (channel === "sagahunter:agent:progress") {
        const [name, ...msgParts] = msg.split("|");
        const progressMsg = msgParts.join("|");
        const agentName = name.trim();
        setRunning((prev) => {
          const next = new Map(prev);
          const agent = next.get(agentName);
          if (agent) {
            next.set(agentName, { ...agent, progress: progressMsg });
          }
          return next;
        });
      }

      if (channel === "sagahunter:agent:run") {
        const parts = msg.split("|");
        const agentName = parts[0].trim();
        const status = parts[1] as "success" | "fail" | "crash";
        const seedsCreated = parseInt(parts[2] || "0");

        let duration: number | undefined;
        setRunning((prev) => {
          const next = new Map(prev);
          const agent = next.get(agentName);
          if (agent) {
            duration = Math.round((timestamp.getTime() - agent.startedAt.getTime()) / 1000);
            next.delete(agentName);
          }
          return next;
        });

        const id = `evt-${++eventCounter}`;
        setFeed((prev) => [{ id, agentName, status, seedsCreated, timestamp, duration }, ...prev].slice(0, 50));
        setStats((prev) => ({ ...prev, [status]: prev[status] + 1, total: prev.total + 1 }));
        setEventCount((c) => c + 1);
      }
    });
  }, [events]);

  const clearFeed = useCallback(() => {
    setFeed([]);
    setStats({ started: 0, success: 0, fail: 0, crash: 0, total: 0 });
    setEventCount(0);
  }, []);

  const formatElapsed = (startedAt: Date) => {
    const secs = Math.floor((now - startedAt.getTime()) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const getStage = (agentName: string) => AGENT_STAGE[agentName] || "mining";
  const getStageConfig = (agentName: string) => STAGE_CONFIG[getStage(agentName)];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("monitor.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("monitor.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("w-2.5 h-2.5 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            <span className={cn("font-medium", connected ? "text-green-600" : "text-red-500")}>
              {connected ? t("monitor.connected") : t("monitor.disconnected")}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-400">{eventCount} {t("monitor.events_count")}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={clearFeed}>
            <Trash2 className="w-4 h-4 mr-1" /> {t("monitor.clear")}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-saga-600" />
          <h2 className="font-semibold text-gray-900">{t("monitor.currently_running")}</h2>
          {running.size > 0 && (
            <Badge className="bg-saga-100 text-saga-700 ml-2">{running.size}</Badge>
          )}
        </div>
        {running.size === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            <Circle className="w-4 h-4 mr-2 text-gray-300" />
            {t("monitor.no_running")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from(running.values()).map((agent) => {
              const stage = getStageConfig(agent.agentName);
              return (
                <div
                  key={agent.agentName}
                  className={cn("flex items-start gap-3 p-3 rounded-lg border border-l-4", stage.border, stage.bg)}
                >
                  <span className="w-4 h-4 mt-0.5 rounded-full border-2 border-saga-500 border-t-transparent animate-spin shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {agent.agentName.replace(/_/g, " ")}
                      </span>
                      <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", stage.text, stage.bg)}>
                        {stage.icon}
                        <span className="ml-1">{t(stage.label)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{agent.description}</p>
                    {agent.progress && (
                      <p className="text-xs text-saga-600 mt-0.5 truncate font-medium">{agent.progress}</p>
                    )}
                    <span className="text-xs font-mono text-saga-600 mt-1 block">
                      {formatElapsed(agent.startedAt)} {t("monitor.elapsed")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t("monitor.live_feed")}</h2>
            {feed.length > 0 && (
              <span className="text-xs text-gray-400">{feed.length} events</span>
            )}
          </div>
          <div ref={feedRef} className="overflow-y-auto max-h-[500px]">
            {feed.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">{t("monitor.no_events")}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {feed.map((evt) => {
                  const stage = getStageConfig(evt.agentName);
                  const statusCfg = STATUS_CONFIG[evt.status];
                  return (
                    <div key={evt.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-sm">
                      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0", statusCfg.bg, statusCfg.text)}>
                        {statusCfg.icon}
                      </span>
                      <span className="text-xs text-gray-400 font-mono w-16 shrink-0">
                        {evt.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="capitalize text-gray-700 font-medium min-w-[120px]">
                        {evt.agentName.replace(/_/g, " ")}
                      </span>
                      <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", stage.text, stage.bg)}>
                        {stage.icon}
                        <span className="ml-1">{t(stage.label)}</span>
                      </span>
                      <span className={cn("text-xs font-medium capitalize", statusCfg.text)}>
                        {t(`monitor.${evt.status}`)}
                      </span>
                      {evt.seedsCreated !== undefined && evt.seedsCreated > 0 && (
                        <Badge className="bg-saga-100 text-saga-700">
                          +{evt.seedsCreated} {t("monitor.seeds")}
                        </Badge>
                      )}
                      {evt.duration !== undefined && (
                        <span className="text-xs text-gray-400 ml-auto shrink-0">
                          {evt.duration}{t("monitor.seconds")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{t("monitor.pipeline_stats")}</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
              <span className="text-sm text-gray-500 ml-2">{t("monitor.total_runs")}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["success", "fail", "crash", "started"] as const).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className={cn("rounded-lg p-3 text-center", cfg.bg)}>
                    <span className={cn("text-xl font-bold block", cfg.text)}>
                      {stats[s]}
                    </span>
                    <span className={cn("text-xs font-medium capitalize", cfg.text)}>
                      {t(`monitor.${s}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}