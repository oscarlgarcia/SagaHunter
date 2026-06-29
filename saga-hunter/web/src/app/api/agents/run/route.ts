import { NextRequest } from "next/server";
import { ok, badRequest, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const agentName = req.nextUrl.searchParams.get("name");
  if (!agentName) return badRequest("Missing agent name");

  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("python3", [
      "/app/python/run_agent.py",
      agentName,
    ], { timeout: 120000 });
    logger.info("Agent run completed", { agentName });
    return ok({ output: stdout.trim() });
  } catch (error) {
    return handleError(error, "agent run");
  }
}
