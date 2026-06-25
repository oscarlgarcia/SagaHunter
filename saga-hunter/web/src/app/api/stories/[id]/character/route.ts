import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CharacterSchema = z.object({
  name: z.string().min(1).max(200),
  archetype: z.string().optional(),
  role: z.string().optional(),
  traits: z.array(z.string()).optional(),
  backstory: z.string().optional(),
  arc: z.string().optional(),
  relationships: z.array(z.any()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = CharacterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const character = await prisma.storyCharacter.create({
    data: { ...parsed.data, storyId: params.id },
  });
  return NextResponse.json(character);
}
