import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const enrichmentId = params.id;

  const enrichment = await prisma.enrichment.findUnique({
    where: { id: enrichmentId },
    include: { seed: true },
  });
  if (!enrichment) {
    return NextResponse.json({ error: "Enrichment not found" }, { status: 404 });
  }

  try {
    const { execSync } = await import("child_process");
    execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from app.llm_enrich import run_llm_enrichment; run_llm_enrichment('${enrichmentId.replace(/'/g, "'\\''")}')"`,
      { cwd: "/app/python", timeout: 180000, encoding: "utf-8" }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: (err.stderr || err.message || "LLM enrichment failed").slice(0, 200) },
      { status: 500 }
    );
  }

  const updated = await prisma.enrichment.findUnique({
    where: { id: enrichmentId },
  });

  return NextResponse.json(updated);
}
