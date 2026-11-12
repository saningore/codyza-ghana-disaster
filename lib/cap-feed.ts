import { capLinks, isLiveCap, parseCapAlert, type ParsedCap } from "@/lib/cap";
import { GMET_UNCHECKED } from "@/lib/copy";
import { FixtureRefusedError, UpstreamError } from "@/lib/errors";
import { fetchText } from "@/lib/http";
import { CAP_FEED, type NationalStatus } from "@/lib/types";

let cache: { at: number; alerts: ParsedCap[] } | null = null;

export function clearSourceCache(): void {
  cache = null;
}

export function assertLiveMode(): void {
  if (process.env.GHANA_USE_FIXTURES === "1") throw new FixtureRefusedError();
}

export async function loadCapAlerts(): Promise<{ ok: true; alerts: ParsedCap[] } | { ok: false; message: string }> {
  assertLiveMode();
  if (cache && Date.now() - cache.at < 60_000) return { ok: true, alerts: cache.alerts };
  try {
    const rss = await fetchText(CAP_FEED);
    if (rss.status !== 200 || !rss.body.includes("<rss")) {
      return { ok: false, message: GMET_UNCHECKED };
    }
    const links = capLinks(rss.body);
    const files = await Promise.all(links.map(async (url) => {
      try {
        const file = await fetchText(url);
        if (file.status !== 200 || !file.body.includes("cap:alert") && !file.body.includes("<alert")) return null;
        return parseCapAlert(file.body, url);
      } catch {
        return null;
      }
    }));
    const alerts = files.filter((alert): alert is ParsedCap => Boolean(alert?.id));
    if (links.length && !alerts.length) return { ok: false, message: GMET_UNCHECKED };
    cache = { at: Date.now(), alerts };
    return { ok: true, alerts };
  } catch (error) {
    if (error instanceof FixtureRefusedError) throw error;
    if (error instanceof UpstreamError) return { ok: false, message: GMET_UNCHECKED };
    return { ok: false, message: GMET_UNCHECKED };
  }
}

export function liveCaps(alerts: ParsedCap[], now = Date.now()): ParsedCap[] {
  return alerts.filter((alert) => isLiveCap(alert, now));
}

export async function nationalStatus(): Promise<NationalStatus> {
  const checkedAt = new Date().toISOString();
  const loaded = await loadCapAlerts();
  if (!loaded.ok) return { ok: false, checkedAt, message: loaded.message };
  const active = liveCaps(loaded.alerts).slice(0, 5).map((alert) => ({
    id: alert.id ?? "",
    headline: alert.headline,
    event: alert.event,
    severity: alert.severity,
    expires: alert.expires,
  })).filter((alert) => alert.id);
  return { ok: true, checkedAt, active };
}
