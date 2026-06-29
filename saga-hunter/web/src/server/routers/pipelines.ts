import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

export const pipelinesRouter = t.router({
  list: publicProcedure.query(async () => {
    return prisma.agentConnection.findMany({ orderBy: { triggerAgent: "asc" } });
  }),
});
