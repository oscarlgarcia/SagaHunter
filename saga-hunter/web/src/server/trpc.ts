import { initTRPC } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");

export const t = initTRPC.create();
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

export function getPrisma() {
  return prisma;
}

export function getRedis() {
  return redis;
}
