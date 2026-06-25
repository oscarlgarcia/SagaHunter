import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LocationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().optional(),
  description: z.string().optional(),
  significance: z.string().optional(),
  chaptersFeatured: z.array(z.number()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = LocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const location = await prisma.storyLocation.create({
    data: { ...parsed.data, storyId: params.id },
  });
  return NextResponse.json(location);
}
