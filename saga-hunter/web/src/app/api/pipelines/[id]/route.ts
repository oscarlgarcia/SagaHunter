import { prisma } from "@/lib/prisma";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { z } from "zod";

const UpdatePipelineSchema = z.object({
  name: z.string().optional(),
  triggerAgent: z.string().optional(),
  actionAgent: z.string().optional(),
  enabled: z.boolean().optional(),
  condition: z.any().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pipeline = await prisma.agentConnection.findUnique({ where: { id: params.id } });
    if (!pipeline) return notFound("Pipeline not found");
    logger.info("Fetched pipeline", { id: params.id });
    return ok(pipeline);
  } catch (error) {
    return handleError(error, "pipelines.id.get");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: parsed, error: parseError } = await safeParse(req, UpdatePipelineSchema);
    if (parseError) return parseError;

    const pipeline = await prisma.agentConnection.update({
      where: { id: params.id },
      data: parsed,
    });
    logger.info("Updated pipeline", { id: params.id });
    return ok(pipeline);
  } catch (error) {
    return handleError(error, "pipelines.id.patch");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.agentConnection.delete({ where: { id: params.id } });
    logger.info("Deleted pipeline", { id: params.id });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error, "pipelines.id.delete");
  }
}
