"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { GeolocateControl, Map as MapLibreMap } from "maplibre-gl";
import { alertCollection, quakeCollection } from "@/lib/map-data";
import type { HazardReport } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  Extreme: "#7f1d1d",
  Severe: "#9a3412",
  Moderate: "#854d0e",
  Minor: "#1e3a8a",
  Unknown: "#334155",
};

const GHANA_CENTER: [number, number] = [-1.02, 7.95];

export type MapFix = {
  latitude: number;
  longitude: number;
};

export type HazardMapHandle = {
  locate: () => Promise<boolean>;
  show: (fix: MapFix) => void;
};

export default forwardRef<HazardMapHandle, {
  report: HazardReport | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDeviceLocation: (fix: MapFix) => void;
  onDeviceError: (code: number) => void;
  onOutsideGhana: () => void;
}>(function HazardMap({
  report,
  activeId,
  onSelect,
  onDeviceLocation,
  onDeviceError,
  onOutsideGhana,
}, ref) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geolocateRef = useRef<GeolocateControl | null>(null);
  const reportRef = useRef(report);
  const activeRef = useRef(activeId);
  const onSelectRef = useRef(onSelect);
  const onDeviceRef = useRef(onDeviceLocation);
  const onErrorRef = useRef(onDeviceError);
  const onOutsideRef = useRef(onOutsideGhana);
  const readyRef = useRef(false);
  const pendingShow = useRef<MapFix | null>(null);
  const originKey = useRef("");
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  reportRef.current = report;
  activeRef.current = activeId;
  onSelectRef.current = onSelect;
  onDeviceRef.current = onDeviceLocation;
  onErrorRef.current = onDeviceError;
  onOutsideRef.current = onOutsideGhana;

  useImperativeHandle(ref, () => ({
    locate() {
      return new Promise((resolve) => {
        const started = Date.now();
        const attempt = () => {
          const control = geolocateRef.current;
          if (control?.trigger()) {
            resolve(true);
            return;
          }
          if (Date.now() - started > 8_000) {
            resolve(false);
            return;
          }
          window.setTimeout(attempt, 100);
        };
        attempt();
      });
    },
    show(fix) {
      const map = mapRef.current;
      if (!map || !readyRef.current) {
        pendingShow.current = fix;
        return;
      }
      pendingShow.current = null;
      map.flyTo({ center: [fix.longitude, fix.latitude], zoom: Math.max(map.getZoom(), 12) });
    },
  }), []);

  useEffect(() => {
    let map: MapLibreMap | undefined;
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibregl.setWorkerUrl(`/api/maplibre-worker?v=${maplibregl.getVersion()}`);
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: GHANA_CENTER,
        zoom: 5.4,
        maxBounds: [[-3.5, 4.3], [1.5, 11.4]],
      });
      mapRef.current = map;
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
        showUserLocation: true,
        showAccuracyCircle: true,
        trackUserLocation: false,
        zoomToUserAccuracy: true,
        fitBoundsOptions: { maxZoom: 14 },
      });
      geolocateRef.current = geolocate;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(geolocate, "top-right");
      geolocate.on("geolocate", (event) => {
        onDeviceRef.current({
          latitude: event.coords.latitude,
          longitude: event.coords.longitude,
        });
      });
      geolocate.on("error", (event) => {
        onErrorRef.current(event.code ?? 2);
      });
      geolocate.on("outofmaxbounds", () => {
        onOutsideRef.current();
      });
      map.on("load", () => {
        if (!map) return;
        const current = reportRef.current;
        if (current) drawReport(map, current, activeRef.current, onSelectRef);
        readyRef.current = true;
        setReady(true);
        const waiting = pendingShow.current;
        if (waiting) {
          pendingShow.current = null;
          map.flyTo({ center: [waiting.longitude, waiting.latitude], zoom: 12 });
        }
      });
      map.on("error", () => setMapError("The map could not be loaded. The text results above are the check."));
    })().catch(() => setMapError("The map could not be loaded. The text results above are the check."));
    return () => {
      cancelled = true;
      readyRef.current = false;
      geolocateRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !report) return;
    drawReport(map, report, activeId, onSelectRef);
    const key = `${report.origin.latitude.toFixed(5)},${report.origin.longitude.toFixed(5)},${report.origin.precision}`;
    if (originKey.current === key) return;
    originKey.current = key;
    const zoom = report.origin.precision === "device" ? Math.max(map.getZoom(), 12) : 7;
    map.easeTo({ center: [report.origin.longitude, report.origin.latitude], zoom, duration: 0 });
  }, [report, activeId, ready]);

  return (
    <div>
      <div
        ref={container}
        data-map-ready={ready ? "true" : "false"}
        className="h-80 overflow-hidden rounded-3xl border border-line bg-moss sm:h-[28rem]"
      />
      {mapError ? <p className="mt-2 text-sm font-bold">{mapError}</p> : null}
      <p className="mt-2 text-xs text-ink/70">
        Use my location asks this map for your device position and moves the map to it. The blue dot is that position. The red point is the place you checked. Polygons are GMet alert shapes. Dark circles are USGS earthquakes.
      </p>
    </div>
  );
});

function drawReport(
  map: MapLibreMap,
  report: HazardReport,
  activeId: string | null,
  onSelectRef: { current: (id: string) => void },
) {
  const alerts = alertCollection([...report.alerts, ...report.areaAlerts], activeId) as GeoJSON.FeatureCollection;
  const quakes = quakeCollection(report.earthquakes) as GeoJSON.FeatureCollection;
  const origin: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [report.origin.longitude, report.origin.latitude] },
      properties: {},
    }],
  };
  const alertSource = map.getSource("alerts") as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
  if (!alertSource) {
    map.addSource("alerts", { type: "geojson", data: alerts });
    map.addSource("quakes", { type: "geojson", data: quakes });
    map.addSource("origin", { type: "geojson", data: origin });
    map.addLayer({
      id: "alert-fill",
      type: "fill",
      source: "alerts",
      paint: {
        "fill-color": ["match", ["get", "severity"], "Extreme", SEVERITY_COLOR.Extreme, "Severe", SEVERITY_COLOR.Severe, "Moderate", SEVERITY_COLOR.Moderate, "Minor", SEVERITY_COLOR.Minor, SEVERITY_COLOR.Unknown],
        "fill-opacity": ["case", ["==", ["get", "scope"], "area"], 0.16, 0.38],
      },
    });
    map.addLayer({
      id: "alert-line",
      type: "line",
      source: "alerts",
      paint: {
        "line-color": ["match", ["get", "severity"], "Extreme", SEVERITY_COLOR.Extreme, "Severe", SEVERITY_COLOR.Severe, "Moderate", SEVERITY_COLOR.Moderate, "Minor", SEVERITY_COLOR.Minor, SEVERITY_COLOR.Unknown],
        "line-width": 2,
      },
    });
    map.addLayer({
      id: "quake-circle",
      type: "circle",
      source: "quakes",
      paint: {
        "circle-radius": 6,
        "circle-color": "#14324f",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fffdf8",
      },
    });
    map.addLayer({
      id: "origin-circle",
      type: "circle",
      source: "origin",
      paint: {
        "circle-radius": 7,
        "circle-color": "#8f1d2c",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fffdf8",
      },
    });
    map.on("click", "alert-fill", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectRef.current(id);
    });
    return;
  }
  alertSource.setData?.(alerts);
  (map.getSource("quakes") as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined)?.setData?.(quakes);
  (map.getSource("origin") as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined)?.setData?.(origin);
}
