"use client";

import { useEffect, useRef, useState } from "react";

export interface SSEEvent {
  channel: string;
  message: string;
  timestamp: string;
}

export function useEventStream() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") {
          setConnected(true);
          return;
        }
        setEvents((prev) => [data as SSEEvent, ...prev].slice(0, 100));
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  const clearEvents = () => setEvents([]);

  return { events, connected, clearEvents };
}
