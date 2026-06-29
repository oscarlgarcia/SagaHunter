import { z } from "zod";
import { publicProcedure, getPrisma } from "../trpc";
import { t } from "../trpc";

const prisma = getPrisma();

export const storiesRouter = t.router({
  list: publicProcedure
    .input(
      z.object({
        status: z.string().optional(),
        sortBy: z.enum(["date", "title"]).default("date"),
      }).optional(),
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input?.status) where.status = input.status;
      return prisma.story.findMany({
        where,
        orderBy: input?.sortBy === "title" ? { title: "asc" } : { createdAt: "desc" },
        include: { seed: true, _count: { select: { chapters: true } } },
      });
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.story.findUnique({
        where: { id: input.id },
        include: {
          seed: true,
          chapters: { orderBy: { chapterNumber: "asc" } },
          characters: true,
          locations: true,
          arcs: { include: { chapters: true } },
        },
      });
    }),

  createArc: publicProcedure
    .input(z.object({
      storyId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      chaptersInvolved: z.array(z.string()).optional(),
      charactersInvolved: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      return prisma.storyArc.create({
        data: {
          storyId: input.storyId,
          name: input.name,
          description: input.description || null,
          chaptersInvolved: input.chaptersInvolved || null,
          charactersInvolved: input.charactersInvolved || null,
        },
      });
    }),

  updateArc: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().nullable().optional(),
      chaptersInvolved: z.array(z.string()).nullable().optional(),
      charactersInvolved: z.array(z.string()).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.storyArc.update({ where: { id }, data });
    }),

  deleteArc: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.storyChapter.updateMany({ where: { arcId: input.id }, data: { arcId: null } });
      return prisma.storyArc.delete({ where: { id: input.id } });
    }),
});
