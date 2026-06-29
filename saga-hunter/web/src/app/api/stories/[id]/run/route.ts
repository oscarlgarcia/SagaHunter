import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const { stdout } = await execAsync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import run_full_pipeline; run_full_pipeline(${quote(params.id)})"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
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

    logger.info("Story pipeline run completed", { storyId: params.id });
    return ok({ story, output: stdout.trim() });
  } catch (error) {
    return handleError(error, "story pipeline run");
  }
}
