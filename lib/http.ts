import { UpstreamError } from "@/lib/errors";
import { USER_AGENT } from "@/lib/types";
import https from "node:https";

export async function fetchText(
  url: string,
  timeoutMs = 15000,
  options?: { userAgent?: string; store?: boolean; accept?: string },
): Promise<{ status: number; body: string }> {
  const response = await request(url, timeoutMs, options?.accept ?? "application/xml, text/xml, application/rss+xml, text/plain", options);
  return { status: response.status, body: await response.text() };
}

export async function fetchJson(url: string, timeoutMs = 8000): Promise<{ status: number; body: unknown }> {
  const response = await request(url, timeoutMs, "application/geo+json, application/json");
  if (response.status === 204) return { status: 204, body: null };
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

export async function fetchForm(url: string, body: string, timeoutMs = 20000): Promise<{ status: number; body: string }> {
  const response = await request(url, timeoutMs, "application/json, text/plain", {
    method: "POST",
    body,
    contentType: "application/x-www-form-urlencoded",
  });
  return { status: response.status, body: await response.text() };
}

async function request(
  url: string,
  timeoutMs: number,
  accept: string,
  extra?: { method?: "GET" | "POST"; body?: string; contentType?: string; userAgent?: string; store?: boolean },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: accept,
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": extra?.userAgent || USER_AGENT,
    };
    if (extra?.contentType) headers["Content-Type"] = extra.contentType;
    const method = extra?.method ?? "GET";
    const init: RequestInit & { next?: { revalidate: number } } = {
      method,
      body: extra?.body,
      signal: controller.signal,
      headers,
    };
    if (extra?.store === false) init.cache = "no-store";
    else if (process.env.NEXT_RUNTIME && method === "GET") init.next = { revalidate: 60 };
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError("A source took too long to respond.");
    }
    throw new UpstreamError("A source could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

export function fetchHttpsText(url: string, timeoutMs = 15000, redirects = 0): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": USER_AGENT,
      },
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        clearTimeout(timer);
        if (redirects >= 3) {
          reject(new UpstreamError("A source could not be reached."));
          return;
        }
        const next = new URL(location, url);
        if (next.protocol !== "https:") {
          reject(new UpstreamError("A source could not be reached."));
          return;
        }
        resolve(fetchHttpsText(next.toString(), timeoutMs, redirects + 1));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        clearTimeout(timer);
        resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    const timer = setTimeout(() => {
      request.destroy();
      reject(new UpstreamError("A source took too long to respond."));
    }, timeoutMs);
    request.on("error", () => {
      clearTimeout(timer);
      reject(new UpstreamError("A source could not be reached."));
    });
  });
}

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientKey(header: string | null): string {
  const forwarded = header?.split(",")[0]?.trim();
  return forwarded || "local";
}
