import { readFileSync } from "node:fs";
import path from "node:path";
import { polygonRelation } from "@/lib/polygon";

export type RegionShape = {
  name: string;
  geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
};

let shapes: RegionShape[] | null = null;

export function loadRegions(): RegionShape[] {
  if (shapes) return shapes;
  const file = path.join(process.cwd(), "data", "regions.geojson");
  const collection = JSON.parse(readFileSync(file, "utf8")) as {
    features?: Array<{ properties?: { shapeName?: string }; geometry?: RegionShape["geometry"] }>;
  };
  shapes = (collection.features ?? []).flatMap((feature) => {
    const name = feature.properties?.shapeName?.replace(/ Region$/, "").trim();
    const geometry = feature.geometry;
    if (!name || !geometry) return [];
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return [];
    return [{ name, geometry }];
  });
  return shapes;
}

export function regionAt(latitude: number, longitude: number): RegionShape | null {
  const matches = loadRegions().filter((region) => polygonRelation(region.geometry, latitude, longitude) === "inside");
  if (!matches.length) return null;
  matches.sort((left, right) => ringCount(left) - ringCount(right));
  return matches[0] ?? null;
}

function ringCount(region: RegionShape): number {
  if (region.geometry.type === "Polygon") return region.geometry.coordinates[0]?.length ?? 0;
  return region.geometry.coordinates.reduce((sum, polygon) => sum + (polygon[0]?.length ?? 0), 0);
}
