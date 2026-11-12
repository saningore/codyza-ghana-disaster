import { readFileSync } from "node:fs";
import path from "node:path";
import { GPS_UNRESOLVED, NOT_FOUND } from "@/lib/copy";
import { GeocodeError } from "@/lib/errors";
import { roundCoordinate } from "@/lib/geo";
import type { GeocodeHit, Precision } from "@/lib/types";

export type Place = {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  capital: boolean;
};

const GPS = /^[a-z]{2}-?\d{3,4}-?\d{4}$/i;

let places: Place[] | null = null;

export function loadPlaces(): Place[] {
  if (places) return places;
  const file = path.join(process.cwd(), "data", "places.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Place[];
  places = parsed.filter((place) => place.name && place.region && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  return places;
}

export function suggestionsFor(query: string): GeocodeHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2 || isDigitalAddress(trimmed)) return [];
  const needle = norm(trimmed);
  const hits: GeocodeHit[] = [];
  for (const place of loadPlaces()) {
    if (norm(place.name).includes(needle)) hits.push(townHit(place));
  }
  for (const place of loadPlaces()) {
    if (!place.capital) continue;
    if (norm(place.region).includes(needle)) hits.push(regionHit(place));
  }
  return hits.slice(0, 8);
}

export function resolveQuery(query: string): GeocodeHit {
  const trimmed = query.trim();
  if (!trimmed) throw new GeocodeError("Enter a town, district, or region.");
  if (isDigitalAddress(trimmed)) throw new GeocodeError(GPS_UNRESOLVED);
  const needle = norm(trimmed);
  const list = loadPlaces();
  const exactTown = list.filter((place) => norm(place.name) === needle);
  if (exactTown.length === 1 && exactTown[0]) return townHit(exactTown[0]);
  const exactRegion = list.filter((place) => place.capital && norm(place.region) === needle);
  if (exactRegion.length === 1 && exactRegion[0]) return regionHit(exactRegion[0]);
  const townStarts = list.filter((place) => norm(place.name).startsWith(needle));
  if (townStarts.length === 1 && townStarts[0]) return townHit(townStarts[0]);
  const regionStarts = list.filter((place) => place.capital && norm(place.region).startsWith(needle));
  if (regionStarts.length === 1 && regionStarts[0]) return regionHit(regionStarts[0]);
  throw new GeocodeError(NOT_FOUND);
}

export function isDigitalAddress(value: string): boolean {
  return GPS.test(value.replace(/\s+/g, ""));
}

function townHit(place: Place): GeocodeHit {
  return hit(place, `${place.name}, ${place.region}`, "town");
}

function regionHit(place: Place): GeocodeHit {
  return hit(place, place.region, "region-center");
}

function hit(place: Place, label: string, precision: Precision): GeocodeHit {
  return {
    label,
    latitude: roundCoordinate(place.latitude),
    longitude: roundCoordinate(place.longitude),
    precision,
    region: place.region,
  };
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
