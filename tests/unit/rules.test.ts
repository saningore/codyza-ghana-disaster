import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isLiveCap, locateAlert, namesRegion, parseCapAlert } from "@/lib/cap";
import { GPS_UNRESOLVED, NOT_FOUND } from "@/lib/copy";
import { GeocodeError } from "@/lib/errors";
import { isDigitalAddress, resolveQuery } from "@/lib/geocode";
import { formatModel } from "@/lib/model";
import { isNotifiable, notificationCopy } from "@/lib/monitor";
import { polygonRelation } from "@/lib/polygon";
import { citedRows, helplineGroups, readJson } from "@/lib/records";
import { regionAt } from "@/lib/regions";
import type { OfficialAlert } from "@/lib/types";

const REAL = readFileSync(path.join(process.cwd(), "tests", "fixtures", "gmet-2026-11-10.xml"), "utf8");

describe("GMet CAP record from 10 November 2026", () => {
  const parsed = parseCapAlert(REAL, "https://www.meteo.gov.gh/api/cap/8024612c-2795-41f6-835b-d6bb907feedd.xml");

  it("keeps the official identifier, severity, expiry, and instruction", () => {
    expect(parsed.id).toBe("urn:oid:2.49.0.1.288.2023.2026.11.10.14.48.0");
    expect(parsed.status).toBe("Actual");
    expect(parsed.messageType).toBe("Alert");
    expect(parsed.severity).toBe("Moderate");
    expect(parsed.event).toBe("Thunderstorms/Squall lines");
    expect(parsed.expires).toBe("2026-11-10T20:00:00+00:00");
    expect(parsed.instruction).toContain("NADMO");
    expect(parsed.instruction).toContain("112");
    expect(parsed.headline).toBe("Weather Update over Southern Ghana");
    expect(parsed.areaDesc).toContain("Volta");
    expect(parsed.geometry?.type === "Polygon" || parsed.geometry?.type === "MultiPolygon").toBe(true);
  });

  it("is not active on 11 November 2026", () => {
    expect(isLiveCap(parsed, Date.parse("2026-11-11T12:00:00Z"))).toBe(false);
    expect(isLiveCap(parsed, Date.parse("2026-11-10T15:00:00Z"))).toBe(true);
  });

  it("treats a polygon vertex as inside and Wa as outside", () => {
    const ring = parsed.geometry?.type === "Polygon"
      ? parsed.geometry.coordinates[0]
      : parsed.geometry?.type === "MultiPolygon"
        ? parsed.geometry.coordinates[0]?.[0]
        : null;
    const vertex = ring?.[0];
    expect(vertex).toBeTruthy();
    expect(polygonRelation(parsed.geometry, vertex![1], vertex![0])).toBe("inside");
    expect(polygonRelation(parsed.geometry, 10.0601, -2.5099)).toBe("outside");
  });
});

describe("area names and notifications", () => {
  it("matches a region only as a whole area name", () => {
    expect(namesRegion("Volta; Greater Accra", "Volta")).toBe(true);
    expect(namesRegion("Northern and Forest Areas", "Northern")).toBe(false);
    expect(namesRegion("North East", "Northern")).toBe(false);
  });

  it("notifies for Severe and Extreme at the point, and not for Moderate unless asked", () => {
    const severe = alert({ severity: "Severe", scope: "point" });
    const moderate = alert({ severity: "Moderate", scope: "point" });
    const outside = alert({ severity: "Extreme", scope: "area" });
    expect(isNotifiable(severe, false)).toBe(true);
    expect(isNotifiable(moderate, false)).toBe(false);
    expect(isNotifiable(moderate, true)).toBe(true);
    expect(isNotifiable(outside, true)).toBe(false);
    expect(notificationCopy(severe).title).toBe("Weather Update over Southern Ghana");
    expect(notificationCopy(severe).body).toContain("not a cell broadcast");
    expect(notificationCopy(severe).body).toContain("Severe");
  });
});

describe("places", () => {
  it("resolves Accra and a region, and refuses a GhanaPostGPS code", () => {
    expect(resolveQuery("Accra").precision).toBe("town");
    expect(resolveQuery("Greater Accra").precision).toBe("region-center");
    expect(resolveQuery("Wa").region).toBe("Upper West");
    expect(isDigitalAddress("GA-183-8164")).toBe(true);
    expect(() => resolveQuery("GA-183-8164")).toThrow(new GeocodeError(GPS_UNRESOLVED));
    expect(() => resolveQuery("zzzznotaplace")).toThrow(new GeocodeError(NOT_FOUND));
  });

  it("names Accra and Wa from the region outlines", () => {
    expect(regionAt(5.6037, -0.187)?.name).toBe("Greater Accra");
    expect(regionAt(10.0601, -2.5099)?.name).toBe("Upper West");
    expect(regionAt(0, 0)).toBeNull();
  });
});

describe("cited pages", () => {
  it("requires an https source on every helpline group and history row", () => {
    const groups = helplineGroups(readJson("helplines.json"));
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.sourceUrl.startsWith("https://")).toBe(true);
      expect(group.lines.length).toBeGreaterThan(0);
    }
    const numbers = groups.flatMap((group) => group.lines.map((line) => line.number));
    expect(numbers).toContain("112");
    expect(numbers).toContain("191");
    expect(numbers.join(" ")).not.toContain("0291 913 077");
    const history = citedRows(readJson("history.json"));
    expect(history[0]?.sourceUrl).toContain("gna.org.gh");
    expect(citedRows([{ title: "Untitled count", summary: "9" }])).toEqual([]);
    expect(citedRows(readJson("situation.json"))).toEqual([]);
  });
});

describe("model forecast", () => {
  it("copies numbers that are present and skips numbers that are not", () => {
    expect(formatModel({ current: { temperature_2m: 29.5 } })).toEqual([{ label: "Temperature", value: "29.5 °C" }]);
    expect(formatModel({ current: {} })).toEqual([]);
  });
});

function alert(overrides: Partial<OfficialAlert>): OfficialAlert {
  return {
    id: "urn:test",
    event: "Thunderstorms/Squall lines",
    severity: "Severe",
    urgency: "Immediate",
    certainty: "Observed",
    areaDesc: "Greater Accra",
    effective: null,
    expires: null,
    sent: null,
    instruction: "Stay indoors.",
    description: null,
    headline: "Weather Update over Southern Ghana",
    senderName: "Ghana Meteorological Agency",
    messageType: "Alert",
    status: "Actual",
    web: null,
    officialUrl: null,
    geometry: null,
    relation: "inside",
    relationChecked: true,
    scope: "point",
    group: "Thunderstorm",
    ...overrides,
  };
}

describe("synthetic polygon placement", () => {
  it("puts Accra inside a Greater Accra polygon and leaves a Tamale polygon outside", () => {
    const inside = locateAlert(parseCapAlert(boxAlert("5.70,-0.30 5.70,-0.05 5.50,-0.05 5.50,-0.30 5.70,-0.30", "Greater Accra")), { latitude: 5.6037, longitude: -0.187 }, "Greater Accra");
    expect(inside.scope).toBe("point");
    expect(inside.relation).toBe("inside");
    const outside = locateAlert(parseCapAlert(boxAlert("9.50,-1.00 9.50,-0.70 9.30,-0.70 9.30,-1.00 9.50,-1.00", "Northern")), { latitude: 5.6037, longitude: -0.187 }, "Greater Accra");
    expect(outside.scope).toBe("area");
    expect(outside.relation).toBe("outside");
  });
});

function boxAlert(polygon: string, area: string): string {
  return `<?xml version="1.0"?><cap:alert xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><cap:identifier>urn:test</cap:identifier><cap:status>Actual</cap:status><cap:msgType>Alert</cap:msgType><cap:info><cap:event>Thunderstorms/Squall lines</cap:event><cap:severity>Severe</cap:severity><cap:headline>Test</cap:headline><cap:area><cap:areaDesc>${area}</cap:areaDesc><cap:polygon>${polygon}</cap:polygon></cap:area></cap:info></cap:alert>`;
}
