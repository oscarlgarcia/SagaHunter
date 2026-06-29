import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, badRequest, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const FeedUpdate = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  sourceType: z.enum(["news", "curiosity", "trend"]).optional(),
  language: z.string().length(2).optional(),
  intervalMinutes: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional().nullable(),
  maxEntries: z.number().int().positive().optional().nullable(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await safeParse(req, FeedUpdate);
    if (error) return error;
    const feed = await prisma.feed.update({ where: { id: params.id }, data });
    logger.info("Feed updated", { id: feed.id });
    return ok(feed);
  } catch (error) {
    return handleError(error, "Failed to update feed");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feed = await prisma.feed.findUnique({ where: { id: params.id } });
    if (!feed) return notFound("Feed not found");
    await prisma.feed.delete({ where: { id: params.id } });
    logger.info("Feed deleted", { id: params.id });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error, "Failed to delete feed");
  }
}
