import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const StepSchema = z.object({
  step: z.enum([
    "story_type_classifier", "synopsis_generator", "chapter_outliner",
    "character_deepener", "location_builder",
  ]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const parsed = StepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { execSync } = await import("child_process");
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import run_story_step; run_story_step(${quote(params.id)}, ${quote(parsed.data.step)})"`,
      { cwd: "/app/python", timeout: 120000, encoding: "utf-8" }
    );

    const { prisma } = await import("@/lib/prisma");
    const story = await prisma.story.findUnique({
      where: { id: params.id },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        characters: true,
        locations: true,
        arcs: true,
      },
    });

    return NextResponse.json({ story, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to run step" }, { status: 500 });
  }
}
