import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentName = searchParams.get("name");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    const where: Record<string, unknown> = {};
    if (agentName) where.agentName = agentName;

    const logs = await prisma.agentRunLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    logger.info("Fetched agent run logs", { agentName: agentName || "all", count: logs.length, limit });
    return ok(logs);
  } catch (error) {
    return handleError(error, "agents.logs.get");
  }
}
