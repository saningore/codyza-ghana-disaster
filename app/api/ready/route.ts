import { NextResponse } from "next/server";
import { loadPlaces } from "@/lib/geocode";
import { loadRegions } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.GHANA_USE_FIXTURES === "1") {
    return NextResponse.json({ ok: false, error: "Fixture mode is refused." }, { status: 503 });
  }
  const places = loadPlaces();
  const regions = loadRegions();
  if (places.length < 16 || regions.length !== 16) {
    return NextResponse.json({ ok: false, places: places.length, regions: regions.length }, { status: 503 });
  }
  return NextResponse.json({ ok: true, places: places.length, regions: regions.length });
}
