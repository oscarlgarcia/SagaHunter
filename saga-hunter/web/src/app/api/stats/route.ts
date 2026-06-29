import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

let statsCache: { data: object | null; expiresAt: number } = { data: null, expiresAt: 0 };

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (statsCache.data && statsCache.expiresAt > now) {
      return ok(statsCache.data);
    }

    const [totalSeeds, totalEnrichments, seedsByStatus, totalFeeds, agentRunCount] = await Promise.all([
      safeQuery(() => prisma.seed.count(), 0),
      safeQuery(() => prisma.enrichment.count(), 0),
      safeQuery(() => prisma.seed.groupBy({ by: ["status"], _count: true }), []),
      safeQuery(() => prisma.feed.count({ where: { enabled: true } }), 0),
      safeQuery(() => prisma.agentRunLog.count(), 0),
    ]);

    const statusCounts: Record<string, number> = {};
    if (Array.isArray(seedsByStatus)) {
      for (const row of seedsByStatus) {
        statusCounts[row.status] = row._count;
      }
    }

    const body = {
      totalSeeds,
      totalEnrichments,
      totalFeeds,
      agentRunCount,
      seedsByStatus: statusCounts,
    };

    statsCache = { data: body, expiresAt: now + 30_000 };

    logger.info("Stats computed", body);
    return ok(body);
  } catch (e) {
    return handleError(e, "Failed to fetch stats");
  }
}
