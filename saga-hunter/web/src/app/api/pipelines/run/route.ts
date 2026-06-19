import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const triggerAgent = body.triggerAgent;

  if (!triggerAgent) {
    return NextResponse.json({ error: "triggerAgent required" }, { status: 400 });
  }

  try {
    const { execSync } = await import("child_process");
    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from app.orchestrator import run_pipeline; run_pipeline('${triggerAgent.replace(/'/g, "'\\''")}')"`,
      { cwd: "/app/python", timeout: 300000, encoding: "utf-8" }
    );
    return NextResponse.json({ ok: true, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to run pipeline" }, { status: 500 });
  }
}
