import { UpstreamError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { asRecord, httpsUrl, plainText, textOrNull } from "@/lib/text";

const PERSONS_PAGE = "https://police.gov.gh/en/index.php/wp-json/wp/v2/pages?slug=wanted-missing&_fields=link,content";
const CHILDREN_PAGE = "https://police.gov.gh/en/index.php/wp-json/wp/v2/pages?slug=missing-children&_fields=link,content";
const MEDIA = "https://police.gov.gh/en/index.php/wp-json/wp/v2/media";

export const POLICE_MISSING = "https://police.gov.gh/en/index.php/wanted-missing/";
export const POLICE_CHILDREN = "https://police.gov.gh/en/index.php/missing-children/";

export type MissingNotice = {
  id: string;
  title: string;
  published: string | null;
  url: string;
  imageUrl: string | null;
  list: "persons" | "children";
};

export type MissingFeed =
  | { ok: true; checkedAt: string; notices: MissingNotice[]; partial: string | null }
  | { ok: false; checkedAt: string; message: string };

const FAILURE = "The Ghana Police Service page could not be read. No name was added.";

let cache: { at: number; feed: MissingFeed } | null = null;

export function sectionIds(html: string, heading: RegExp): string[] {
  const ids: string[] = [];
  let open = false;
  const pattern = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>|images=(?:&#8221;|&quot;|&#34;|")([0-9,]+)/gi;
  for (const match of html.matchAll(pattern)) {
    if (match[1] !== undefined) {
      const text = plainText(match[1]);
      open = heading.test(text);
      continue;
    }
    if (open && match[2]) ids.push(...digits(match[2]));
  }
  return [...new Set(ids)];
}

export function galleryIds(html: string): string[] {
  const ids: string[] = [];
  for (const match of html.matchAll(/images=(?:&#8221;|&quot;|&#34;|")([0-9,]+)/gi)) {
    if (match[1]) ids.push(...digits(match[1]));
  }
  return [...new Set(ids)];
}

export function parsePoliceMedia(body: unknown, allowed: Map<string, "persons" | "children">): MissingNotice[] {
  if (!Array.isArray(body)) return [];
  const notices: MissingNotice[] = [];
  for (const item of body) {
    const record = asRecord(item);
    if (!record) continue;
    const id = typeof record.id === "number" ? String(record.id) : textOrNull(record.id);
    const list = id ? allowed.get(id) : undefined;
    if (!id || !list) continue;
    const title = plainText(rendered(record.title));
    const url = policeUrl(textOrNull(record.link));
    if (!title || !url) continue;
    const published = iso(textOrNull(record.date));
    notices.push({
      id,
      title,
      published,
      url,
      imageUrl: policeUrl(textOrNull(record.source_url)),
      list,
    });
  }
  notices.sort((left, right) => (right.published ?? "").localeCompare(left.published ?? ""));
  return notices;
}

export async function loadMissingNotices(): Promise<MissingFeed> {
  const checkedAt = new Date().toISOString();
  if (cache && Date.now() - cache.at < 10 * 60_000 && cache.feed.ok) {
    return { ...cache.feed, checkedAt };
  }
  try {
    const [persons, children] = await Promise.all([
      readPage(PERSONS_PAGE),
      readPage(CHILDREN_PAGE),
    ]);
    const partial = persons.ok && children.ok
      ? null
      : persons.ok
        ? "The missing-children page could not be read. No child was added from that page."
        : children.ok
          ? "The missing-persons page could not be read. No adult notice was added from that page."
          : null;
    if (!persons.ok && !children.ok) return { ok: false, checkedAt, message: FAILURE };
    const allowed = new Map<string, "persons" | "children">();
    if (persons.ok) {
      for (const id of sectionIds(persons.html, /missing persons/i)) allowed.set(id, "persons");
    }
    if (children.ok) {
      for (const id of galleryIds(children.html)) {
        if (!allowed.has(id)) allowed.set(id, "children");
      }
    }
    const media = await loadMedia([...allowed.keys()]);
    const notices = parsePoliceMedia(media, allowed);
    if (!notices.length) return { ok: false, checkedAt, message: FAILURE };
    const feed: MissingFeed = { ok: true, checkedAt, notices, partial };
    cache = { at: Date.now(), feed };
    return feed;
  } catch (error) {
    if (error instanceof UpstreamError) return { ok: false, checkedAt, message: FAILURE };
    return { ok: false, checkedAt, message: FAILURE };
  }
}

async function readPage(url: string): Promise<{ ok: true; html: string } | { ok: false }> {
  try {
    const response = await fetchJson(url, 20000);
    if (response.status !== 200 || !Array.isArray(response.body)) return { ok: false };
    const page = asRecord(response.body[0]);
    const html = rendered(page?.content);
    return html ? { ok: true, html } : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function loadMedia(ids: string[]): Promise<unknown[]> {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += 100) chunks.push(ids.slice(index, index + 100));
  const pages = await Promise.all(chunks.map(async (chunk) => {
    const url = `${MEDIA}?per_page=100&_fields=id,date,link,source_url,title&include=${chunk.join(",")}`;
    try {
      const response = await fetchJson(url, 20000);
      return response.status === 200 && Array.isArray(response.body) ? response.body : [];
    } catch {
      return [];
    }
  }));
  return pages.flat();
}

function rendered(value: unknown): string {
  return textOrNull(asRecord(value)?.rendered) ?? "";
}

function policeUrl(value: string | null): string | null {
  const url = httpsUrl(value);
  if (!url) return null;
  const host = new URL(url).hostname;
  return host === "police.gov.gh" || host === "www.police.gov.gh" ? url : null;
}

function digits(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter((part) => /^\d+$/.test(part));
}

function iso(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
