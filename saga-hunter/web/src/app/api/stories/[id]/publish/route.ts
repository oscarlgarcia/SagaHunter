import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.story.update({
    where: { id: params.id },
    data: { status: "published", publishedAt: new Date() },
  });

  return NextResponse.json(updated);
}
