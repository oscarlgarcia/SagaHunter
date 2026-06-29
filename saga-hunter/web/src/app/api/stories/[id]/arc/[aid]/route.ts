import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const UpdateArcSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  chaptersInvolved: z.array(z.string()).nullable().optional(),
  charactersInvolved: z.array(z.string()).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  try {
    const arc = await prisma.storyArc.findFirst({
      where: { id: params.aid, storyId: params.id },
      include: { chapters: { select: { id: true, chapterNumber: true, title: true } } },
    });
    if (!arc) return notFound("Arc not found");
    return ok(arc);
  } catch (e) {
    return handleError(e, "Failed to fetch story arc");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  try {
    const { data, error } = await safeParse(req, UpdateArcSchema);
    if (error) return error;

    const existing = await prisma.storyArc.findFirst({ where: { id: params.aid, storyId: params.id } });
    if (!existing) return notFound("Arc not found");

    const arc = await prisma.storyArc.update({
      where: { id: params.aid },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.chaptersInvolved !== undefined && { chaptersInvolved: data.chaptersInvolved }),
        ...(data.charactersInvolved !== undefined && { charactersInvolved: data.charactersInvolved }),
      },
    });

    logger.info("Story arc updated", { arcId: params.aid });
    return ok(arc);
  } catch (e) {
    return handleError(e, "Failed to update story arc");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  try {
    const existing = await prisma.storyArc.findFirst({ where: { id: params.aid, storyId: params.id } });
    if (!existing) return notFound("Arc not found");

    await prisma.storyChapter.updateMany({ where: { arcId: params.aid }, data: { arcId: null } });
    await prisma.storyArc.delete({ where: { id: params.aid } });

    logger.info("Story arc deleted", { arcId: params.aid });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e, "Failed to delete story arc");
  }
}
