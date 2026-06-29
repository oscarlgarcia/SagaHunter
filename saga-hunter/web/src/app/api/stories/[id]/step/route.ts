import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, notFound, handleError, safeParse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const STEP_ORDER = [
  "story_type_classifier",
  "synopsis_generator",
  "chapter_outliner",
  "character_deepener",
  "location_builder",
] as const;

const StepSchema = z.object({
  step: z.enum(STEP_ORDER),
});

const STEP_CHECKS: Record<string, (story: any) => boolean> = {
  story_type_classifier: () => true,
  synopsis_generator: (s) => !!s.type,
  chapter_outliner: (s) => !!s.synopsis,
  character_deepener: (s) => (s._count?.chapters ?? 0) > 0,
  location_builder: (s) => (s._count?.characters ?? 0) > 0,
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await safeParse(req, StepSchema);
  if (error) return error;

  const { prisma } = await import("@/lib/prisma");

  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: { _count: { select: { chapters: true, characters: true, locations: true } } },
  });
  if (!story) {
    return notFound("Story not found");
  }

  const check = STEP_CHECKS[data.step];
  if (check && !check(story)) {
    const stepIdx = STEP_ORDER.indexOf(data.step);
    const missing = stepIdx > 0 ? STEP_ORDER[stepIdx - 1] : null;
    return badRequest(`Previous step not completed: ${missing}`);
  }

  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const { stdout } = await execAsync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import run_story_step; run_story_step(${quote(params.id)}, ${quote(data.step)})"`,
      { cwd: "/app/python", timeout: 120000, encoding: "utf-8" }
    );

    const updated = await prisma.story.findUnique({
      where: { id: params.id },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        characters: true,
        locations: true,
        arcs: true,
      },
    });

    logger.info("Story step completed", { storyId: params.id, step: data.step });
    return ok({ story: updated, output: stdout.trim() });
  } catch (error) {
    return handleError(error, "story step");
  }
}
