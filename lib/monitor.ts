import type { OfficialAlert } from "@/lib/types";

export function isNotifiable(alert: OfficialAlert, includeModerate: boolean): boolean {
  if (!alert.id || alert.scope === "area") return false;
  if (alert.severity === "Extreme" || alert.severity === "Severe") return true;
  return includeModerate && alert.severity === "Moderate" && alert.scope === "point";
}

export function notificationCopy(alert: OfficialAlert): { title: string; body: string } {
  const title = alert.headline ?? alert.event ?? "Ghana Meteorological Agency alert";
  const event = alert.event ?? "Alert";
  const severity = alert.severity ?? "not included";
  return {
    title,
    body: `${event}. Severity: ${severity}. This is a browser notification, not a cell broadcast.`.slice(0, 240),
  };
}

export function unseenNotifiable(alerts: OfficialAlert[], seen: string[], includeModerate: boolean): OfficialAlert[] {
  const known = new Set(seen);
  return alerts.filter((alert) => isNotifiable(alert, includeModerate) && alert.id && !known.has(alert.id));
}

export function rememberSeen(seen: string[], alerts: OfficialAlert[], includeModerate: boolean): string[] {
  const next = [...seen];
  const known = new Set(seen);
  for (const alert of alerts) {
    if (!isNotifiable(alert, includeModerate) || !alert.id || known.has(alert.id)) continue;
    known.add(alert.id);
    next.push(alert.id);
  }
  return next.slice(-200);
}
