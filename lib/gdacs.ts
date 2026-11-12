import { GDACS_EMPTY, GDACS_UNCHECKED } from "@/lib/copy";
import { UpstreamError } from "@/lib/errors";
import { inGhana, kmBetween } from "@/lib/geo";
import { fetchJson } from "@/lib/http";
import { polygonRelation } from "@/lib/polygon";
import { asRecord, httpsUrl, textOrNull } from "@/lib/text";
import type { InternationalEvent } from "@/lib/types";

export async function gdacsEvents(
  latitude: number,
  longitude: number,
): Promise<{ ok: true; events: InternationalEvent[] } | { ok: false; message: string }> {
  const end = new Date();
  const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const url = new URL("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH");
  url.searchParams.set("eventlist", "EQ;TC;FL;VO;WF");
  url.searchParams.set("fromdate", start.toISOString().slice(0, 10));
  url.searchParams.set("todate", end.toISOString().slice(0, 10));
  url.searchParams.set("alertlevel", "green;orange;red");
  try {
    const response = await fetchJson(url.toString(), 12000);
    if (response.status !== 200) return { ok: false, message: GDACS_UNCHECKED };
    const features = asRecord(response.body)?.features;
    if (!Array.isArray(features)) return { ok: false, message: GDACS_UNCHECKED };
    const events: InternationalEvent[] = [];
    for (const feature of features) {
      const record = asRecord(feature);
      const properties = asRecord(record?.properties);
      const geometry = record?.geometry;
      if (!properties || !affectsGhana(properties, geometry, latitude, longitude)) continue;
      const point = representative(geometry, properties);
      const id = textOrNull(properties.eventid) ?? textOrNull(properties.id);
      if (!id) continue;
      events.push({
        id,
        name: textOrNull(properties.name) ?? textOrNull(properties.eventname) ?? textOrNull(properties.htmldescription),
        eventType: textOrNull(properties.eventtype),
        alertLevel: textOrNull(properties.alertlevel),
        country: textOrNull(properties.country),
        fromDate: textOrNull(properties.fromdate),
        url: httpsUrl(textOrNull(properties.url) ?? textOrNull(properties.link)),
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
      });
    }
    return { ok: true, events };
  } catch (error) {
    if (error instanceof UpstreamError) return { ok: false, message: GDACS_UNCHECKED };
    return { ok: false, message: GDACS_EMPTY };
  }
}

function affectsGhana(properties: Record<string, unknown>, geometry: unknown, latitude: number, longitude: number): boolean {
  if (polygonRelation(geometry, latitude, longitude) === "inside") return true;
  const point = representative(geometry, properties);
  if (!point) return false;
  const country = textOrNull(properties.country) ?? "";
  const namedGhana = /ghana|\bGHA\b/i.test(country);
  const near = kmBetween(latitude, longitude, point.latitude, point.longitude);
  if (inGhana(point.latitude, point.longitude) && near <= 500) return true;
  return namedGhana && near <= 800;
}

function representative(geometry: unknown, properties: Record<string, unknown>): { latitude: number; longitude: number } | null {
  const lat = typeof properties.latitude === "number" ? properties.latitude : null;
  const lon = typeof properties.longitude === "number" ? properties.longitude : null;
  if (lat !== null && lon !== null) return { latitude: lat, longitude: lon };
  const record = asRecord(geometry);
  const coordinates = record?.coordinates;
  if (record?.type === "Point" && Array.isArray(coordinates) && coordinates.length >= 2) {
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    if (typeof longitude === "number" && typeof latitude === "number") return { latitude, longitude };
  }
  return null;
}
