import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const FeedInput = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  sourceType: z.enum(["news", "curiosity", "trend"]),
  language: z.string().length(2),
  intervalMinutes: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional().nullable(),
  maxEntries: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  try {
    const feeds = await prisma.feed.findMany({ orderBy: { name: "asc" } });
    logger.info("Fetched all feeds", { count: feeds.length });
    return ok(feeds);
  } catch (error) {
    return handleError(error, "Failed to fetch feeds");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await safeParse(req, FeedInput);
    if (error) return error;
    const feed = await prisma.feed.create({ data });
    logger.info("Feed created", { id: feed.id, name: feed.name });
    return ok(feed, 201);
  } catch (error) {
    return handleError(error, "Failed to create feed");
  }
}
