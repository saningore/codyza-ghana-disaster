import { UpstreamError } from "@/lib/errors";
import { fetchHttpsText } from "@/lib/http";
import { decodeEntities, httpsUrl, plainText } from "@/lib/text";

export const RELIEFWEB_RSS = "https://reliefweb.int/updates/rss.xml?legacy-river=country%2Fgha";
export const RELIEFWEB_GHANA = "https://reliefweb.int/country/gha";

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
  | { ok: false; checkedAt: string; message: string };

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
  try {
    const response = await fetchHttpsText(RELIEFWEB_RSS, 15000);
    if (response.status !== 200) return { ok: false, checkedAt, message: FAILURE };
    const items = parseReliefWebRss(response.body);
    if (!items.length) return { ok: false, checkedAt, message: FAILURE };
    cache = { at: Date.now(), items };
    return { ok: true, checkedAt, items };
  } catch (error) {
    if (error instanceof UpstreamError) return { ok: false, checkedAt, message: FAILURE };
    return { ok: false, checkedAt, message: FAILURE };
  }
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
