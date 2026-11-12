import { NextRequest, NextResponse } from "next/server";
import { GeocodeError } from "@/lib/errors";
import { resolveQuery, suggestionsFor } from "@/lib/geocode";
import { clientKey, rateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!rateLimit(`geocode:${clientKey(request.headers.get("x-forwarded-for"))}`)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Enter a town, district, or region." }, { status: 400 });
  }
  try {
    if (request.nextUrl.searchParams.get("suggest") === "1") {
      return NextResponse.json({ suggestions: suggestionsFor(query) }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(resolveQuery(query), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof GeocodeError
      ? error.message
      : "That location could not be found. Try a town, a district, or device location.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
