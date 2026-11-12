import AlertCard from "@/components/AlertCard";
import { EMPTY_ALERTS } from "@/lib/copy";
import type { HazardReport } from "@/lib/types";

export default function AlertList({
  report,
  activeId,
  onSelect,
}: {
  report: HazardReport;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const gmet = report.sources.find((source) => source.id === "gmet");
  const shared = {
    timeZone: report.timeZone,
    retrievedAt: report.retrievedAt,
    latitude: report.origin.latitude,
    longitude: report.origin.longitude,
    activeId,
    onSelect,
  };
  return (
    <div className="space-y-4">
      {gmet?.status === "error" ? <p className="font-bold">{gmet.detail}</p> : null}
      {report.alerts.length || report.areaAlerts.length ? null : gmet?.status === "error" ? null : <p>{EMPTY_ALERTS}</p>}
      {report.alerts.map((alert) => (
        <AlertCard key={alert.id ?? alert.headline} {...shared} alert={alert} active={alert.id === activeId} kind="active" />
      ))}
      {report.areaAlerts.length ? <h3 className="font-serif text-2xl font-semibold">Same feed, not at this point</h3> : null}
      {report.areaAlerts.map((alert) => (
        <AlertCard key={`area-${alert.id}`} {...shared} alert={alert} active={alert.id === activeId} kind="area" />
      ))}
      {report.expired.length ? <h3 className="font-serif text-2xl font-semibold">Recent expired</h3> : null}
      {report.expired.map((alert) => (
        <AlertCard key={`old-${alert.id}`} {...shared} alert={alert} active={false} kind="expired" />
      ))}
      {report.cancellations.map((alert) => (
        <AlertCard key={`cancel-${alert.id}`} {...shared} alert={alert} active={false} kind="cancellation" />
      ))}
      {report.quarantined.map((alert) => (
        <AlertCard key={`hold-${alert.id}`} {...shared} alert={alert} active={false} kind="quarantine" />
      ))}
    </div>
  );
}
