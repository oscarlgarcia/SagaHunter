import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, err, badRequest, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const CreateStorySchema = z.object({
  seedId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  premise: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
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

    return ok({
      stories,
      nextCursor: hasMore ? stories[stories.length - 1]?.id : null,
      hasMore,
    });
  } catch (error) {
    return handleError(error, "Failed to list stories");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data, error: parseError } = await safeParse(req, CreateStorySchema);
    if (parseError) return parseError;

    const { seedId, title, premise } = data;

    if (seedId) {
      const seed = await prisma.seed.findUnique({ where: { id: seedId } });
      if (!seed) return notFound("Seed not found");

      const existing = await prisma.story.findUnique({ where: { seedId } });
      if (existing) {
        return ok({ story: existing, message: "Story already exists" });
      }
    }

    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    let code: string;
    if (seedId) {
      code = `from agents.story.orchestrator import create_story; create_story(seed_id=${quote(seedId)}, title=${quote(title)}, premise=${quote(premise || '')})`;
    } else {
      code = `from agents.story.orchestrator import create_story; create_story(title=${quote(title)}, premise=${quote(premise || '')})`;
    }

    const { stdout } = await execAsync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); ${code}"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
    );

    const lines = stdout.trim().split("\n");
    const storyId = lines[lines.length - 1]?.trim();

    if (!storyId) return err("Failed to create story");

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

    logger.info("Story created", { storyId, title, seedId });

    return ok({ story, output: stdout.trim() });
  } catch (error) {
    const message = error instanceof Error
      ? (error as any).stderr || error.message
      : "Failed to develop story";
    return err(message);
  }
}
