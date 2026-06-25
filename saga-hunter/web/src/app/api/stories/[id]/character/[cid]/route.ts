import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  archetype: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  traits: z.array(z.string()).nullable().optional(),
  backstory: z.string().nullable().optional(),
  arc: z.string().nullable().optional(),
  relationships: z.array(z.any()).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  const body = await req.json();
  const parsed = UpdateCharacterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const character = await prisma.storyCharacter.findFirst({
    where: { id: params.cid, storyId: params.id },
  });
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) data[key] = value;
  }

  const updated = await prisma.storyCharacter.update({
    where: { id: params.cid },
    data: data as any,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  const character = await prisma.storyCharacter.findFirst({
    where: { id: params.cid, storyId: params.id },
  });
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.storyCharacter.delete({ where: { id: params.cid } });
  return NextResponse.json({ ok: true });
}
