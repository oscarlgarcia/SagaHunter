import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
  character_deepener: (s) => s.chapters?.length > 0,
  location_builder: (s) => s.characters?.length > 0,
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const parsed = StepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: { _count: { select: { chapters: true, characters: true, locations: true } } },
  });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const check = STEP_CHECKS[parsed.data.step];
  if (check && !check(story)) {
    const stepIdx = STEP_ORDER.indexOf(parsed.data.step);
    const missing = stepIdx > 0 ? STEP_ORDER[stepIdx - 1] : null;
    return NextResponse.json(
      { error: `Previous step not completed: ${missing}` },
      { status: 400 }
    );
  }

  try {
    const { execSync } = await import("child_process");
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import run_story_step; run_story_step(${quote(params.id)}, ${quote(parsed.data.step)})"`,
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

    return NextResponse.json({ story: updated, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to run step" }, { status: 500 });
  }
}
