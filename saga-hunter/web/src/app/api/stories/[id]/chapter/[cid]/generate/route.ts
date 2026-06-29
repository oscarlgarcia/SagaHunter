import { exec } from "child_process";
import { promisify } from "util";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, err, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

const GenerateSchema = z.object({
  mode: z.enum(["synopsis", "scenes"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const { data, error } = await safeParse(req, GenerateSchema);
    if (error) return error;

    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const { stdout } = await execAsync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import refine_chapter; result = refine_chapter(${quote(params.id)}, ${quote(params.cid)}, ${quote(data.mode)}); print('OK' if result else 'FAIL')"`,
      { cwd: "/app/python", timeout: 120000, encoding: "utf-8" }
    );

    const trimmed = stdout.trim();
    if (trimmed !== "OK") {
      return err("AI generation returned no result (LLM may be unavailable)", 502);
    }

    const chapter = await prisma.storyChapter.findUnique({ where: { id: params.cid } });

    logger.info("Chapter content generated", { chapterId: params.cid, mode: data.mode });
    return ok({ chapter });
  } catch (e) {
    return handleError(e, "Failed to generate chapter content");
  }
}
