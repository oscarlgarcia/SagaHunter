import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateStorySchema = z.object({
  seedId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  premise: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const cursor = searchParams.get("cursor");

  const where: any = {};
  if (status) where.status = status;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const stories = await prisma.story.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      _count: { select: { chapters: true, characters: true, locations: true } },
      seed: { select: { sourceType: true, sourceName: true, narrativeScore: true } },
    },
  });

  const hasMore = stories.length > limit;
  if (hasMore) stories.pop();

  return NextResponse.json({
    stories,
    nextCursor: hasMore ? stories[stories.length - 1]?.id : null,
    hasMore,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateStorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { seedId, title, premise } = parsed.data;

  if (seedId) {
    const seed = await prisma.seed.findUnique({ where: { id: seedId } });
    if (!seed) return NextResponse.json({ error: "Seed not found" }, { status: 404 });

    const existing = await prisma.story.findUnique({ where: { seedId } });
    if (existing) {
      return NextResponse.json({ story: existing, message: "Story already exists" });
    }
  }

  try {
    const { execSync } = await import("child_process");
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    let code: string;
    if (seedId) {
      code = `from agents.story.orchestrator import create_story; create_story(seed_id=${quote(seedId)}, title=${quote(title)}, premise=${quote(premise || '')})`;
    } else {
      code = `from agents.story.orchestrator import create_story; create_story(title=${quote(title)}, premise=${quote(premise || '')})`;
    }

    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); ${code}"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
    );

    const lines = output.trim().split("\n");
    const storyId = lines[lines.length - 1]?.trim();

    if (!storyId) {
      return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        characters: true,
        locations: true,
        arcs: true,
        seed: true,
      },
    });

    return NextResponse.json({ story, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to develop story" }, { status: 500 });
  }
}
