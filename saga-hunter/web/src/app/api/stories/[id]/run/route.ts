import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { execSync } = await import("child_process");
    const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from agents.story.orchestrator import run_full_pipeline; run_full_pipeline(${quote(params.id)})"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
    );

    const { prisma } = await import("@/lib/prisma");
    const story = await prisma.story.findUnique({
      where: { id: params.id },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        characters: true,
        locations: true,
        arcs: true,
      },
    });

    return NextResponse.json({ story, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to run" }, { status: 500 });
  }
}
