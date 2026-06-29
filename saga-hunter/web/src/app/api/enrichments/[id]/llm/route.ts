import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const enrichmentId = params.id;

  const enrichment = await prisma.enrichment.findUnique({
    where: { id: enrichmentId },
    include: { seed: true },
  });
  if (!enrichment) {
    return notFound("Enrichment not found");
  }

  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("python3", [
      "/app/python/run_llm_enrich.py",
      enrichmentId,
    ], { timeout: 600000 });
    logger.info("LLM enrichment completed", { enrichmentId });
  } catch (error) {
    return handleError(error, "LLM enrichment");
  }

  const updated = await prisma.enrichment.findUnique({
    where: { id: enrichmentId },
  });

  return ok(updated);
}
