import { NextRequest, NextResponse } from "next/server";
import { FixtureRefusedError } from "@/lib/errors";
import { inGhana, roundCoordinate } from "@/lib/geo";
import { loadHazards } from "@/lib/hazards";
import { clientKey, rateLimit } from "@/lib/http";
import type { Precision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRECISIONS = new Set<Precision>(["town", "region-center", "device", "network"]);

export async function GET(request: NextRequest) {
  if (process.env.GHANA_USE_FIXTURES === "1") {
    return NextResponse.json({ error: "Fixture mode is refused. GhanaDisaster does not serve sample alerts." }, { status: 503 });
  }
  if (!rateLimit(`hazards:${clientKey(request.headers.get("x-forwarded-for"))}`, 20)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const precision = params.get("precision") ?? "";
  const label = (params.get("label") ?? "").replace(/[\u0000-\u001F]/g, "").trim();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !inGhana(latitude, longitude)) {
    return NextResponse.json(
      { error: "That point is outside Ghana. GhanaDisaster checks sources for Ghana." },
      { status: 400 },
    );
  }
  if (!PRECISIONS.has(precision as Precision)) {
    return NextResponse.json({ error: "Choose a town, a region, or a location." }, { status: 400 });
  }
  if (!label || label.length > 180) {
    return NextResponse.json({ error: "Enter a town, district, or region." }, { status: 400 });
  }
  try {
    const report = await loadHazards({
      label,
      latitude: roundCoordinate(latitude),
      longitude: roundCoordinate(longitude),
      precision: precision as Precision,
    });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FixtureRefusedError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Hazard information could not be loaded." }, { status: 502 });
  }
}
