import { fetchText } from "@/lib/http";
import { decodeEntities, httpsUrl, plainText } from "@/lib/text";

export const RELIEFWEB_RSS = "https://reliefweb.int/updates/rss.xml?legacy-river=country%2Fgha";
export const RELIEFWEB_SEARCH = "https://reliefweb.int/updates/rss.xml?search[value]=primary_country.iso3:GHA";
export const RELIEFWEB_GHANA = "https://reliefweb.int/country/gha";
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

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

type Rss2Item = {
  title?: string;
  link?: string;
  pubDate?: string;
  author?: string;
  description?: string;
  categories?: string[];
};

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

export function parseReliefWebJson(body: unknown): Bulletin[] {
  if (!body || typeof body !== "object") return [];
  const record = body as { status?: string; items?: Rss2Item[] };
  if (record.status !== "ok" || !Array.isArray(record.items)) return [];
  const items: Bulletin[] = [];
  for (const entry of record.items) {
    const item = fromRss2(entry);
    if (item) items.push(item);
    if (items.length >= 20) break;
  }
  return items;
}

export async function loadBulletins(): Promise<BulletinFeed> {
  const checkedAt = new Date().toISOString();
  if (cache && Date.now() - cache.at < 10 * 60_000) return { ok: true, checkedAt, items: cache.items };
  const attempts: string[] = [];
  for (const url of [RELIEFWEB_RSS, RELIEFWEB_SEARCH]) {
    const direct = await readDirect(url, attempts);
    if (direct.length) return store(checkedAt, direct);
    const converted = await readConverted(url, attempts);
    if (converted.length) return store(checkedAt, converted);
  }
  return { ok: false, checkedAt, message: FAILURE, detail: attempts.join(" | ").slice(0, 500) };
}

function store(checkedAt: string, items: Bulletin[]): BulletinFeed {
  cache = { at: Date.now(), items };
  return { ok: true, checkedAt, items };
}

async function readDirect(url: string, attempts: string[]): Promise<Bulletin[]> {
  const name = url.includes("legacy-river") ? "legacy" : "search";
  try {
    const response = await fetchText(url, 20_000, { store: false });
    const kind = response.body.includes("<rss") ? "rss" : response.body.includes("<html") ? "html" : response.body ? "other" : "empty";
    attempts.push(`${name}:${response.status}:${kind}:${response.body.length}`);
    if (response.status !== 200 || kind !== "rss") return [];
    return parseReliefWebRss(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    attempts.push(`${name}:${message.slice(0, 80)}`);
    return [];
  }
}

async function readConverted(url: string, attempts: string[]): Promise<Bulletin[]> {
  const name = url.includes("legacy-river") ? "legacy" : "search";
  try {
    const response = await fetchText(`${RSS2JSON}${encodeURIComponent(url)}`, 20_000, {
      store: false,
      accept: "application/json",
    });
    attempts.push(`${name}/rss2json:${response.status}:${response.body.length}`);
    if (response.status !== 200) return [];
    return parseReliefWebJson(JSON.parse(response.body) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    attempts.push(`${name}/rss2json:${message.slice(0, 80)}`);
    return [];
  }
}

function fromRss2(entry: Rss2Item): Bulletin | null {
  const title = plainText(entry.title ?? "");
  const url = httpsUrl(entry.link ?? "");
  if (!title || !url || !url.startsWith("https://reliefweb.int/")) return null;
  const description = entry.description ?? "";
  const categories = (entry.categories ?? []).map((category) => plainText(category));
  return {
    title,
    url,
    published: iso(entry.pubDate ?? ""),
    publisher: publisher(description) || plainText(entry.author ?? "") || null,
    situation: categories.some((category) => category.toLowerCase() === "situation report"),
    excerpt: excerpt(description),
  };
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
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
