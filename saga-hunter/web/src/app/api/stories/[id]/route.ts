import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateStorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  type: z.string().optional(),
  synopsis: z.string().optional(),
  targetChapters: z.number().int().optional(),
  targetWordCount: z.number().int().optional(),
  narrativeStructure: z.string().optional(),
  pov: z.string().optional(),
  tense: z.string().optional(),
  register: z.string().optional(),
  pacing: z.string().optional(),
  mood: z.string().optional(),
  premise: z.string().optional(),
  status: z.enum(["outline", "drafting", "revising", "completed", "published"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: {
      chapters: { orderBy: { chapterNumber: "asc" } },
      characters: true,
      locations: true,
      arcs: true,
      seed: { include: { enrichments: true } },
    },
  });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = UpdateStorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const story = await prisma.story.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(story);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.story.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
