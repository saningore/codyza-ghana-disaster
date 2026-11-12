import { formatOfficialTime } from "@/lib/time";
import type { HazardReport } from "@/lib/types";

export default function SupplementaryPanels({ report }: { report: HazardReport }) {
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-2xl font-semibold">Earthquake catalog</h2>
        <p className="mt-2 text-sm">USGS recorded earthquakes within {report.earthquakeWindow.radiusKm} km over the past {report.earthquakeWindow.days} days, magnitude {report.earthquakeWindow.minMagnitude} and above. This is a catalog, not a warning.</p>
        {report.earthquakes.length ? (
          <ul className="mt-4 space-y-3">
            {report.earthquakes.map((quake) => (
              <li key={quake.id} className="border-t border-line pt-3">
                <p className="font-bold">M {quake.magnitude ?? "not included"} · {quake.place ?? "Place not included"}</p>
                <p className="text-sm">{formatOfficialTime(quake.time, report.timeZone) ?? "Time not included"} · {quake.distanceKm} km from this point</p>
                {quake.url ? <a className="text-sm font-bold text-sea underline underline-offset-2" href={quake.url} target="_blank" rel="noopener noreferrer">Open the USGS record</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3">No earthquake was added for this window.</p>}
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-2xl font-semibold">GDACS</h2>
        <p className="mt-2 text-sm">International coordination events from the European Commission Joint Research Centre. A GDACS level is not a Ghana Meteorological Agency warning.</p>
        {report.international.length ? (
          <ul className="mt-4 space-y-3">
            {report.international.map((event) => (
              <li key={event.id} className="border-t border-line pt-3">
                <p className="font-bold">{event.name ?? event.eventType ?? "GDACS event"}</p>
                <p className="text-sm">{event.eventType ?? "Type not included"} · level {event.alertLevel ?? "not included"} · {event.country ?? "Country not included"}</p>
                {event.url ? <a className="text-sm font-bold text-sea underline underline-offset-2" href={event.url} target="_blank" rel="noopener noreferrer">Open the GDACS record</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3">No GDACS event was added for this point.</p>}
      </section>
    </div>
  );
}
