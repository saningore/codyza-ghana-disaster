# GhanaDisaster

GhanaDisaster shows official hazard information for a place in Ghana.

A check uses:

- The Ghana Meteorological Agency CAP feed registered with the WMO. An alert is active only when its status is Actual, its message type is Alert or Update, and its expiry is still in the future. Polygons are tested against the coordinate. Expired alerts stay in a separate list.
- The USGS earthquake catalog within 300 km for the past 7 days, magnitude 2.5 and above. That list is a catalog, not a warning.
- GDACS events that meet a Ghana filter. A GDACS level is not a GMet warning.
- geoBoundaries ADM1 outlines, from OpenStreetMap (2021), to name the region that contains the point.
- A stored gazetteer of regional capitals and major towns. A search uses the town center or the regional capital. GhanaPostGPS codes are not resolved.

The site does not invent alerts, severity, instructions, reservoir levels, road closures, or missing-person names. An empty result is not a statement that the area is safe.

Bulletins and situation reports come from the public ReliefWeb Ghana RSS. Road notices are OpenStreetMap tags, not Ghana Highway Authority closures. Missing-person notices are read from the Ghana Police Service pages. Use my location asks the map for the device position and moves the map to that point. If the browser cannot share a device location, it uses the approximate network location and labels it as such.

Up to five locations can be saved in this browser. Notifications repeat the official headline for a new Severe or Extreme alert whose polygon contains a saved point. Moderate warnings do not notify unless that control is on.

## Requirements

- Node.js 22 or newer
- npm

No API key is required for CAP, USGS, GDACS, ReliefWeb’s public RSS, OpenStreetMap, the Ghana Police Service pages, or the local gazetteer.

`GHANA_USE_FIXTURES=1` is refused. The server will not serve sample alerts.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and search `Accra`, `Tamale`, or `Wa`.

## Checks

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run check:ready
```

Powered by Codyza.
