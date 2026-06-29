import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, badRequest, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const SeedUpdate = z.object({
  status: z.enum(["discovered", "analyzing", "analyzed", "developing", "published"]).optional(),
  title: z.string().min(1).max(500).optional(),
  narrativeScore: z.number().int().min(0).max(100).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seed = await prisma.seed.findUnique({
      where: { id: params.id },
      include: { enrichments: true, story: true },
    });
    if (!seed) return notFound("Seed not found");
    logger.info("Fetched seed", { id: seed.id, title: seed.title });
    return ok(seed);
  } catch (error) {
    return handleError(error, "Failed to fetch seed");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await safeParse(req, SeedUpdate);
    if (error) return error;
    const seed = await prisma.seed.update({
      where: { id: params.id },
      data,
    });
    logger.info("Seed updated", { id: seed.id });
    return ok(seed);
  } catch (error) {
    return handleError(error, "Failed to update seed");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seed = await prisma.seed.findUnique({ where: { id: params.id } });
    if (!seed) return notFound("Seed not found");

    await prisma.story.deleteMany({ where: { seedId: params.id } });
    await prisma.seed.delete({ where: { id: params.id } });
    logger.info("Seed deleted", { id: params.id, title: seed.title });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error, "Failed to delete seed");
  }
}
