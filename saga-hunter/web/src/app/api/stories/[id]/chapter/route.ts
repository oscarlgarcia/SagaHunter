import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  const body = await req.json();
  const parsed = ChapterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const chapter = await prisma.storyChapter.create({
    data: { ...parsed.data, storyId: params.id },
  });
  return NextResponse.json(chapter);
}
