import { t } from "../trpc";
import { seedsRouter } from "./seeds";
import { agentsRouter } from "./agents";
import { feedsRouter } from "./feeds";
import { storiesRouter } from "./stories";
import { enrichmentsRouter } from "./enrichments";
import { statsRouter } from "./stats";
import { pipelinesRouter } from "./pipelines";

export const appRouter = t.router({
  seeds: seedsRouter,
  agents: agentsRouter,
  feeds: feedsRouter,
  stories: storiesRouter,
  enrichments: enrichmentsRouter,
  stats: statsRouter,
  pipelines: pipelinesRouter,
});

export type AppRouter = typeof appRouter;
