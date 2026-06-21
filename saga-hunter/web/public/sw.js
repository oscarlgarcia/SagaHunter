self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "SagaHunter";
    const options = {
      body: data.body || "",
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      data: data.url ? { url: data.url } : undefined,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(self.registration.showNotification("SagaHunter", { body: text }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
