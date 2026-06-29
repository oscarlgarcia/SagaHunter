import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const CreateArcSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  chaptersInvolved: z.array(z.string()).optional(),
  charactersInvolved: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await safeParse(req, CreateArcSchema);
    if (error) return error;

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return badRequest("Story not found");

    const arc = await prisma.storyArc.create({
      data: {
        storyId: params.id,
        name: data.name,
        description: data.description || null,
        chaptersInvolved: data.chaptersInvolved || null,
        charactersInvolved: data.charactersInvolved || null,
      },
    });

    logger.info("Story arc created", { storyId: params.id, arcId: arc.id });
    return ok(arc, 201);
  } catch (e) {
    return handleError(e, "Failed to create story arc");
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const arcs = await prisma.storyArc.findMany({
      where: { storyId: params.id },
      include: { chapters: { select: { id: true, chapterNumber: true, title: true } } },
      orderBy: { name: "asc" },
    });
    return ok(arcs);
  } catch (e) {
    return handleError(e, "Failed to fetch story arcs");
  }
}
