import { t } from "../trpc";
import { seedsRouter } from "./seeds";
import { agentsRouter } from "./agents";
import { feedsRouter } from "./feeds";

export const appRouter = t.router({
  seeds: seedsRouter,
  agents: agentsRouter,
  feeds: feedsRouter,
});

export type AppRouter = typeof appRouter;
