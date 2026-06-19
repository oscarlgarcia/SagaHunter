import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Agent name required" }, { status: 400 });
  }

  try {
    const { execSync } = await import("child_process");
    const output = execSync(
      `python3 -c "import sys; sys.path.insert(0, '/app/python'); from app.orchestrator import run_agent_once; run_agent_once('${name.replace(/'/g, "'\\''")}')"`,
      { cwd: "/app/python", timeout: 120000, encoding: "utf-8" }
    );
    return NextResponse.json({ ok: true, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.stderr || err.message || "Failed to run agent" }, { status: 500 });
  }
}
