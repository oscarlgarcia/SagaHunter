"use client";

import { useEffect, useState } from "react";

export function PushNotifier() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      return reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscribed(true);
          return;
        }
        return Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            return reg.pushManager
              .subscribe({ userVisibleOnly: true, applicationServerKey: undefined })
              .then((newSub) => {
                setSubscribed(true);
                return fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newSub.toJSON()),
                });
              });
          }
        });
      });
    }).catch(() => {});
  }, []);

  return null;
}
