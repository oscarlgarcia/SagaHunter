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

      return prisma.seed.findMany({
        where,
        orderBy,
        take: 50,
      });
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
});
