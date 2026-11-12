import type { Precision } from "@/lib/types";

export const EMPTY_ALERTS = "No matching active alerts were returned by the sources checked.";

export const NO_GUARANTEE = "This does not mean the area is completely safe. A source can be delayed, a warning polygon can miss a town center, and local officials may issue instructions that are not in these feeds.";

export const NOT_GOVERNMENT = "GhanaDisaster is not a government website. Warning text is taken from the named official source.";

export const CALL_112 = "If you are in immediate danger, call 112. GhanaDisaster does not dispatch help and is not a cell-broadcast alert.";

export const GMET_UNCHECKED = "The Ghana Meteorological Agency feed could not be checked. No alert was added.";

export const GMET_EMPTY = "The Ghana Meteorological Agency returned no active alert.";

export const USGS_UNCHECKED = "The USGS earthquake catalog could not be checked. No earthquake was added in its place.";

export const USGS_EMPTY = "No matching earthquakes were returned within 300 km for the past 7 days.";

export const GDACS_UNCHECKED = "GDACS could not be checked. No international alert was added.";

export const GDACS_EMPTY = "No matching GDACS event was returned for Ghana.";

export const NOT_INCLUDED = "Not included by GMet";

export const NO_INSTRUCTION = "This alert did not include an instruction.";

export const NOTIFY_NOTE = "Browser notifications repeat the official headline for new Severe or Extreme alerts at a point inside the polygon. Moderate and Minor warnings still appear on this page and do not notify unless you turn that on. Notifications are not a cell broadcast, and they are not sent for earthquakes, GDACS events, or news.";

export const OFFLINE_COPY = "This is a saved check, not a new check. The Ghana Meteorological Agency, USGS, and GDACS were not contacted again.";

export const GPS_UNRESOLVED = "This digital address cannot be resolved here. Search a town or district, or use device location.";

export const NOT_FOUND = "That location could not be found. Try a town, a district, or device location.";

export const NAMED_AREA = "GMet named this area. The polygon was not included, so the point was not tested against a shape.";

export function precisionNote(precision: Precision): string {
  switch (precision) {
    case "town":
      return "Results use this town center. A warning polygon can cover part of the surrounding area and miss the center. For a closer check, use device location.";
    case "region-center":
      return "Results use the regional capital as a center for this region. A warning polygon can cover part of the region and miss that center. For a closer check, use device location.";
    case "device":
      return "Results use your device location at the time it was shared.";
    case "network":
      return "Results use the approximate location of this network connection. It is not a GPS fix. For a closer check, search a town or share device location on a secure page.";
  }
}

export function relationNote(
  relation: "inside" | "outside" | "none",
  checked: boolean,
  scope: "point" | "area" | "named",
): string {
  if (scope === "named") return NAMED_AREA;
  if (!checked) return "Open this alert from a location search to see whether that point is inside the polygon.";
  if (relation === "inside") return "Your location is inside the official polygon.";
  if (relation === "outside") {
    return "Your location is outside the official polygon. GMet still published this alert for the named area.";
  }
  return "This alert did not include a polygon. The area text is shown instead.";
}
