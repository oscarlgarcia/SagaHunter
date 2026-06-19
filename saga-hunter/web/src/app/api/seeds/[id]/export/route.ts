import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const seed = await prisma.seed.findUnique({
    where: { id: params.id },
    include: { enrichments: { orderBy: { createdAt: "asc" } }, story: true },
  });

  if (!seed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enrichments: Record<string, any> = {};
  for (const e of seed.enrichments) {
    enrichments[e.agentName] = e.data;
  }

  const exportData = {
    version: "1.1",
    exportedAt: new Date().toISOString(),
    seed: {
      id: seed.id,
      title: seed.title,
      sourceType: seed.sourceType,
      sourceUrl: seed.sourceUrl,
      sourceName: seed.sourceName,
      rawText: seed.rawText,
      language: seed.language,
      narrativeScore: seed.narrativeScore,
      status: seed.status,
      discoveredAt: seed.discoveredAt.toISOString(),
    },
    enrichments,
    story: seed.story
      ? {
          id: seed.story.id,
          title: seed.story.title,
          status: seed.story.status,
          createdAt: seed.story.createdAt.toISOString(),
          publishedAt: seed.story.publishedAt?.toISOString() ?? null,
        }
      : null,
  };

  return NextResponse.json(exportData);
}
