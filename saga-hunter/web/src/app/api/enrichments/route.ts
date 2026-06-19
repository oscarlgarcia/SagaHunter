import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seedId = searchParams.get("seedId");

  if (!seedId) {
    return NextResponse.json({ error: "seedId query parameter is required" }, { status: 400 });
  }

  const enrichments = await prisma.enrichment.findMany({
    where: { seedId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(enrichments);
}
