import { prisma } from "@/lib/prisma";
import { ok, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreatePipeline = z.object({
  name: z.string().optional(),
  triggerAgent: z.string().min(1),
  actionAgent: z.string().min(1),
  condition: z.any().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const pipelines = await prisma.agentConnection.findMany({
      orderBy: [{ triggerAgent: "asc" }, { actionAgent: "asc" }],
    });
    logger.info("Fetched pipelines", { count: pipelines.length });
    return ok(pipelines);
  } catch (error) {
    return handleError(error, "pipelines.get");
  }
}

export async function POST(req: Request) {
  try {
    const { data: parsed, error: parseError } = await safeParse(req, CreatePipeline);
    if (parseError) return parseError;

    const pipeline = await prisma.agentConnection.create({ data: parsed });
    logger.info("Created pipeline", { id: pipeline.id, triggerAgent: parsed.triggerAgent, actionAgent: parsed.actionAgent });
    return ok(pipeline, 201);
  } catch (error) {
    return handleError(error, "pipelines.post");
  }
}
