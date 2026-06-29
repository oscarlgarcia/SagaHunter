import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

export const agentsRouter = t.router({
  list: publicProcedure.query(async () => {
    return prisma.agentConfig.findMany({ orderBy: { agentName: "asc" } });
  }),

  update: publicProcedure
    .input(
      z.object({
        agentName: z.string(),
        enabled: z.boolean().optional(),
        mode: z.enum(["auto", "manual"]).optional(),
        schedule: z.string().optional(),
        languages: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.agentConfig.update({
        where: { agentName: input.agentName },
        data: {
          ...(input.enabled !== undefined && { enabled: input.enabled }),
          ...(input.mode !== undefined && { mode: input.mode }),
          ...(input.schedule !== undefined && { schedule: input.schedule }),
          ...(input.languages !== undefined && { languages: input.languages }),
        },
      });
    }),

  run: publicProcedure
    .input(z.object({ agentName: z.string() }))
    .mutation(async ({ input }) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(
        `${baseUrl}/api/agents/run?name=${input.agentName}`,
        { method: "POST" }
      );
      return response.json();
    }),
});
