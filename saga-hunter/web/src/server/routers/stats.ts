import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const statsRouter = t.router({
  dashboard: publicProcedure.query(async () => {
    const [totalSeeds, totalEnrichments, seedsByStatus, totalFeeds, agentRunCount] = await Promise.all([
      safeQuery(() => prisma.seed.count(), 0),
      safeQuery(() => prisma.enrichment.count(), 0),
      safeQuery(() => prisma.seed.groupBy({ by: ["status"], _count: true }), [] as any[]),
      safeQuery(() => prisma.feed.count({ where: { enabled: true } }), 0),
      safeQuery(() => prisma.agentRunLog.count(), 0),
    ]);

    const seedsByStatusMap: Record<string, number> = {};
    for (const row of seedsByStatus) {
      seedsByStatusMap[row.status] = row._count;
    }

    return { totalSeeds, totalEnrichments, totalFeeds, agentRunCount, seedsByStatus: seedsByStatusMap };
  }),
});
