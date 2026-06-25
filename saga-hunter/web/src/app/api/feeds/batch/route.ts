import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FeedSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  sourceType: z.enum(["news", "curiosity", "trend"]),
  language: z.string().length(2),
  intervalMinutes: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional().nullable(),
  maxEntries: z.number().int().positive().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rawFeeds: unknown[] = Array.isArray(body?.feeds) ? body.feeds : [];

  if (rawFeeds.length === 0) {
    return NextResponse.json({ error: "No feeds provided" }, { status: 400 });
  }
  if (rawFeeds.length > 100) {
    return NextResponse.json({ error: "Maximum 100 feeds per request" }, { status: 400 });
  }

  const existing = await prisma.feed.findMany({ select: { url: true } });
  const existingUrls = new Set(existing.map((f) => f.url));

  const validationErrors: { index: number; feed: unknown; error: string }[] = [];
  const validFeeds: { index: number; feed: z.infer<typeof FeedSchema> }[] = [];

  for (let i = 0; i < rawFeeds.length; i++) {
    const result = FeedSchema.safeParse(rawFeeds[i]);
    if (!result.success) {
      validationErrors.push({
        index: i,
        feed: rawFeeds[i],
        error: result.error.flatten().formErrors[0] || Object.values(result.error.flatten().fieldErrors).flat()[0] || "Invalid feed",
      });
    } else {
      validFeeds.push({ index: i, feed: result.data });
    }
  }

  const created: { index: number; url: string }[] = [];
  const skipped: { index: number; url: string }[] = [];
  const dbErrors: { index: number; url: string; error: string }[] = [];

  for (const { index, feed } of validFeeds) {
    if (existingUrls.has(feed.url)) {
      skipped.push({ index, url: feed.url });
      continue;
    }
    try {
      await prisma.feed.create({ data: feed });
      created.push({ index, url: feed.url });
    } catch (e: any) {
      dbErrors.push({ index, url: feed.url, error: e.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    total: rawFeeds.length,
    created: created.length,
    skipped: skipped.length,
    createdUrls: created.map((c) => c.url),
    skippedUrls: skipped.map((s) => s.url),
    validationErrors: validationErrors.map((e) => ({ url: (e.feed as any)?.url ?? "", error: e.error })),
    errors: dbErrors.map((e) => ({ url: e.url, error: e.error })),
  });
}
