import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreatePipeline = z.object({
  name: z.string().optional(),
  triggerAgent: z.string().min(1),
  actionAgent: z.string().min(1),
  condition: z.any().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const pipelines = await prisma.agentConnection.findMany({
    orderBy: [{ triggerAgent: "asc" }, { actionAgent: "asc" }],
  });
  return NextResponse.json(pipelines);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePipeline.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const pipeline = await prisma.agentConnection.create({ data: parsed.data });
  return NextResponse.json(pipeline, { status: 201 });
}
