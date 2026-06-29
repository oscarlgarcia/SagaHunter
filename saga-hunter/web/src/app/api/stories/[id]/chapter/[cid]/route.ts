import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const UpdateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  synopsis: z.string().optional(),
  content: z.string().optional(),
  wordCountTarget: z.number().int().optional(),
  scenes: z.array(z.any()).optional(),
  status: z.enum(["outline", "drafted", "revised"]).optional(),
  arcId: z.string().uuid().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const chapter = await prisma.storyChapter.findFirst({
      where: { id: params.cid, storyId: params.id },
    });
    if (!chapter) return notFound();

    const story = await prisma.story.findUnique({
      where: { id: params.id },
      select: { title: true, chapters: { select: { id: true, chapterNumber: true, title: true }, orderBy: { chapterNumber: "asc" } } },
    });

    return ok({ chapter, story });
  } catch (e) {
    return handleError(e, "Failed to fetch chapter");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const { data, error } = await safeParse(req, UpdateChapterSchema);
    if (error) return error;

    const chapter = await prisma.storyChapter.findFirst({
      where: { id: params.cid, storyId: params.id },
    });
    if (!chapter) return notFound();

    const updated = await prisma.storyChapter.update({
      where: { id: params.cid },
      data,
    });

    logger.info("Chapter updated", { chapterId: params.cid, storyId: params.id });
    return ok(updated);
  } catch (e) {
    return handleError(e, "Failed to update chapter");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const chapter = await prisma.storyChapter.findFirst({
      where: { id: params.cid, storyId: params.id },
    });
    if (!chapter) return notFound();

    await prisma.storyChapter.delete({ where: { id: params.cid } });

    logger.info("Chapter deleted", { chapterId: params.cid, storyId: params.id });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e, "Failed to delete chapter");
  }
}
