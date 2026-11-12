import { NextRequest, NextResponse } from "next/server";
import { inGhana, roundCoordinate } from "@/lib/geo";
import { fetchJson, clientKey, rateLimit } from "@/lib/http";
import { formatModel } from "@/lib/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!rateLimit(`forecast:${clientKey(request.headers.get("x-forwarded-for"))}`, 20)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  if (!inGhana(latitude, longitude)) {
    return NextResponse.json({ error: "That point is outside Ghana." }, { status: 400 });
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(roundCoordinate(latitude)));
  url.searchParams.set("longitude", String(roundCoordinate(longitude)));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("timezone", "Africa/Accra");
  url.searchParams.set("forecast_days", "1");
  try {
    const response = await fetchJson(url.toString());
    if (response.status !== 200) {
      return NextResponse.json({ error: "The model forecast could not be checked. No rainfall amount was added." }, { status: 502 });
    }
    const lines = formatModel(response.body);
    if (!lines.length) {
      return NextResponse.json({ error: "The model response did not include a temperature or rainfall amount. Nothing was added." }, { status: 502 });
    }
    return NextResponse.json({
      lines,
      note: "Numerical model from Open-Meteo. This is not a Ghana Meteorological Agency forecast and it cannot clear a warning.",
      source: "https://open-meteo.com/",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The model forecast could not be checked. No rainfall amount was added." }, { status: 502 });
  }
}
