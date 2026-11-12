import { polygonRelation, simplifyGeometry } from "@/lib/polygon";
import { httpsUrl } from "@/lib/text";
import { CAP_FEED, SEVERITY_RANK, type AlertScope, type HazardGroup, type OfficialAlert, type OfficialGeometry, type PolygonRelation } from "@/lib/types";

export type ParsedCap = {
  id: string | null;
  xmlUrl: string | null;
  status: string | null;
  messageType: string | null;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  effective: string | null;
  expires: string | null;
  sent: string | null;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  senderName: string | null;
  web: string | null;
  areaDesc: string | null;
  geometry: OfficialGeometry | null;
};

export function parseCapAlert(xml: string, xmlUrl: string | null = null): ParsedCap {
  const info = block(xml, "info") ?? xml;
  const areas = blocks(info, "area");
  const polygons = areas.flatMap((area) => blocks(area, "polygon"));
  const names = areas.map((area) => field(area, "areaDesc")).filter((name): name is string => Boolean(name));
  return {
    id: field(xml, "identifier"),
    xmlUrl: httpsUrl(xmlUrl),
    status: field(xml, "status"),
    messageType: field(xml, "msgType"),
    event: field(info, "event"),
    severity: field(info, "severity"),
    urgency: field(info, "urgency"),
    certainty: field(info, "certainty"),
    effective: field(info, "effective"),
    expires: field(info, "expires"),
    sent: field(xml, "sent"),
    headline: field(info, "headline"),
    description: field(info, "description"),
    instruction: field(info, "instruction"),
    senderName: field(info, "senderName"),
    web: httpsUrl(field(info, "web")),
    areaDesc: names.length ? names.join("; ") : null,
    geometry: polygonsToGeometry(polygons),
  };
}

export function capLinks(rss: string): string[] {
  const found = rss.match(/https:\/\/www\.meteo\.gov\.gh\/api\/cap\/[a-z0-9-]+\.xml/gi) ?? [];
  return [...new Set(found)].slice(0, 8);
}

export function isLiveCap(alert: ParsedCap, now: number): boolean {
  if ((alert.status ?? "").toLowerCase() !== "actual") return false;
  const type = (alert.messageType ?? "").toLowerCase();
  if (type !== "alert" && type !== "update") return false;
  if (!alert.expires) return false;
  const expires = Date.parse(alert.expires);
  return Number.isFinite(expires) && expires > now;
}

export function locateAlert(
  alert: ParsedCap,
  point: { latitude: number; longitude: number } | null,
  regionName: string | null,
): OfficialAlert {
  const geometry = alert.geometry;
  let relation: PolygonRelation = "none";
  let scope: AlertScope = "area";
  if (point && geometry) {
    relation = polygonRelation(geometry, point.latitude, point.longitude);
    scope = relation === "inside" ? "point" : "area";
  } else if (!geometry && namesRegion(alert.areaDesc, regionName)) {
    scope = "named";
  }
  return {
    id: alert.id,
    event: alert.event,
    severity: alert.severity,
    urgency: alert.urgency,
    certainty: alert.certainty,
    areaDesc: alert.areaDesc,
    effective: alert.effective,
    expires: alert.expires,
    sent: alert.sent,
    instruction: alert.instruction,
    description: alert.description,
    headline: alert.headline,
    senderName: alert.senderName,
    messageType: alert.messageType,
    status: alert.status,
    web: alert.web,
    officialUrl: alert.web ?? alert.xmlUrl,
    geometry: simplifyGeometry(geometry),
    relation: relation === "none" && geometry && point ? "outside" : relation,
    relationChecked: Boolean(point && geometry),
    scope,
    group: hazardGroup(alert.event),
  };
}

export function namesRegion(areaDesc: string | null, regionName: string | null): boolean {
  if (!areaDesc || !regionName) return false;
  const target = regionName.toLowerCase().replace(/ region$/, "").trim();
  const parts = areaDesc.split(/[;,]/).map((part) => part.toLowerCase().replace(/ region$/, "").trim());
  return parts.some((part) => part === target);
}

export function hazardGroup(event: string | null): HazardGroup {
  const text = (event ?? "").toLowerCase();
  if (text.includes("flood") || text.includes("dam") || text.includes("spill")) return "Flood";
  if (text.includes("marine") || text.includes("sea") || text.includes("coast")) return "Marine";
  if (text.includes("thunder") || text.includes("squall") || text.includes("rain") || text.includes("storm")) return "Thunderstorm";
  return "Other";
}

export function compareAlerts(left: OfficialAlert, right: OfficialAlert): number {
  const rank = (alert: OfficialAlert) => SEVERITY_RANK[alert.severity ?? ""] ?? 5;
  const bySeverity = rank(left) - rank(right);
  if (bySeverity) return bySeverity;
  return Date.parse(right.sent ?? "") - Date.parse(left.sent ?? "");
}

export const CAP_RSS = CAP_FEED;

function polygonsToGeometry(polygons: string[]): OfficialGeometry | null {
  const rings = polygons.map(capRing).filter((ring) => ring.length >= 4);
  if (!rings.length) return null;
  if (rings.length === 1 && rings[0]) return { type: "Polygon", coordinates: [rings[0]] };
  return { type: "MultiPolygon", coordinates: rings.map((ring) => [ring]) };
}

function capRing(text: string): number[][] {
  const ring: number[][] = [];
  for (const pair of text.trim().split(/\s+/)) {
    const [latText, lonText] = pair.split(",");
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    ring.push([lon, lat]);
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([first[0], first[1]]);
  return ring;
}

function field(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<(?:cap:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:cap:)?${tag}>`, "i"));
  if (!match?.[1]) return null;
  const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function block(xml: string, tag: string): string | null {
  return blocks(xml, tag)[0] ?? null;
}

function blocks(xml: string, tag: string): string[] {
  const found: string[] = [];
  const re = new RegExp(`<(?:cap:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:cap:)?${tag}>`, "gi");
  for (const match of xml.matchAll(re)) {
    if (match[1]) found.push(match[1]);
  }
  return found;
}
