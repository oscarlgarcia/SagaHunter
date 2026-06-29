import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const ChapterSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().min(1).max(500),
  synopsis: z.string().optional(),
  wordCountTarget: z.number().int().optional(),
  scenes: z.array(z.any()).optional(),
  status: z.enum(["outline", "drafted", "revised"]).optional(),
  arcId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await safeParse(req, ChapterSchema);
    if (error) return error;

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return notFound("Story not found");

    const chapter = await prisma.storyChapter.create({
      data: { ...data, storyId: params.id },
    });

    logger.info("Chapter created", { chapterId: chapter.id, storyId: params.id });
    return ok(chapter);
  } catch (e) {
    return handleError(e, "Failed to create chapter");
  }
}
