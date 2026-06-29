import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

export const seedsRouter = t.router({
  list: publicProcedure
    .input(
      z.object({
        sourceType: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["score", "date"]).default("date"),
        limit: z.number().int().positive().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.sourceType) where.sourceType = input.sourceType;
      if (input.status) where.status = input.status;
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { rawText: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const orderBy: any =
        input.sortBy === "score"
          ? { narrativeScore: { sort: "desc", nulls: "last" } }
          : { discoveredAt: "desc" };

      const seeds = await prisma.seed.findMany({
        where,
        orderBy,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      const hasMore = seeds.length > input.limit;
      if (hasMore) seeds.pop();

      return {
        seeds,
        nextCursor: hasMore ? seeds[seeds.length - 1].id : null,
        hasMore,
      };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.seed.findUnique({
        where: { id: input.id },
        include: { enrichments: true, story: true },
      });
    }),

  updateStatus: publicProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.seed.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  deleteMany: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await prisma.enrichment.deleteMany({ where: { seedId: { in: input.ids } } });
      await prisma.seed.deleteMany({ where: { id: { in: input.ids } } });
      return { deleted: input.ids.length };
    }),
});
