import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalSeeds, totalEnrichments, seedsByStatus, totalFeeds, agentRunCount] = await Promise.all([
    prisma.seed.count(),
    prisma.enrichment.count(),
    prisma.seed.groupBy({ by: ["status"], _count: true }),
    prisma.feed.count({ where: { enabled: true } }),
    prisma.agentRunLog.count(),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of seedsByStatus) {
    statusCounts[row.status] = row._count;
  }

  return NextResponse.json({
    totalSeeds,
    totalEnrichments,
    totalFeeds,
    agentRunCount,
    seedsByStatus: statusCounts,
  });
}
