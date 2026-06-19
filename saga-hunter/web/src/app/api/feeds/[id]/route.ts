import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FeedUpdate = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  sourceType: z.enum(["news", "curiosity", "trend"]).optional(),
  language: z.string().length(2).optional(),
  intervalMinutes: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = FeedUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const feed = await prisma.feed.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(feed);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.feed.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
