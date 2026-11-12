import { compareAlerts, isLiveCap, locateAlert, type ParsedCap } from "@/lib/cap";
import { loadCapAlerts } from "@/lib/cap-feed";
import {
  GDACS_EMPTY,
  GDACS_UNCHECKED,
  GMET_EMPTY,
  GMET_UNCHECKED,
  USGS_EMPTY,
  USGS_UNCHECKED,
} from "@/lib/copy";
import { gdacsEvents } from "@/lib/gdacs";
import { regionAt } from "@/lib/regions";
import { simplifyGeometry } from "@/lib/polygon";
import { usgsEarthquakes } from "@/lib/usgs";
import {
  EARTHQUAKE_WINDOW,
  GMET_ALERTS_PAGE,
  GMET_PRODUCTS_PAGE,
  TIME_ZONE,
  type HazardReport,
  type OfficialAlert,
  type Precision,
  type SourceReport,
} from "@/lib/types";

export async function loadHazards(input: {
  label: string;
  latitude: number;
  longitude: number;
  precision: Precision;
}): Promise<HazardReport> {
  const retrievedAt = new Date().toISOString();
  const now = Date.parse(retrievedAt);
  const region = regionAt(input.latitude, input.longitude);
  const [caps, quakes, international] = await Promise.all([
    loadCapAlerts(),
    usgsEarthquakes(input.latitude, input.longitude),
    gdacsEvents(input.latitude, input.longitude),
  ]);
  const point = { latitude: input.latitude, longitude: input.longitude };
  const partitioned = caps.ok
    ? partition(caps.alerts, now, point, region?.name ?? null)
    : { alerts: [], areaAlerts: [], expired: [], cancellations: [], quarantined: [] };

  return {
    origin: input,
    regionName: region?.name ?? null,
    regionNote: region
      ? `Region context, not an alert: ${region.name}. The outline is geoBoundaries ADM1, built from OpenStreetMap in 2021. It is not a warning polygon.`
      : "This point is outside the geoBoundaries region outlines, so no region name was added.",
    timeZone: TIME_ZONE,
    retrievedAt,
    alerts: partitioned.alerts,
    areaAlerts: partitioned.areaAlerts,
    expired: partitioned.expired,
    cancellations: partitioned.cancellations,
    quarantined: partitioned.quarantined,
    earthquakes: quakes.ok ? quakes.earthquakes : [],
    earthquakesOmitted: quakes.ok ? quakes.omitted : 0,
    international: international.ok ? international.events : [],
    sources: [
      gmetSource(caps, partitioned, retrievedAt),
      quakeSource(quakes, retrievedAt),
      gdacsSource(international, retrievedAt),
    ],
    alertsPage: GMET_ALERTS_PAGE,
    forecastPage: GMET_PRODUCTS_PAGE,
    earthquakeWindow: { ...EARTHQUAKE_WINDOW },
  };
}

export async function loadAlert(id: string): Promise<OfficialAlert | null> {
  const caps = await loadCapAlerts();
  if (!caps.ok) return null;
  const found = caps.alerts.find((alert) => alert.id === id);
  if (!found) return null;
  const official = locateAlert(found, null, null);
  official.geometry = simplifyGeometry(found.geometry, 24);
  return official;
}

function partition(
  alerts: ParsedCap[],
  now: number,
  point: { latitude: number; longitude: number },
  regionName: string | null,
) {
  const active: OfficialAlert[] = [];
  const area: OfficialAlert[] = [];
  const expired: OfficialAlert[] = [];
  const cancellations: OfficialAlert[] = [];
  const quarantined: OfficialAlert[] = [];
  for (const alert of alerts) {
    const official = locateAlert(alert, point, regionName);
    official.geometry = simplifyGeometry(alert.geometry);
    const type = (alert.messageType ?? "").toLowerCase();
    const status = (alert.status ?? "").toLowerCase();
    if (type === "cancel") {
      cancellations.push(official);
      continue;
    }
    if (status !== "actual" || (type !== "alert" && type !== "update")) {
      quarantined.push(official);
      continue;
    }
    if (!isLiveCap(alert, now)) {
      official.geometry = null;
      expired.push(official);
      continue;
    }
    if (official.scope === "area") area.push(official);
    else active.push(official);
  }
  active.sort(compareAlerts);
  area.sort(compareAlerts);
  expired.sort((left, right) => Date.parse(right.expires ?? "") - Date.parse(left.expires ?? ""));
  return {
    alerts: active,
    areaAlerts: area,
    expired: expired.slice(0, 8),
    cancellations,
    quarantined,
  };
}

function gmetSource(
  caps: { ok: true; alerts: ParsedCap[] } | { ok: false; message: string },
  partitioned: { alerts: OfficialAlert[]; areaAlerts: OfficialAlert[]; expired: OfficialAlert[] },
  retrievedAt: string,
): SourceReport {
  if (!caps.ok) {
    return { id: "gmet", name: "Ghana Meteorological Agency", status: "error", retrievedAt, detail: caps.message || GMET_UNCHECKED };
  }
  const live = partitioned.alerts.length + partitioned.areaAlerts.length;
  if (!live) {
    const expired = partitioned.expired.length
      ? `${GMET_EMPTY} Expired alerts from the feed are listed separately.`
      : GMET_EMPTY;
    return { id: "gmet", name: "Ghana Meteorological Agency", status: "empty", retrievedAt, detail: expired };
  }
  return {
    id: "gmet",
    name: "Ghana Meteorological Agency",
    status: "ok",
    retrievedAt,
    detail: "Active alerts were returned by the Ghana Meteorological Agency.",
  };
}

function quakeSource(
  quakes: { ok: true; earthquakes: unknown[] } | { ok: false; message: string },
  retrievedAt: string,
): SourceReport {
  if (!quakes.ok) {
    return { id: "usgs", name: "U.S. Geological Survey", status: "error", retrievedAt, detail: quakes.message || USGS_UNCHECKED };
  }
  if (!quakes.earthquakes.length) {
    return { id: "usgs", name: "U.S. Geological Survey", status: "empty", retrievedAt, detail: USGS_EMPTY };
  }
  return {
    id: "usgs",
    name: "U.S. Geological Survey",
    status: "ok",
    retrievedAt,
    detail: "USGS returned recorded earthquakes for this radius and time window. A catalog entry is not a warning.",
  };
}

function gdacsSource(
  events: { ok: true; events: unknown[] } | { ok: false; message: string },
  retrievedAt: string,
): SourceReport {
  if (!events.ok) {
    return { id: "gdacs", name: "GDACS", status: "error", retrievedAt, detail: events.message || GDACS_UNCHECKED };
  }
  if (!events.events.length) {
    return { id: "gdacs", name: "GDACS", status: "empty", retrievedAt, detail: GDACS_EMPTY };
  }
  return {
    id: "gdacs",
    name: "GDACS",
    status: "ok",
    retrievedAt,
    detail: "GDACS returned an event that meets the Ghana filter. This is not a Ghana Meteorological Agency warning.",
  };
}
