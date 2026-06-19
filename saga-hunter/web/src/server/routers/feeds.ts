import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

const feedSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  sourceType: z.enum(["news", "curiosity", "trend"]),
  language: z.string().length(2).default("en"),
  intervalMinutes: z.number().int().positive().default(360),
  enabled: z.boolean().default(true),
});

export const feedsRouter = t.router({
  list: publicProcedure.query(async () => {
    return prisma.feed.findMany({ orderBy: { name: "asc" } });
  }),

  create: publicProcedure.input(feedSchema).mutation(async ({ input }) => {
    return prisma.feed.create({ data: input });
  }),

  update: publicProcedure
    .input(z.object({ id: z.string() }).merge(feedSchema.partial()))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.feed.update({ where: { id }, data });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.feed.delete({ where: { id: input.id } });
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.feed.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
    }),
});
