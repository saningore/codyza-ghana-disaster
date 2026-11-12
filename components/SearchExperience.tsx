"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AlertList from "@/components/AlertList";
import HazardMap, { type HazardMapHandle } from "@/components/HazardMap";
import SourceStatus from "@/components/SourceStatus";
import SupplementaryPanels from "@/components/SupplementaryPanels";
import { readOfflineReport, readRecentReport, readSeenIds, samePoint, storeReport, writeSeenIds } from "@/lib/browser-store";
import { inGhana } from "@/lib/geo";
import { canRequestDeviceLocation } from "@/lib/locate";
import { NOTIFY_NOTE, NO_GUARANTEE, OFFLINE_COPY, precisionNote } from "@/lib/copy";
import { rememberLocation, type SavedLocation } from "@/lib/map-data";
import { notificationCopy, rememberSeen, unseenNotifiable } from "@/lib/monitor";
import { formatOfficialTime } from "@/lib/time";
import type { GeocodeHit, HazardReport, NationalStatus, OfficialAlert, Precision } from "@/lib/types";

const SAVED_KEY = "ghanadisaster.saved";

export type InitialQuery = {
  lat: number;
  lon: number;
  label: string;
  precision: Precision;
};

export default function SearchExperience({ initial }: { initial: InitialQuery | null }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initial?.label ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [refreshNote, setRefreshNote] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [notifyNote, setNotifyNote] = useState("");
  const [report, setReport] = useState<HazardReport | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLocation[]>([]);
  const [national, setNational] = useState<NationalStatus | null>(null);
  const [moderate, setModerate] = useState(false);
  const requestId = useRef(0);
  const mapRef = useRef<HazardMapHandle>(null);
  const started = useRef(false);
  const reportRef = useRef<HazardReport | null>(null);
  const savedRef = useRef<SavedLocation[]>([]);
  const seenRef = useRef<string[]>([]);
  const initialized = useRef(new Set<string>());
  reportRef.current = report;
  savedRef.current = saved;

  const loadHazards = useCallback(async (hit: Pick<GeocodeHit, "label" | "latitude" | "longitude" | "precision">, reason: "search" | "refresh") => {
    const id = ++requestId.current;
    if (reason === "search") {
      const recent = readRecentReport(hit);
      if (recent) {
        setReport(recent);
        setFromCache(false);
        setError("");
        setLoading(false);
        setLocating(false);
        replaceUrl(hit);
        return;
      }
      setLoading(true);
      setError("");
      setRefreshNote("");
      setFromCache(false);
      setActiveId(null);
    }
    const params = new URLSearchParams({
      lat: String(hit.latitude),
      lon: String(hit.longitude),
      label: hit.label,
      precision: hit.precision,
    });
    try {
      const response = await fetch(`/api/hazards?${params.toString()}`);
      const body = await response.json() as HazardReport & { error?: string };
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(body.error || "Hazard information could not be loaded.");
      setReport(body);
      setFromCache(false);
      storeReport(body);
      observe(body);
      if (reason === "search") replaceUrl(hit);
      setRefreshNote("");
    } catch (cause) {
      if (id !== requestId.current) return;
      const message = cause instanceof Error ? cause.message : "Hazard information could not be loaded.";
      const cached = readOfflineReport(hit);
      if (reason === "refresh" && reportRef.current) {
        setFromCache(true);
        setRefreshNote(`Could not refresh. Showing results retrieved at ${formatOfficialTime(reportRef.current.retrievedAt, reportRef.current.timeZone) ?? reportRef.current.retrievedAt}. ${OFFLINE_COPY}`);
      } else if (cached) {
        setReport(cached);
        setFromCache(true);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLocating(false);
      }
    }

    function replaceUrl(place: { label: string; latitude: number; longitude: number; precision: Precision }) {
      const next = `/?${new URLSearchParams({
        lat: String(place.latitude),
        lon: String(place.longitude),
        label: place.label,
        precision: place.precision,
      }).toString()}`;
      if (`${window.location.pathname}${window.location.search}` !== next) {
        router.replace(next, { scroll: false });
      }
    }

    function observe(body: HazardReport) {
      const watched = savedRef.current.find((item) => item.notify && samePoint(item, body.origin));
      if (!watched) return;
      const key = `${body.origin.latitude.toFixed(5)},${body.origin.longitude.toFixed(5)}`;
      if (!initialized.current.has(key)) {
        initialized.current.add(key);
        seenRef.current = rememberSeen(seenRef.current, body.alerts, watched.notifyModerate);
        writeSeenIds(seenRef.current);
        postWatch();
        return;
      }
      const fresh = unseenNotifiable(body.alerts, seenRef.current, watched.notifyModerate);
      seenRef.current = rememberSeen(seenRef.current, body.alerts, watched.notifyModerate);
      writeSeenIds(seenRef.current);
      postWatch();
      for (const alert of fresh) void showNotification(alert, body.origin);
    }
  }, [router]);

  useEffect(() => {
    if (started.current || !initial) return;
    started.current = true;
    void loadHazards({
      label: initial.label,
      latitude: initial.lat,
      longitude: initial.lon,
      precision: initial.precision,
    }, "search");
  }, [initial, loadHazards]);

  useEffect(() => {
    void fetch("/api/national").then(async (response) => {
      if (!response.ok) {
        setNational({ ok: false, checkedAt: new Date().toISOString(), message: "The Ghana Meteorological Agency feed could not be checked. No alert was added." });
        return;
      }
      setNational(await response.json() as NationalStatus);
    }).catch(() => {
      setNational({ ok: false, checkedAt: new Date().toISOString(), message: "The Ghana Meteorological Agency feed could not be checked. No alert was added." });
    });
  }, []);

  useEffect(() => {
    if (!report) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadHazards(report.origin, "refresh");
    }, 120_000);
    return () => window.clearInterval(timer);
  }, [report, loadHazards]);

  useEffect(() => {
    seenRef.current = readSeenIds();
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]") as SavedLocation[];
      if (Array.isArray(parsed)) setSaved(parsed.slice(0, 5));
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/geocode?suggest=1&q=${encodeURIComponent(trimmed)}`);
      if (!response.ok) return;
      const body = await response.json() as { suggestions?: GeocodeHit[] };
      setSuggestions(body.suggestions ?? []);
      setOpen(true);
      setActive(-1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setOpen(false);
    setError("");
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
    const body = await response.json() as GeocodeHit & { error?: string };
    if (!response.ok) {
      setError(body.error || "That location could not be found. Try a town, a district, or device location.");
      return;
    }
    await loadHazards(body, "search");
  }

  function choose(hit: GeocodeHit) {
    setQuery(hit.label);
    setOpen(false);
    void loadHazards(hit, "search");
  }

  function acceptDeviceFix(fix: { latitude: number; longitude: number }) {
    if (!inGhana(fix.latitude, fix.longitude)) {
      setLocating(false);
      setError("That point is outside Ghana. Enter a town or region.");
      return;
    }
    void loadHazards({
      label: "Device location",
      latitude: fix.latitude,
      longitude: fix.longitude,
      precision: "device",
    }, "search");
  }

  function onDeviceError(code: number) {
    if (code === 1) {
      setLocating(false);
      setError("Location permission was denied. Enter a town or region.");
      return;
    }
    void locateFromNetwork();
  }

  function locate() {
    setError("");
    const allowed = canRequestDeviceLocation(
      window.isSecureContext,
      window.location.hostname,
      "geolocation" in navigator,
    );
    if (!allowed) {
      void locateFromNetwork();
      return;
    }
    setLocating(true);
    void (async () => {
      const usedMap = await mapRef.current?.locate();
      if (usedMap) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const fix = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          mapRef.current?.show(fix);
          acceptDeviceFix(fix);
        },
        (failure) => onDeviceError(failure.code),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      );
    })();
  }

  async function locateFromNetwork() {
    setLocating(true);
    setError("");
    try {
      const response = await fetch("/api/network-location");
      const body = await response.json() as GeocodeHit & { error?: string };
      if (!response.ok || body.precision !== "network") {
        setLocating(false);
        setError(body.error || "Your location could not be determined. Enter a town or region.");
        return;
      }
      await loadHazards(body, "search");
    } catch {
      setLocating(false);
      setError("Your location could not be determined. Enter a town or region.");
    }
  }

  function persistSaved(next: SavedLocation[]) {
    setSaved(next);
    savedRef.current = next;
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    postWatch(next);
  }

  function saveLocation() {
    if (!report) return;
    const current = saved.find((item) => samePoint(item, report.origin));
    persistSaved(rememberLocation(saved, {
      ...report.origin,
      notify: current?.notify ?? false,
      notifyModerate: current?.notifyModerate ?? false,
    }));
  }

  async function toggleNotify() {
    if (!report) return;
    const current = saved.find((item) => samePoint(item, report.origin));
    if (current?.notify) {
      persistSaved(saved.map((item) => samePoint(item, report.origin) ? { ...item, notify: false, notifyModerate: false } : item));
      setNotifyNote("Notifications are off for this location.");
      setModerate(false);
      return;
    }
    if (!("Notification" in window)) {
      setNotifyNote("This browser does not support notifications. The page still checks while it is open.");
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      setNotifyNote("Notification permission was denied. GhanaDisaster will not send a browser notification.");
      return;
    }
    const next = rememberLocation(saved, { ...report.origin, notify: true, notifyModerate: moderate });
    const key = `${report.origin.latitude.toFixed(5)},${report.origin.longitude.toFixed(5)}`;
    initialized.current.add(key);
    seenRef.current = rememberSeen(seenRef.current, report.alerts, moderate);
    writeSeenIds(seenRef.current);
    persistSaved(next);
    setNotifyNote("Notifications are on while this page is open. Current matching alerts are marked as seen. This is not a cell broadcast.");
  }

  function postWatch(list = savedRef.current) {
    const locations = list.filter((item) => item.notify).slice(0, 5);
    navigator.serviceWorker?.ready.then((registration) => {
      registration.active?.postMessage({ type: "watch", locations, seen: seenRef.current });
    }).catch(() => undefined);
  }

  const watching = report ? saved.some((item) => item.notify && samePoint(item, report.origin)) : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-line bg-card p-5 sm:p-8">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Know hazards around your location</h1>
        <p className="mt-3 max-w-3xl text-lg">Check a town or one of Ghana&apos;s 16 regions. Active weather warnings come from the Ghana Meteorological Agency. Earthquake records and GDACS events are shown separately.</p>
        <p className="mt-2 max-w-3xl text-sm text-ink/80">The gazetteer is major towns and regional capitals. It does not include every district, and it does not resolve a GhanaPostGPS code.</p>
        <NationalStrip national={national} />
        <form className="mt-6" role="search" onSubmit={onSubmit}>
          <label className="font-bold" htmlFor="place">Town, district, or region</label>
          <div className="mt-2 flex flex-col gap-3">
            <div className="relative min-w-0">
              <input
                id="place"
                className="min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                value={query}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (!open || !suggestions.length) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((index) => Math.min(suggestions.length - 1, index + 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((index) => Math.max(0, index - 1));
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  } else if (event.key === "Enter" && active >= 0 && suggestions[active]) {
                    event.preventDefault();
                    choose(suggestions[active]);
                  }
                }}
              />
              {open && suggestions.length ? (
                <ul id={listId} role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-card p-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={`${suggestion.label}-${suggestion.latitude}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                      <button type="button" className={`w-full rounded-xl px-3 py-3 text-left ${index === active ? "bg-moss" : ""}`} onClick={() => choose(suggestion)}>
                        {suggestion.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="submit" className="min-h-12 w-full rounded-full bg-pine px-5 font-bold text-card" disabled={loading}>
              {loading ? "Checking…" : "Check hazards"}
            </button>
          </div>
        </form>
        <button type="button" className="mt-3 min-h-12 w-full rounded-full border border-pine px-4 font-bold" onClick={locate} disabled={locating}>
          {locating ? "Finding location…" : "Use my location"}
        </button>
        <div className="mt-4">
          <HazardMap
            ref={mapRef}
            report={report}
            activeId={activeId}
            onSelect={setActiveId}
            onDeviceLocation={acceptDeviceFix}
            onDeviceError={onDeviceError}
            onOutsideGhana={() => {
              setLocating(false);
              setError("That point is outside Ghana. Enter a town or region.");
            }}
          />
        </div>
        {error ? <p className="mt-3 font-bold" role="alert">{error}</p> : null}
        {saved.length ? (
          <div className="mt-5">
            <h2 className="text-sm font-bold">Saved on this device</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {saved.map((item) => (
                <li key={`${item.latitude}-${item.longitude}`} className="flex items-center gap-1 rounded-full bg-moss px-2 py-1">
                  <button type="button" className="min-h-11 px-2 font-bold" onClick={() => void loadHazards(item, "search")}>{item.label}{item.notify ? " · notifications on" : ""}</button>
                  <button type="button" className="min-h-11 px-2 text-sm" onClick={() => persistSaved(saved.filter((savedItem) => !samePoint(savedItem, item)))} aria-label={`Remove ${item.label}`}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-8" aria-live="polite" aria-busy={loading}>
        {loading && !report ? <p>Checking the Ghana Meteorological Agency, USGS, and GDACS…</p> : null}
        {refreshNote ? <p className="mb-4 font-bold" role="alert">{refreshNote}</p> : null}
        {report ? (
          <div>
            <h2 className="font-serif text-3xl font-semibold">Hazards for {report.origin.label}</h2>
            <p className="mt-2 max-w-3xl">{precisionNote(report.origin.precision)}</p>
            {report.regionNote ? <p className="mt-2 text-sm">{report.regionNote}</p> : null}
            <p className="mt-2 text-sm">This page asks the sources again every 2 minutes while it is open. {NOTIFY_NOTE}</p>
            <div className="mt-4 flex flex-col gap-2 sm:max-w-xl">
              <button type="button" className="min-h-11 rounded-full border border-pine px-4 font-bold" onClick={saveLocation}>Save this location</button>
              <button type="button" className="min-h-11 rounded-full border border-clay px-4 text-left font-bold" onClick={() => void toggleNotify()}>
                {watching ? "Stop notifications for this location" : "Notify me about new Severe or Extreme alerts"}
              </button>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={moderate}
                  onChange={(event) => {
                    setModerate(event.target.checked);
                    if (!report) return;
                    persistSaved(saved.map((item) => samePoint(item, report.origin) ? { ...item, notifyModerate: event.target.checked } : item));
                  }}
                />
                <span>Also notify me about Moderate warnings at this point. Leave this off to be notified only for Severe or Extreme.</span>
              </label>
            </div>
            {notifyNote ? <p className="mt-3 text-sm font-bold">{notifyNote}</p> : null}
            {fromCache ? <p className="mt-3 rounded-2xl bg-amber px-4 py-3 font-bold" role="status">Checked at {formatOfficialTime(report.retrievedAt, report.timeZone) ?? report.retrievedAt}. {OFFLINE_COPY}</p> : null}
            <div className="mt-4 flex flex-col gap-2 text-sm font-bold">
              <a className="text-sea underline underline-offset-2" href={report.alertsPage} target="_blank" rel="noopener noreferrer">Ghana Meteorological Agency</a>
              <a className="text-sea underline underline-offset-2" href={report.forecastPage} target="_blank" rel="noopener noreferrer">Open the GMet forecast products</a>
            </div>
            <p className="mt-2 text-xs text-ink/70">The forecast page is the Ghana Meteorological Agency product list. It is not an alert.</p>
            <div className="mt-6">
              <SourceStatus sources={report.sources} retrievedAt={report.retrievedAt} timeZone={report.timeZone} />
            </div>
            <div className="mt-6">
              <AlertList report={report} activeId={activeId} onSelect={setActiveId} />
            </div>
            <p className="mt-6" data-safety="no-guarantee">{NO_GUARANTEE}</p>
            <SupplementaryPanels report={report} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NationalStrip({ national }: { national: NationalStatus | null }) {
  if (!national) return <p className="mt-4 text-sm">Checking the Ghana Meteorological Agency feed…</p>;
  if (!national.ok) return <p className="mt-4 font-bold" data-national="ready">{national.message}</p>;
  const checked = formatOfficialTime(national.checkedAt, "Africa/Accra") ?? national.checkedAt;
  if (!national.active.length) {
    return <p className="mt-4 font-bold" data-national="ready">Ghana Meteorological Agency: no active alert in the feed. Checked at {checked}.</p>;
  }
  return (
    <div className="mt-4" data-national="ready">
      <p className="font-bold">Active Ghana Meteorological Agency alerts. Checked at {checked}.</p>
      <ul className="mt-2 space-y-2">
        {national.active.map((alert) => (
          <li key={alert.id}>
            <a className="font-bold text-sea underline underline-offset-2" href={`/alerts/${encodeURIComponent(alert.id)}`}>
              {alert.headline ?? alert.event ?? "GMet alert"}{alert.severity ? ` · ${alert.severity}` : ""}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function showNotification(alert: OfficialAlert, origin: HazardReport["origin"]) {
  const { title, body } = notificationCopy(alert);
  const url = `/?${new URLSearchParams({
    lat: String(origin.latitude),
    lon: String(origin.longitude),
    label: origin.label,
    precision: origin.precision,
  }).toString()}`;
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, { body, tag: alert.id ?? title, data: { url } });
      return;
    }
  } catch {
    // The page notification below is the fallback.
  }
  if (Notification.permission === "granted") new Notification(title, { body, tag: alert.id ?? title });
}
