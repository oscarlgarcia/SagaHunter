import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const UnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await safeParse(req, UnsubscribeSchema);
    if (error) return error;

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: data.endpoint } });
    if (!existing) {
      return ok({ ok: true, message: "Subscription not found, nothing to remove" });
    }

    await prisma.pushSubscription.delete({ where: { id: existing.id } });
    logger.info("Push subscription removed", { endpoint: data.endpoint.slice(-20) });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e, "Failed to unsubscribe");
  }
}
