import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const SendSchema = z.object({
  title: z.string().min(1).max(200).default("SagaHunter"),
  body: z.string().min(1).max(500),
  url: z.string().optional(),
  icon: z.string().optional(),
  targetEndpoint: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await safeParse(req, SendSchema);
    if (error) return error;

    const webpush = await import("web-push");
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:sagahunter@app.local";

    if (!vapidPublic || !vapidPrivate) {
      return badRequest("VAPID keys not configured");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const subscriptions = data.targetEndpoint
      ? await prisma.pushSubscription.findMany({ where: { endpoint: data.targetEndpoint } })
      : await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return ok({ sent: 0, total: 0, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url || "/",
      icon: data.icon || "/favicon.ico",
    });

    let sent = 0;
    const results: { endpoint: string; status: string }[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh || "", auth: sub.auth || "" },
          } as any,
          payload,
        );
        sent++;
        results.push({ endpoint: sub.endpoint.slice(-20), status: "sent" });
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          logger.warn("Removed expired push subscription", { endpoint: sub.endpoint.slice(-20) });
          results.push({ endpoint: sub.endpoint.slice(-20), status: "removed" });
        } else {
          logger.error("Failed to send push notification", { endpoint: sub.endpoint.slice(-20), error: err.message });
          results.push({ endpoint: sub.endpoint.slice(-20), status: "error" });
        }
      }
    }

    logger.info("Push notifications sent", { sent, total: subscriptions.length });
    return ok({ sent, total: subscriptions.length, results });
  } catch (e) {
    return handleError(e, "Failed to send push notifications");
  }
}
