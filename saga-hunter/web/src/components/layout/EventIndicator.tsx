"use client";

import { useEventStream } from "@/hooks/useEventStream";
import { useState } from "react";

const channelLabel: Record<string, string> = {
  "sagahunter:seeds:new": "🌱 New Seed",
  "sagahunter:enrichment:new": "⚡ Enrichment",
  "sagahunter:agent:run": "🤖 Agent Run",
};

export function EventIndicator() {
  const { events, connected, clearEvents } = useEventStream();
  const [open, setOpen] = useState(false);
  const latest = events[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
        style={{
          borderColor: connected ? "#86efac" : "#fca5a5",
          backgroundColor: connected ? "rgba(134,239,172,0.1)" : "rgba(252,165,165,0.1)",
        }}
      >
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{
            backgroundColor: connected ? "#16a34a" : "#dc2626",
            boxShadow: connected ? "0 0 4px #16a34a" : "0 0 4px #dc2626",
          }}
        />
        {connected ? "Live" : "Offline"}
        {events.length > 0 && (
          <span className="ml-1 text-gray-400">({events.length})</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-700">Live Events</span>
            <button onClick={clearEvents} className="text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
            {events.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">No events yet</div>
            )}
            {events.map((ev, i) => (
              <div key={i} className="px-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">
                    {channelLabel[ev.channel] || ev.channel}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
