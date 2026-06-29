import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleError, safeParse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const RunPipelineSchema = z.object({
  triggerAgent: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { data, error } = await safeParse(req, RunPipelineSchema);
  if (error) return error;

  const { triggerAgent } = data;

  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from app.orchestrator import run_pipeline; run_pipeline('${triggerAgent.replace(/'/g, "'\\''")}')"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
    );
    logger.info("Pipeline run completed", { triggerAgent });
    return ok({ output: stdout.trim() });
  } catch (error) {
    return handleError(error, "pipeline run");
  }
}
