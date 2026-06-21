import { NextRequest, NextResponse } from "next/server";

// In-memory subscriptions (in production, store in DB)
const subscriptions: PushSubscriptionJSON[] = [];

export async function POST(req: NextRequest) {
  try {
    const sub = await req.json();
    if (!sub || !sub.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    const exists = subscriptions.some((s) => s.endpoint === sub.endpoint);
    if (!exists) {
      subscriptions.push(sub);
    }
    return NextResponse.json({ ok: true, total: subscriptions.length });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ total: subscriptions.length });
}
