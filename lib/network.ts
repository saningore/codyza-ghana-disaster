import { UpstreamError } from "@/lib/errors";
import { inGhana, roundCoordinate } from "@/lib/geo";
import { fetchJson } from "@/lib/http";
import { asRecord, textOrNull } from "@/lib/text";
import type { GeocodeHit } from "@/lib/types";

export function publicAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const ip = value.trim().replace(/^::ffff:/i, "");
  if (!ip || ip.length > 64 || ip.includes("%") || ip.includes("/") || /\s/.test(ip)) return null;
  if (isIpv4(ip)) return privateV4(ip) ? null : ip;
  if (isIpv6(ip)) return privateV6(ip) ? null : ip;
  return null;
}

export function parseNetworkFix(body: unknown): GeocodeHit | null {
  const record = asRecord(body);
  if (!record || record.success !== true) return null;
  if ((textOrNull(record.country_code) ?? "").toUpperCase() !== "GH") return null;
  const latitude = typeof record.latitude === "number" ? record.latitude : Number.NaN;
  const longitude = typeof record.longitude === "number" ? record.longitude : Number.NaN;
  if (!inGhana(latitude, longitude)) return null;
  const city = placeName(record.city);
  const region = placeName(record.region);
  const place = [city, region].filter(Boolean).join(", ");
  return {
    label: place ? `Network location, ${place}` : "Network location",
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    precision: "network",
    region,
  };
}

export async function lookupNetwork(
  address: string | null,
): Promise<{ ok: true; hit: GeocodeHit } | { ok: false; reason: "outside" | "unavailable" }> {
  const url = address ? `https://ipwho.is/${encodeURIComponent(address)}` : "https://ipwho.is/";
  try {
    const response = await fetchJson(url, 8000);
    const record = response.status === 200 ? asRecord(response.body) : null;
    if (!record || record.success !== true) return { ok: false, reason: "unavailable" };
    const hit = parseNetworkFix(record);
    return hit ? { ok: true, hit } : { ok: false, reason: "outside" };
  } catch (error) {
    if (error instanceof UpstreamError) return { ok: false, reason: "unavailable" };
    return { ok: false, reason: "unavailable" };
  }
}

function placeName(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text || text.length > 40 || !/^[\p{L}\s.'-]+$/u.test(text)) return null;
  return text;
}

function isIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function privateV4(ip: string): boolean {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

function isIpv6(ip: string): boolean {
  return ip.includes(":") && /^[0-9a-f:]+$/i.test(ip);
}

function privateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}
