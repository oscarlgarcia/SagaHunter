import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentName = searchParams.get("name");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

  const where: any = {};
  if (agentName) where.agentName = agentName;

  const logs = await prisma.agentRunLog.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
