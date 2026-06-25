import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const result = await prisma.feed.updateMany({
    where: { enabled: true },
    data: { lastFetchedAt: null },
  });
  return NextResponse.json({ reprocessed: result.count });
}
