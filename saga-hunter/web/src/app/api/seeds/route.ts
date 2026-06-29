import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get("sourceType");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "date";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const where: any = {};
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { rawText: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: any =
      sortBy === "score"
        ? { narrativeScore: { sort: "desc", nulls: "last" } }
        : { discoveredAt: "desc" };

    const seeds = await prisma.seed.findMany({
      where,
      orderBy,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: { _count: { select: { enrichments: true } } },
    });

    const hasMore = seeds.length > limit;
    if (hasMore) seeds.pop();

    logger.info("Seeds listed", { count: seeds.length, sourceType, status });

    return ok({
      seeds,
      nextCursor: hasMore ? seeds[seeds.length - 1]?.id : null,
      hasMore,
    });
  } catch (error) {
    return handleError(error, "Failed to list seeds");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get("sourceType");
    const ids = searchParams.get("ids");

    const where: any = {};
    if (sourceType) where.sourceType = sourceType;
    if (ids) where.id = { in: ids.split(",") };

    const seeds = await prisma.seed.findMany({ where, select: { id: true } });
    const seedIds = seeds.map((s) => s.id);

    if (seedIds.length === 0) return ok({ deleted: 0 });

    await prisma.story.deleteMany({ where: { seedId: { in: seedIds } } });
    const result = await prisma.seed.deleteMany({ where: { id: { in: seedIds } } });

    logger.info("Seeds deleted", { count: result.count, sourceType });

    return ok({ deleted: result.count });
  } catch (error) {
    return handleError(error, "Failed to delete seeds");
  }
}
