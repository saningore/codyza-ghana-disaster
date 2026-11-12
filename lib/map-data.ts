import { samePoint } from "@/lib/browser-store";
import type { Earthquake, OfficialAlert, Precision } from "@/lib/types";

export type SavedLocation = {
  label: string;
  latitude: number;
  longitude: number;
  precision: Precision;
  notify: boolean;
  notifyModerate: boolean;
};

export function rememberLocation(saved: SavedLocation[], next: SavedLocation): SavedLocation[] {
  const without = saved.filter((item) => !samePoint(item, next));
  return [next, ...without].slice(0, 5);
}

export function alertCollection(alerts: OfficialAlert[], activeId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: alerts.flatMap((alert) => {
      if (!alert.geometry || !alert.id) return [];
      return [{
        type: "Feature" as const,
        geometry: alert.geometry,
        properties: {
          id: alert.id,
          severity: alert.severity ?? "Unknown",
          scope: alert.scope,
          active: alert.id === activeId,
        },
      }];
    }),
  };
}

export function quakeCollection(earthquakes: Earthquake[]) {
  return {
    type: "FeatureCollection" as const,
    features: earthquakes.map((quake) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [quake.longitude, quake.latitude] },
      properties: { mag: quake.magnitude ?? 0, id: quake.id },
    })),
  };
}
