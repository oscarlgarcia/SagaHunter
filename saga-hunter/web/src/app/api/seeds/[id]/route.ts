import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SeedUpdate = z.object({
  status: z.enum(["discovered", "analyzing", "analyzed", "developing", "published"]).optional(),
  title: z.string().min(1).max(500).optional(),
  narrativeScore: z.number().int().min(0).max(100).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const seed = await prisma.seed.findUnique({
    where: { id: params.id },
    include: { enrichments: true, story: true },
  });
  if (!seed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(seed);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = SeedUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const seed = await prisma.seed.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(seed);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const seed = await prisma.seed.findUnique({ where: { id: params.id } });
  if (!seed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.story.deleteMany({ where: { seedId: params.id } });
  await prisma.seed.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
