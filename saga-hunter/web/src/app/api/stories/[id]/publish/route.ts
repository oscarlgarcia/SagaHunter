import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return notFound();

    const updated = await prisma.story.update({
      where: { id: params.id },
      data: { status: "published", publishedAt: new Date() },
    });

    logger.info("Story published", { storyId: params.id, title: updated.title });

    return ok(updated);
  } catch (error) {
    return handleError(error, "Failed to publish story");
  }
}
