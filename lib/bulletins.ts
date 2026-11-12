import { UpstreamError } from "@/lib/errors";
import { fetchHttpsText, fetchText } from "@/lib/http";
import { decodeEntities, httpsUrl, plainText } from "@/lib/text";

export const RELIEFWEB_RSS = "https://reliefweb.int/updates/rss.xml?legacy-river=country%2Fgha";
export const RELIEFWEB_SEARCH = "https://reliefweb.int/updates/rss.xml?search[value]=primary_country.iso3:GHA";
export const RELIEFWEB_GHANA = "https://reliefweb.int/country/gha";
const BROWSER_CLIENT = "Mozilla/5.0 (compatible; GhanaDisaster/1.0; +https://ghanadisaster.com)";

export type Bulletin = {
  title: string;
  url: string;
  published: string | null;
  publisher: string | null;
  situation: boolean;
  excerpt: string | null;
};

export type BulletinFeed =
  | { ok: true; checkedAt: string; items: Bulletin[] }
  | { ok: false; checkedAt: string; message: string; detail: string };

const FAILURE = "ReliefWeb could not be read. No bulletin was added.";

let cache: { at: number; items: Bulletin[] } | null = null;

export function parseReliefWebRss(xml: string): Bulletin[] {
  if (!xml.includes("<rss")) return [];
  const items: Bulletin[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = bulletin(match[1] ?? "");
    if (item) items.push(item);
    if (items.length >= 20) break;
  }
  return items;
}

export async function loadBulletins(): Promise<BulletinFeed> {
  const checkedAt = new Date().toISOString();
  if (cache && Date.now() - cache.at < 60_000) return { ok: true, checkedAt, items: cache.items };
  const attempts: string[] = [];
  for (const url of [RELIEFWEB_RSS, RELIEFWEB_SEARCH]) {
    const read = await readRss(url, attempts);
    if (!read.length) continue;
    cache = { at: Date.now(), items: read };
    return { ok: true, checkedAt, items: read };
  }
  return { ok: false, checkedAt, message: FAILURE, detail: attempts.join(" | ").slice(0, 500) };
}

async function readRss(url: string, attempts: string[]): Promise<Bulletin[]> {
  const name = url.includes("legacy-river") ? "legacy" : "search";
  for (const userAgent of [undefined, BROWSER_CLIENT]) {
    const label = userAgent ? "browser" : "site";
    try {
      const response = await fetchText(url, 20_000, { userAgent, store: false });
      const kind = response.body.includes("<rss") ? "rss" : response.body.includes("<html") ? "html" : response.body ? "other" : "empty";
      attempts.push(`${name}/${label}:${response.status}:${kind}:${response.body.length}`);
      if (response.status !== 200 || kind !== "rss") continue;
      const items = parseReliefWebRss(response.body);
      if (items.length) return items;
      attempts.push(`${name}/${label}:parsed0`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error";
      attempts.push(`${name}/${label}:${message.slice(0, 80)}`);
      if (!(error instanceof UpstreamError)) continue;
    }
  }
  try {
    const response = await fetchHttpsText(url, 20_000);
    const kind = response.body.includes("<rss") ? "rss" : response.body.includes("<html") ? "html" : response.body ? "other" : "empty";
    attempts.push(`${name}/https:${response.status}:${kind}:${response.body.length}`);
    if (response.status === 200 && kind === "rss") {
      const items = parseReliefWebRss(response.body);
      if (items.length) return items;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    attempts.push(`${name}/https:${message.slice(0, 80)}`);
  }
  return [];
}

function bulletin(item: string): Bulletin | null {
  const title = plainText(tag(item, "title") ?? "");
  const url = httpsUrl(plainText(tag(item, "link") ?? ""));
  if (!title || !url || !url.startsWith("https://reliefweb.int/")) return null;
  const categories = [...item.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)]
    .map((match) => plainText(match[1] ?? ""))
    .filter(Boolean);
  const published = iso(plainText(tag(item, "pubDate") ?? ""));
  return {
    title,
    url,
    published,
    publisher: publisher(tag(item, "description") ?? ""),
    situation: categories.some((category) => category.toLowerCase() === "situation report"),
    excerpt: excerpt(tag(item, "description") ?? ""),
  };
}

function publisher(description: string): string | null {
  const match = decodeEntities(description).match(/Source:\s*([^<]+)/i);
  const name = plainText(match?.[1] ?? "");
  return name || null;
}

function excerpt(description: string): string | null {
  const text = plainText(description);
  const attached = text.match(/Please refer to the attached file\.\s*([\s\S]+)/i);
  const body = (attached?.[1] ?? text).replace(/^Please refer to the attached file\.\s*/i, "").trim();
  if (!body) return null;
  if (body.length <= 420) return body;
  const cut = body.slice(0, 420);
  const space = cut.lastIndexOf(" ");
  return `${(space > 240 ? cut.slice(0, space) : cut).trim()}…`;
}

function tag(item: string, name: string): string | null {
  const match = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1] ?? null;
}

function iso(value: string): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
