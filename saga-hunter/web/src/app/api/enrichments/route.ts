import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, badRequest, handleError } from "@/lib/api-utils";

const SeedIdSchema = z.string().uuid();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seedIdParam = searchParams.get("seedId");
    const parsed = SeedIdSchema.safeParse(seedIdParam);
    if (!parsed.success) return badRequest("seedId query parameter is required and must be a valid UUID");

    const enrichments = await prisma.enrichment.findMany({
      where: { seedId: parsed.data },
      orderBy: { createdAt: "desc" },
    });

    return ok(enrichments);
  } catch (error) {
    return handleError(error, "Failed to list enrichments");
  }
}
