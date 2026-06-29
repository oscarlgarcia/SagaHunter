"use client";

import { useEffect, useRef } from "react";
import { useEventStream } from "@/hooks/useEventStream";
import { useToast } from "@/components/ui/Toast";

const channelLabel: Record<string, string> = {
  "sagahunter:seeds:new": "New Seed",
  "sagahunter:enrichment:new": "Enrichment",
  "sagahunter:agent:run": "Agent Run",
};

export function SSEToasts() {
  const { events } = useEventStream();
  const { addToast } = useToast();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    const dedupKey = `${latest.channel}:${latest.timestamp}:${latest.message}`;
    if (seenRef.current.has(dedupKey)) return;
    seenRef.current.add(dedupKey);

    const label = channelLabel[latest.channel] || latest.channel;
    addToast(`${label}: ${latest.message}`, "info", 5000);
  }, [events, addToast]);

  return null;
}
