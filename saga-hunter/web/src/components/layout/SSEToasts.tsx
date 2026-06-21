"use client";

import { useEffect, useRef, useState } from "react";
import { useEventStream } from "@/hooks/useEventStream";

interface Toast {
  id: number;
  channel: string;
  message: string;
  timestamp: string;
  dismissing: boolean;
}

const channelLabel: Record<string, string> = {
  "sagahunter:seeds:new": "New Seed",
  "sagahunter:enrichment:new": "Enrichment",
  "sagahunter:agent:run": "Agent Run",
};

const channelColor: Record<string, string> = {
  "sagahunter:seeds:new": "bg-emerald-600",
  "sagahunter:enrichment:new": "bg-blue-600",
  "sagahunter:agent:run": "bg-purple-600",
};

export function SSEToasts() {
  const { events } = useEventStream();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    const dedupKey = `${latest.channel}:${latest.timestamp}:${latest.message}`;
    if (seenRef.current.has(dedupKey)) return;
    seenRef.current.add(dedupKey);

    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...latest, id, dismissing: false }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 5000);
  }, [events]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white
            ${channelColor[toast.channel] || "bg-gray-700"}
            transition-all duration-300
            ${toast.dismissing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
          `}
        >
          <span className="text-xs opacity-80">{channelLabel[toast.channel] || toast.channel}</span>
          <span className="text-white/90">{toast.message}</span>
          <button
            onClick={() => {
              setToasts((prev) =>
                prev.map((t) => (t.id === toast.id ? { ...t, dismissing: true } : t))
              );
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }, 300);
            }}
            className="ml-1 opacity-70 hover:opacity-100 text-sm"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
