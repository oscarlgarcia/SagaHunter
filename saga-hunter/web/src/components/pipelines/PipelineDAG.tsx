"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeProps,
  Connection,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";

const AGENT_ICONS: Record<string, string> = {
  news_aggregator: "📰",
  curiosity_engine: "📖",
  trend_hunter: "🔥",
  angle_finder: "🔍",
  story_structurer: "📐",
  genre_classifier: "🏷️",
  what_if_generator: "🔀",
  world_builder: "🌍",
  character_harvester: "👥",
  voice_tuner: "✍️",
  blurb_generator: "📝",
  series_connector: "🔗",
  plot_hole_detector: "🐛",
};

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  mining: { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700" },
  analysis: { bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-700" },
  creative: { bg: "bg-purple-50", border: "border-l-purple-500", text: "text-purple-700" },
  publishing: { bg: "bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-700" },
};

const STAGE_AGENTS: Record<string, string[]> = {
  mining: ["news_aggregator", "curiosity_engine", "trend_hunter"],
  analysis: ["angle_finder", "story_structurer", "genre_classifier"],
  creative: ["what_if_generator", "world_builder", "character_harvester", "voice_tuner"],
  publishing: ["blurb_generator", "series_connector", "plot_hole_detector"],
};

const STAGE_ORDER = ["mining", "analysis", "creative", "publishing"];

function getStage(agentName: string): string {
  for (const [stage, agents] of Object.entries(STAGE_AGENTS)) {
    if (agents.includes(agentName)) return stage;
  }
  return "mining";
}

function AgentNode({ data }: NodeProps) {
  const stage = getStage(data.agentName);
  const colors = STAGE_COLORS[stage];

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm min-w-[180px] border-l-4", colors.border)}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-400" />
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-lg", colors.bg)}>
        <span className="text-base">{data.icon}</span>
        <span className={cn("text-sm font-semibold capitalize truncate", colors.text)}>
          {data.agentName.replace(/_/g, " ")}
        </span>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", data.enabled ? "bg-green-400" : "bg-gray-300")} />
        <span className="text-xs text-gray-500">{data.enabled ? "Enabled" : "Disabled"}</span>
        {data.languages && (
          <span className="text-xs text-gray-400 ml-auto font-mono">
            {data.languages.join(", ").toUpperCase()}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

interface AgentLogEntry {
  id: string;
  status: string;
  message: string | null;
  startedAt: string;
}

interface PipelineDAGProps {
  agents: { agentName: string; enabled: boolean; languages: string[]; mode: string }[];
  connections: { id: string; triggerAgent: string; actionAgent: string; enabled: boolean }[];
  onAddConnection: (trigger: string, action: string) => void;
  onToggleConnection: (id: string, enabled: boolean) => void;
  onDeleteConnection: (id: string) => void;
  onRunAgent: (agentName: string) => void;
  onToggleAgent: (agentName: string, enabled: boolean) => void;
  onEditAgent: (agentName: string) => void;
  agentLogs: Record<string, AgentLogEntry[]>;
  connectMode: boolean;
  onConnectModeChange: (v: boolean) => void;
}

export function PipelineDAG({
  agents, connections, onAddConnection, onToggleConnection, onDeleteConnection,
  onRunAgent, onToggleAgent, onEditAgent, agentLogs,
  connectMode, onConnectModeChange,
}: PipelineDAGProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [popoverAgent, setPopoverAgent] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const agentMap = useMemo(() => new Map(agents.map((a) => [a.agentName, a])), [agents]);

  const COL_X: Record<string, number> = { mining: 30, analysis: 280, creative: 530, publishing: 780 };
  const NODE_Y: Record<number, number> = { 0: 40, 1: 180, 2: 320, 3: 460 };

  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    for (const stage of STAGE_ORDER) {
      const agentList = STAGE_AGENTS[stage];
      agentList.forEach((name, idx) => {
        const agent = agentMap.get(name);
        nodes.push({
          id: name,
          type: "agent",
          position: { x: COL_X[stage], y: NODE_Y[idx] },
          data: {
            agentName: name,
            icon: AGENT_ICONS[name] || "?",
            enabled: agent?.enabled ?? false,
            languages: agent?.languages ?? [],
          },
          style: selectedSource === name ? { filter: "brightness(1.05) drop-shadow(0 0 6px rgba(99,102,241,0.4))" } : undefined,
        });
      });
    }
    return nodes;
  }, [agents, selectedSource]);

  const initialEdges: Edge[] = useMemo(() => {
    return connections.map((c) => ({
      id: c.id,
      source: c.triggerAgent,
      target: c.actionAgent,
      animated: true,
      style: { stroke: c.enabled ? "#6366f1" : "#d1d5db", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: c.enabled ? "#6366f1" : "#d1d5db" },
      label: c.enabled ? "enabled" : "disabled",
      labelStyle: { fontSize: 10, fill: c.enabled ? "#6366f1" : "#d1d5db" },
    }));
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: any, node: Node) => {
    if (connectMode) {
      if (!selectedSource) {
        setSelectedSource(node.id);
      } else {
        if (selectedSource !== node.id) {
          onAddConnection(selectedSource, node.id);
        }
        setSelectedSource(null);
      }
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect?.();
      setPopoverPos({ x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 8 });
      setPopoverAgent(popoverAgent === node.id ? null : node.id);
    }
  }, [connectMode, selectedSource, onAddConnection, popoverAgent]);

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    onEditAgent(node.id);
  }, [onEditAgent]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const conn = connections.find((c) => c.id === edge.id);
    if (conn) {
      onToggleConnection(conn.id, !conn.enabled);
    }
  }, [connections, onToggleConnection]);

  const onEdgeDoubleClick = useCallback((_: any, edge: Edge) => {
    onDeleteConnection(edge.id);
  }, [onDeleteConnection]);

  const onConnect = useCallback((conn: Connection) => {
    if (conn.source && conn.target) {
      onAddConnection(conn.source, conn.target);
    }
  }, [onAddConnection]);

  const onPaneClick = useCallback(() => {
    setSelectedSource(null);
    setPopoverAgent(null);
  }, []);

  const proOptions = { hideAttribution: true };

  const currentAgent = popoverAgent ? agentMap.get(popoverAgent) : null;
  const currentLogs = popoverAgent ? (agentLogs[popoverAgent] || []).slice(0, 3) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200" style={{ height: 580 }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Mode:</span>
          <button
            onClick={() => { onConnectModeChange(!connectMode); setPopoverAgent(null); setSelectedSource(null); }}
            className={cn(
              "text-xs font-medium px-3 py-1 rounded-full transition-colors",
              connectMode
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {connectMode ? "Connect" : "Edit"}
          </button>
        </div>
        {connectMode && selectedSource && (
          <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Source: <strong>{selectedSource.replace(/_/g, " ")}</strong> — click target to connect
          </div>
        )}
        <div className="text-xs text-gray-400">
          {connectMode ? "Click source → click target" : "Click for actions, double-click to edit"}
        </div>
      </div>
      <div className="relative" style={{ height: "calc(100% - 41px)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          proOptions={proOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background gap={20} size={1} color="#f1f5f9" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeColor="#6366f1"
            nodeColor={(n) => (n.data?.enabled ? "#bbf7d0" : "#e5e7eb")}
            maskColor="rgba(0,0,0,0.1)"
            style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
        </ReactFlow>

        {popoverAgent && currentAgent && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPopoverAgent(null)} />
            <div
              className="fixed z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72"
              style={{ left: Math.min(popoverPos.x, window.innerWidth - 300), top: popoverPos.y }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 capitalize text-sm">
                  {popoverAgent.replace(/_/g, " ")}
                </h4>
                <button onClick={() => setPopoverAgent(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", currentAgent.enabled ? "bg-green-400" : "bg-gray-300")} />
                  <span className="text-xs text-gray-500">{currentAgent.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onRunAgent(popoverAgent); setPopoverAgent(null); }}
                    className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-saga-600 text-white hover:bg-saga-700 transition-colors"
                  >
                    Run Now
                  </button>
                  <button
                    onClick={() => { onToggleAgent(popoverAgent, !currentAgent.enabled); setPopoverAgent(null); }}
                    className={cn(
                      "flex-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                      currentAgent.enabled
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    )}
                  >
                    {currentAgent.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => { onEditAgent(popoverAgent); setPopoverAgent(null); }}
                    className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Settings
                  </button>
                </div>
                {currentLogs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Last runs</p>
                    {currentLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-gray-500 py-0.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          log.status === "success" ? "bg-green-500" :
                          log.status === "running" ? "bg-blue-500" :
                          log.status === "crash" ? "bg-red-500" : "bg-yellow-500"
                        )} />
                        <span className="font-mono">{new Date(log.startedAt).toLocaleTimeString()}</span>
                        <span className="capitalize">{log.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}