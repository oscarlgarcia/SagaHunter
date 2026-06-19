import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AgentUpdate = z.object({
  agentName: z.string().min(1),
  enabled: z.boolean().optional(),
  mode: z.enum(["auto", "manual"]).optional(),
  languages: z.array(z.string().length(2)).optional(),
});

export async function GET() {
  const agents = await prisma.agentConfig.findMany({ orderBy: { agentName: "asc" } });
  return NextResponse.json(agents);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = AgentUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { agentName, ...data } = parsed.data;
  const agent = await prisma.agentConfig.update({ where: { agentName }, data });
  return NextResponse.json(agent);
}
