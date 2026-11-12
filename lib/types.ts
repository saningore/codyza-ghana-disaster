export const USER_AGENT = "GhanaDisaster/1.0 (https://ghanadisaster.com; https://codyza.com)";

export const TIME_ZONE = "Africa/Accra";

export const GMET_ALERTS_PAGE = "https://www.meteo.gov.gh/alerts/";

export const GMET_PRODUCTS_PAGE = "https://www.meteo.gov.gh/product/";

export const CAP_FEED = "https://www.meteo.gov.gh/api/cap/rss.xml";

export type Precision = "town" | "region-center" | "device" | "network";

export type SourceId = "gmet" | "usgs" | "gdacs";

export type SourceState = "ok" | "empty" | "error";

export type PolygonRelation = "inside" | "outside" | "none";

export type AlertScope = "point" | "area" | "named";

export type HazardGroup = "Thunderstorm" | "Flood" | "Marine" | "Other";

export type OfficialGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type OfficialAlert = {
  id: string | null;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  areaDesc: string | null;
  effective: string | null;
  expires: string | null;
  sent: string | null;
  instruction: string | null;
  description: string | null;
  headline: string | null;
  senderName: string | null;
  messageType: string | null;
  status: string | null;
  web: string | null;
  officialUrl: string | null;
  geometry: OfficialGeometry | null;
  relation: PolygonRelation;
  relationChecked: boolean;
  scope: AlertScope;
  group: HazardGroup;
};

export type Earthquake = {
  id: string;
  magnitude: number | null;
  magType: string | null;
  place: string | null;
  time: string | null;
  depthKm: number | null;
  latitude: number;
  longitude: number;
  url: string | null;
  distanceKm: number;
};

export type InternationalEvent = {
  id: string;
  name: string | null;
  eventType: string | null;
  alertLevel: string | null;
  country: string | null;
  fromDate: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type SourceReport = {
  id: SourceId;
  name: string;
  status: SourceState;
  retrievedAt: string;
  detail: string;
};

export type HazardReport = {
  origin: {
    label: string;
    latitude: number;
    longitude: number;
    precision: Precision;
  };
  regionName: string | null;
  regionNote: string | null;
  timeZone: string;
  retrievedAt: string;
  alerts: OfficialAlert[];
  areaAlerts: OfficialAlert[];
  expired: OfficialAlert[];
  cancellations: OfficialAlert[];
  quarantined: OfficialAlert[];
  earthquakes: Earthquake[];
  earthquakesOmitted: number;
  international: InternationalEvent[];
  sources: SourceReport[];
  alertsPage: string;
  forecastPage: string;
  earthquakeWindow: {
    radiusKm: number;
    days: number;
    minMagnitude: number;
  };
};

export type GeocodeHit = {
  label: string;
  latitude: number;
  longitude: number;
  precision: Precision;
  region: string | null;
};

export type NationalAlert = {
  id: string;
  headline: string | null;
  event: string | null;
  severity: string | null;
  expires: string | null;
};

export type NationalStatus =
  | { ok: true; checkedAt: string; active: NationalAlert[] }
  | { ok: false; checkedAt: string; message: string };

export const EARTHQUAKE_WINDOW = {
  radiusKm: 300,
  days: 7,
  minMagnitude: 2.5,
} as const;

export const SEVERITY_RANK: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};
