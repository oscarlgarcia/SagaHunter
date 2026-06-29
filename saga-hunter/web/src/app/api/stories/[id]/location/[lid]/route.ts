import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  significance: z.string().nullable().optional(),
  chaptersFeatured: z.array(z.number()).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; lid: string } }
) {
  try {
    const { data, error } = await safeParse(req, UpdateLocationSchema);
    if (error) return error;

    const location = await prisma.storyLocation.findFirst({
      where: { id: params.lid, storyId: params.id },
    });
    if (!location) return notFound();

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await prisma.storyLocation.update({
      where: { id: params.lid },
      data: updateData as any,
    });

    logger.info("Location updated", { locationId: params.lid, storyId: params.id });
    return ok(updated);
  } catch (e) {
    return handleError(e, "Failed to update location");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; lid: string } }
) {
  try {
    const location = await prisma.storyLocation.findFirst({
      where: { id: params.lid, storyId: params.id },
    });
    if (!location) return notFound();

    await prisma.storyLocation.delete({ where: { id: params.lid } });

    logger.info("Location deleted", { locationId: params.lid, storyId: params.id });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e, "Failed to delete location");
  }
}
