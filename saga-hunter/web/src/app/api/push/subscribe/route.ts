import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }).optional(),
  expirationTime: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await safeParse(req, SubscriptionSchema);
    if (error) return error;

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: data.endpoint } });
    if (!existing) {
      await prisma.pushSubscription.create({
        data: {
          endpoint: data.endpoint,
          p256dh: data.keys?.p256dh || null,
          auth: data.keys?.auth || null,
          expirationTime: data.expirationTime ?? null,
        },
      });
    }

    const total = await prisma.pushSubscription.count();
    logger.info("Push subscription registered", { endpoint: data.endpoint.slice(-20), total });
    return ok({ ok: true, total });
  } catch (e) {
    return handleError(e, "Failed to register push subscription");
  }
}

export async function GET() {
  try {
    const total = await prisma.pushSubscription.count();
    logger.info("Push subscription count requested", { total });
    return ok({ total });
  } catch (e) {
    return handleError(e, "Failed to get subscription count");
  }
}
