import { UpstreamError } from "@/lib/errors";
import { inGhana } from "@/lib/geo";
import { fetchForm } from "@/lib/http";
import { asRecord, httpsUrl, textOrNull } from "@/lib/text";

export const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

const QUERY = `[out:json][timeout:20];(
  way["highway"~"^(motorway|trunk|primary|secondary)$"]["access"~"^(no|closed)$"](4.5,-3.5,11.4,1.5);
  way["highway"="construction"]["construction"~"^(motorway|trunk|primary|secondary)$"](4.5,-3.5,11.4,1.5);
);out tags center 40;`;

const ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary"]);

export type RoadNotice = {
  id: string;
  label: string;
  highway: string;
  tag: string;
  latitude: number;
  longitude: number;
  url: string;
};

export type RoadFeed =
  | { ok: true; checkedAt: string; osmTime: string | null; notices: RoadNotice[] }
  | { ok: false; checkedAt: string; message: string };

const FAILURE = "OpenStreetMap could not be checked. No closure was added.";

let cache: { at: number; feed: RoadFeed } | null = null;

export function parseOverpass(body: unknown): { ok: true; osmTime: string | null; notices: RoadNotice[] } | { ok: false } {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.elements)) return { ok: false };
  const osm = asRecord(record.osm3s);
  const notices: RoadNotice[] = [];
  for (const element of record.elements) {
    const notice = roadNotice(element);
    if (notice) notices.push(notice);
    if (notices.length >= 40) break;
  }
  notices.sort((left, right) => left.label.localeCompare(right.label));
  return { ok: true, osmTime: textOrNull(osm?.timestamp_osm_base), notices };
}

export async function loadRoadNotices(): Promise<RoadFeed> {
  const checkedAt = new Date().toISOString();
  if (cache && Date.now() - cache.at < 10 * 60_000 && cache.feed.ok) {
    return { ...cache.feed, checkedAt };
  }
  const body = `data=${encodeURIComponent(QUERY)}`;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetchForm(endpoint, body, 22000);
      if (response.status !== 200) continue;
      const parsed = parseOverpass(parseJson(response.body));
      if (!parsed.ok) continue;
      const feed: RoadFeed = { ok: true, checkedAt, osmTime: parsed.osmTime, notices: parsed.notices };
      cache = { at: Date.now(), feed };
      return feed;
    } catch (error) {
      if (!(error instanceof UpstreamError)) continue;
    }
  }
  return { ok: false, checkedAt, message: FAILURE };
}

function roadNotice(value: unknown): RoadNotice | null {
  const element = asRecord(value);
  const tags = asRecord(element?.tags);
  const center = asRecord(element?.center);
  if (!element || element.type !== "way" || !tags || !center) return null;
  const id = typeof element.id === "number" ? String(element.id) : textOrNull(element.id);
  const latitude = typeof center.lat === "number" ? center.lat : Number.NaN;
  const longitude = typeof center.lon === "number" ? center.lon : Number.NaN;
  if (!id || !/^\d+$/.test(id) || !inGhana(latitude, longitude)) return null;
  const highway = (textOrNull(tags.highway) ?? "").toLowerCase();
  const built = (textOrNull(tags.construction) ?? "").toLowerCase();
  const access = (textOrNull(tags.access) ?? "").toLowerCase();
  const tag = noticeTag(highway, built, access);
  if (!tag) return null;
  const ref = textOrNull(tags.ref);
  const name = textOrNull(tags.name);
  const label = [ref, name].filter(Boolean).join(" · ") || `${highway || built || "road"} road`;
  const url = httpsUrl(`https://www.openstreetmap.org/way/${id}`);
  if (!url) return null;
  return { id, label, highway: highway || built, tag, latitude, longitude, url };
}

function noticeTag(highway: string, built: string, access: string): string | null {
  if ((access === "no" || access === "closed") && MAJOR.has(highway)) return `access=${access}`;
  if (highway === "construction" && MAJOR.has(built)) return `construction=${built}`;
  return null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
