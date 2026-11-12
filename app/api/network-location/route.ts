import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/http";
import { lookupNetwork, publicAddress } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTSIDE = "This network location is outside Ghana. Enter a town or region.";
const UNAVAILABLE = "Your location could not be determined. Enter a town or region.";

export async function GET(request: NextRequest) {
  if (!rateLimit(`network:${clientKey(request.headers.get("x-forwarded-for"))}`, 20)) {
    return NextResponse.json({ error: "Too many location requests. Wait a minute and try again." }, { status: 429 });
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address = publicAddress(forwarded) ?? publicAddress(request.headers.get("x-real-ip"));
  const result = await lookupNetwork(address);
  if (!result.ok) {
    const outside = result.reason === "outside";
    return NextResponse.json({ error: outside ? OUTSIDE : UNAVAILABLE }, { status: outside ? 400 : 502 });
  }
  return NextResponse.json(result.hit, { headers: { "Cache-Control": "no-store" } });
}
