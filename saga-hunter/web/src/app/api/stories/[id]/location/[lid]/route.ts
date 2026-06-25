import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  significance: z.string().nullable().optional(),
  chaptersFeatured: z.array(z.number()).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; lid: string } }
) {
  const body = await req.json();
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const location = await prisma.storyLocation.findFirst({
    where: { id: params.lid, storyId: params.id },
  });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) data[key] = value;
  }

  const updated = await prisma.storyLocation.update({
    where: { id: params.lid },
    data: data as any,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; lid: string } }
) {
  const location = await prisma.storyLocation.findFirst({
    where: { id: params.lid, storyId: params.id },
  });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.storyLocation.delete({ where: { id: params.lid } });
  return NextResponse.json({ ok: true });
}
