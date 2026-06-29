import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const result = await prisma.feed.updateMany({
      where: { enabled: true },
      data: { lastFetchedAt: null },
    });
    logger.info("Feeds reprocessed", { count: result.count });
    return ok({ reprocessed: result.count });
  } catch (error) {
    return handleError(error, "Failed to reprocess feeds");
  }
}
