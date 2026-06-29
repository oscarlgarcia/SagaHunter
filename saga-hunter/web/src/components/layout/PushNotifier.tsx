"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function PushNotifier() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }
    setSupported(true);

    (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key");
        const body = await res.json();
        setVapidKey(body.publicKey || null);
      } catch {}
    })();

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey || !supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setLoading(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [vapidKey, supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || !vapidKey}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg border transition-all hover:shadow-xl disabled:opacity-50"
      style={{
        backgroundColor: subscribed ? "#EBF5FB" : "#FFF5F5",
        borderColor: subscribed ? "#85C1E9" : "#F5A0A0",
        color: subscribed ? "#1A5276" : "#922B21",
      }}
      title={
        loading ? "..." :
        !vapidKey ? "Push not configured" :
        subscribed ? "Notifications enabled — click to disable" :
        "Enable push notifications"
      }
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">
        {loading ? "..." : subscribed ? "Notifications ON" : "Notify me"}
      </span>
    </button>
  );
}
