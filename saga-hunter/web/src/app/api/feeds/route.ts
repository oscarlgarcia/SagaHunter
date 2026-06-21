import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  const feeds = await prisma.feed.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(feeds);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = FeedInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const feed = await prisma.feed.create({ data: parsed.data });
  return NextResponse.json(feed, { status: 201 });
}
