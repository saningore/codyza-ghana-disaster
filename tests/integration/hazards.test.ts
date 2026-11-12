import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSourceCache } from "@/lib/cap-feed";
import { FixtureRefusedError } from "@/lib/errors";
import { loadHazards } from "@/lib/hazards";
import { USER_AGENT } from "@/lib/types";

afterEach(() => {
  clearSourceCache();
  delete process.env.GHANA_USE_FIXTURES;
  vi.unstubAllGlobals();
});

const ACCRA = { label: "Accra, Greater Accra", latitude: 5.6037, longitude: -0.187, precision: "town" as const };

describe("hazard loading", () => {
  it("keeps an in-polygon GMet alert and leaves GDACS and USGS out of that list", async () => {
    stub((url) => {
      if (url.includes("/api/cap/rss.xml")) return text(rss("https://www.meteo.gov.gh/api/cap/test-active.xml"));
      if (url.includes("/api/cap/test-active.xml")) return text(alertXml("2099-01-01T00:00:00Z", "5.70,-0.30 5.70,-0.05 5.50,-0.05 5.50,-0.30 5.70,-0.30"));
      if (url.includes("earthquake.usgs.gov")) return new Response(null, { status: 204 });
      if (url.includes("gdacs.org")) return json(gdacs());
      return json({}, 404);
    });
    const report = await loadHazards(ACCRA);
    expect(report.alerts).toHaveLength(1);
    expect(report.alerts[0]?.event).toBe("Thunderstorms/Squall lines");
    expect(report.alerts[0]?.relation).toBe("inside");
    expect(report.alerts[0]?.scope).toBe("point");
    expect(report.areaAlerts).toHaveLength(0);
    expect(report.international.map((event) => event.name)).toEqual(["Flood Ghana"]);
    expect(report.alerts.some((alert) => alert.event === "Flood Ghana")).toBe(false);
    expect(report.sources.map((source) => source.id)).toEqual(["gmet", "usgs", "gdacs"]);
    expect(report.sources.map((source) => source.status)).toEqual(["ok", "empty", "ok"]);
    expect(report.regionName).toBe("Greater Accra");
  });

  it("lists a polygon that misses Accra apart from the point", async () => {
    stub((url) => {
      if (url.includes("rss.xml")) return text(rss("https://www.meteo.gov.gh/api/cap/test-north.xml"));
      if (url.includes("test-north.xml")) return text(alertXml("2099-01-01T00:00:00Z", "9.50,-1.00 9.50,-0.70 9.30,-0.70 9.30,-1.00 9.50,-1.00", "Northern"));
      if (url.includes("earthquake.usgs.gov")) return new Response(null, { status: 204 });
      if (url.includes("gdacs.org")) return json({ type: "FeatureCollection", features: [] });
      return json({}, 404);
    });
    const report = await loadHazards(ACCRA);
    expect(report.alerts).toHaveLength(0);
    expect(report.areaAlerts).toHaveLength(1);
    expect(report.areaAlerts[0]?.relation).toBe("outside");
    expect(report.sources.find((source) => source.id === "gmet")?.status).toBe("ok");
  });

  it("does not treat the expired 10 November alert as active", async () => {
    stub((url) => {
      if (url.includes("rss.xml")) return text(rss("https://www.meteo.gov.gh/api/cap/test-old.xml"));
      if (url.includes("test-old.xml")) return text(alertXml("2020-01-01T00:00:00Z", "5.70,-0.30 5.70,-0.05 5.50,-0.05 5.50,-0.30 5.70,-0.30"));
      if (url.includes("earthquake.usgs.gov")) return new Response(null, { status: 204 });
      if (url.includes("gdacs.org")) return json({ type: "FeatureCollection", features: [] });
      return json({}, 404);
    });
    const report = await loadHazards(ACCRA);
    expect(report.alerts).toEqual([]);
    expect(report.areaAlerts).toEqual([]);
    expect(report.expired).toHaveLength(1);
    expect(report.sources.find((source) => source.id === "gmet")?.status).toBe("empty");
  });

  it("does not invent a GMet alert when the feed fails", async () => {
    stub((url) => {
      if (url.includes("rss.xml")) return text("down", 500);
      if (url.includes("earthquake.usgs.gov")) return json(quake());
      if (url.includes("gdacs.org")) return json(gdacs());
      return json({}, 404);
    });
    const report = await loadHazards(ACCRA);
    expect(gmetLists(report)).toEqual([[], [], [], [], []]);
    expect(report.sources.find((source) => source.id === "gmet")).toMatchObject({
      status: "error",
      detail: "The Ghana Meteorological Agency feed could not be checked. No alert was added.",
    });
    expect(report.earthquakes.map((quake) => quake.place)).toEqual(["near Accra, Ghana"]);
    expect(report.international.map((event) => event.name)).toEqual(["Flood Ghana"]);
    expect(report.sources.find((source) => source.id === "usgs")?.status).toBe("ok");
    expect(report.sources.find((source) => source.id === "gdacs")?.status).toBe("ok");
    expect(serialized(report)).not.toContain("Flood Ghana");
    expect(serialized(report)).not.toContain("near Accra");
    expect(serialized(report)).not.toContain("Japan quake");

    clearSourceCache();
    stub((url) => {
      if (url.includes("rss.xml")) return text(rss("https://www.meteo.gov.gh/api/cap/test-broken.xml"));
      if (url.includes("test-broken.xml")) return text("not an alert", 500);
      if (url.includes("earthquake.usgs.gov")) return json(quake());
      if (url.includes("gdacs.org")) return json(gdacs());
      return json({}, 404);
    });
    const again = await loadHazards(ACCRA);
    expect(gmetLists(again)).toEqual([[], [], [], [], []]);
    expect(again.sources.find((source) => source.id === "gmet")?.status).toBe("error");
    expect(again.earthquakes).toHaveLength(1);
    expect(again.international.map((event) => event.name)).toEqual(["Flood Ghana"]);
    expect(serialized(again)).not.toContain("Flood Ghana");
    expect(serialized(again)).not.toContain("near Accra");
  });

  it("sends the Codyza user agent and refuses fixture mode", async () => {
    const seen: string[] = [];
    stub((url, init) => {
      const headers = new Headers(init?.headers);
      seen.push(headers.get("User-Agent") ?? "");
      if (url.includes("rss.xml")) return text(rss("https://www.meteo.gov.gh/api/cap/test-active.xml"));
      if (url.includes("test-active.xml")) return text(alertXml("2099-01-01T00:00:00Z", "5.70,-0.30 5.70,-0.05 5.50,-0.05 5.50,-0.30 5.70,-0.30"));
      if (url.includes("earthquake.usgs.gov")) return new Response(null, { status: 204 });
      return json({ type: "FeatureCollection", features: [] });
    });
    await loadHazards(ACCRA);
    expect(seen.every((agent) => agent === USER_AGENT)).toBe(true);
    process.env.GHANA_USE_FIXTURES = "1";
    clearSourceCache();
    await expect(loadHazards(ACCRA)).rejects.toBeInstanceOf(FixtureRefusedError);
  });
});

function gmetLists(report: Awaited<ReturnType<typeof loadHazards>>) {
  return [report.alerts, report.areaAlerts, report.expired, report.cancellations, report.quarantined];
}

function serialized(report: Awaited<ReturnType<typeof loadHazards>>): string {
  return JSON.stringify(gmetLists(report));
}

function stub(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "application/xml" } });
}

function rss(link: string) {
  return `<?xml version="1.0"?><rss version="2.0"><channel><item><link>${link}</link></item></channel></rss>`;
}

function alertXml(expires: string, polygon: string, area = "Greater Accra") {
  return `<?xml version="1.0"?><cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><cap:identifier>urn:test-active</cap:identifier><cap:status>Actual</cap:status><cap:msgType>Alert</cap:msgType><cap:sent>2026-11-11T12:00:00Z</cap:sent><cap:info><cap:event>Thunderstorms/Squall lines</cap:event><cap:urgency>Immediate</cap:urgency><cap:severity>Severe</cap:severity><cap:certainty>Observed</cap:certainty><cap:effective>2026-11-11T12:00:00Z</cap:effective><cap:expires>${expires}</cap:expires><cap:senderName>Ghana Meteorological Agency</cap:senderName><cap:headline>Test storm</cap:headline><cap:description>Test description</cap:description><cap:instruction>Stay indoors.</cap:instruction><cap:web>https://www.meteo.gov.gh/alerts/test-storm/</cap:web><cap:area><cap:areaDesc>${area}</cap:areaDesc><cap:polygon>${polygon}</cap:polygon></cap:area></cap:info></cap:alert>`;
}

function gdacs() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-0.19, 5.6] },
        properties: { eventid: "1", eventtype: "FL", alertlevel: "Orange", name: "Flood Ghana", country: "Ghana", url: "https://www.gdacs.org/report.aspx?eventid=1" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.7, 35.7] },
        properties: { eventid: "2", eventtype: "EQ", alertlevel: "Red", name: "Japan quake", country: "Japan" },
      },
    ],
  };
}

function quake() {
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "us1000test",
      geometry: { type: "Point", coordinates: [-0.2, 5.55, 10] },
      properties: { mag: 4.2, place: "near Accra, Ghana", time: Date.parse("2026-11-10T00:00:00Z"), type: "earthquake", url: "https://earthquake.usgs.gov/earthquakes/eventpage/us1000test" },
    }],
  };
}
