import { NextRequest, NextResponse } from "next/server";
import { nationalStatus } from "@/lib/cap-feed";
import { FixtureRefusedError } from "@/lib/errors";
import { clientKey, rateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!rateLimit(`national:${clientKey(request.headers.get("x-forwarded-for"))}`, 30)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  try {
    const status = await nationalStatus();
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FixtureRefusedError) {
      return NextResponse.json({ ok: false, checkedAt: new Date().toISOString(), message: error.message }, { status: 503 });
    }
    return NextResponse.json({
      ok: false,
      checkedAt: new Date().toISOString(),
      message: "The Ghana Meteorological Agency feed could not be checked. No alert was added.",
    }, { status: 200 });
  }
}
