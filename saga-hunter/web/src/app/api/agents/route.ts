import { prisma } from "@/lib/prisma";
import { ok, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { z } from "zod";

const AgentUpdate = z.object({
  agentName: z.string().min(1),
  enabled: z.boolean().optional(),
  mode: z.enum(["auto", "manual"]).optional(),
  languages: z.array(z.string().length(2)).optional(),
  intervalMinutes: z.number().int().min(1).max(1440).optional(),
  timeoutSeconds: z.number().int().min(1).max(3600).optional(),
});

export async function GET() {
  try {
    const agents = await prisma.agentConfig.findMany({ orderBy: { agentName: "asc" } });
    logger.info("Fetched agent configs", { count: agents.length });
    return ok(agents);
  } catch (error) {
    return handleError(error, "agents.get");
  }
}

export async function PATCH(req: Request) {
  try {
    const { data: parsed, error: parseError } = await safeParse(req, AgentUpdate);
    if (parseError) return parseError;

    const { agentName, intervalMinutes, timeoutSeconds, ...data } = parsed;

    const paramsUpdate: Record<string, any> = {};
    if (intervalMinutes !== undefined) paramsUpdate.interval_minutes = intervalMinutes;
    if (timeoutSeconds !== undefined) paramsUpdate.timeout_seconds = timeoutSeconds;

    const existing = await prisma.agentConfig.findUnique({ where: { agentName } });

    const agent = await prisma.agentConfig.update({
      where: { agentName },
      data: {
        ...data,
        params: {
          ...((existing?.params as Record<string, any>) || {}),
          ...paramsUpdate,
        },
      },
    });
    logger.info("Updated agent config", { agentName, enabled: agent.enabled });
    return ok(agent);
  } catch (error) {
    return handleError(error, "agents.patch");
  }
}
