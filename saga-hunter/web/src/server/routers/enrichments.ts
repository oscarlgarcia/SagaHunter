import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

export const enrichmentsRouter = t.router({
  bySeed: publicProcedure
    .input(z.object({ seedId: z.string() }))
    .query(async ({ input }) => {
      return prisma.enrichment.findMany({
        where: { seedId: input.seedId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
