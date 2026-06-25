import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  synopsis: z.string().optional(),
  wordCountTarget: z.number().int().optional(),
  scenes: z.array(z.any()).optional(),
  status: z.enum(["outline", "drafted", "revised"]).optional(),
  arcId: z.string().uuid().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  const body = await req.json();
  const parsed = UpdateChapterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chapter = await prisma.storyChapter.findFirst({
    where: { id: params.cid, storyId: params.id },
  });
  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.storyChapter.update({
    where: { id: params.cid },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  const chapter = await prisma.storyChapter.findFirst({
    where: { id: params.cid, storyId: params.id },
  });
  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.storyChapter.delete({ where: { id: params.cid } });
  return NextResponse.json({ ok: true });
}
