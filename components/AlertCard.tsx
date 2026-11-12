"use client";

import AlertFacts from "@/components/AlertFacts";
import type { OfficialAlert } from "@/lib/types";

const BADGE: Record<string, string> = {
  Extreme: "bg-[#7f1d1d] text-white",
  Severe: "bg-[#9a3412] text-white",
  Moderate: "bg-[#854d0e] text-white",
  Minor: "bg-[#1e3a8a] text-white",
  Unknown: "bg-[#334155] text-white",
};

export default function AlertCard({
  alert,
  timeZone,
  retrievedAt,
  latitude,
  longitude,
  active,
  onSelect,
  kind,
}: {
  alert: OfficialAlert;
  timeZone: string | null;
  retrievedAt: string;
  latitude: number;
  longitude: number;
  active: boolean;
  onSelect: (id: string) => void;
  kind: "active" | "area" | "expired" | "cancellation" | "quarantine";
}) {
  const severity = alert.severity ?? "Unknown";
  return (
    <article
      id={alert.id ? `alert-${encodeURIComponent(alert.id)}` : undefined}
      data-alert={kind}
      data-severity={severity}
      className={`rounded-3xl border border-line bg-card p-5 ${active ? "ring-2 ring-pine" : ""}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-sea">Official alert · Ghana Meteorological Agency</p>
      {kind === "area" ? (
        <p className="mt-3 rounded-2xl bg-moss px-3 py-2 text-sm font-bold">This point is outside the official polygon, or the alert names another area.</p>
      ) : null}
      {kind === "expired" ? (
        <p className="mt-3 rounded-2xl bg-amber px-3 py-2 text-sm font-bold">This alert is expired. It is not an active warning.</p>
      ) : null}
      {kind === "quarantine" ? (
        <p className="mt-3 rounded-2xl bg-amber px-3 py-2 text-sm font-bold">This message is marked {alert.status ?? "without an Actual status"}. It is not an actual emergency.</p>
      ) : null}
      {kind === "cancellation" ? <p className="mt-3 text-sm font-bold">This is a cancellation, not an active hazard.</p> : null}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-serif text-2xl font-semibold">{alert.event ?? "Not included by GMet"}</h3>
        <p className={`rounded-full px-3 py-1 text-sm font-bold ${BADGE[severity] ?? BADGE.Unknown}`}>Severity: {alert.severity ?? "Not included by GMet"}</p>
      </div>
      <AlertFacts alert={alert} timeZone={timeZone} retrievedAt={retrievedAt} latitude={latitude} longitude={longitude} />
      {alert.geometry && alert.id ? (
        <button type="button" className="mt-4 min-h-11 font-bold text-sea underline underline-offset-2" onClick={() => onSelect(alert.id!)}>
          Show this polygon on the map
        </button>
      ) : null}
    </article>
  );
}
