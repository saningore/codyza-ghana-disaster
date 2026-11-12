"use client";

import { useState } from "react";
import type { ModelLine } from "@/lib/model";

export default function ForecastPanel() {
  const [query, setQuery] = useState("Accra");
  const [lines, setLines] = useState<ModelLine[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setLines(null);
    try {
      const place = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const hit = await place.json() as { latitude?: number; longitude?: number; error?: string };
      if (!place.ok || hit.latitude === undefined || hit.longitude === undefined) {
        setError(hit.error || "That location could not be found.");
        return;
      }
      const response = await fetch(`/api/forecast?lat=${hit.latitude}&lon=${hit.longitude}`);
      const body = await response.json() as { lines?: ModelLine[]; note?: string; error?: string; source?: string };
      if (!response.ok || !body.lines?.length) {
        setError(body.error || "The model forecast could not be checked. No rainfall amount was added.");
        return;
      }
      setLines(body.lines);
      setNote(body.note ?? "");
    } catch {
      setError("The model forecast could not be checked. No rainfall amount was added.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 rounded-3xl border border-line bg-card p-5" onSubmit={onSubmit}>
      <h2 className="font-serif text-2xl font-semibold">Numerical model</h2>
      <p className="mt-2 text-sm">Open-Meteo supplies this panel. It is not a Ghana Meteorological Agency forecast and it cannot clear a warning.</p>
      <label className="mt-4 block font-bold" htmlFor="model-place">Town or region</label>
      <input id="model-place" className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-paper px-4" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="submit" className="mt-3 min-h-12 rounded-full bg-pine px-5 font-bold text-card" disabled={loading}>{loading ? "Checking…" : "Show model forecast"}</button>
      {error ? <p className="mt-3 font-bold" role="alert">{error}</p> : null}
      {lines ? (
        <div className="mt-4">
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.label}><span className="font-bold">{line.label}: </span>{line.value}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm">{note}</p>
          <p className="mt-2 text-sm">
            <a className="font-bold text-sea underline underline-offset-2" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>
          </p>
        </div>
      ) : null}
    </form>
  );
}
