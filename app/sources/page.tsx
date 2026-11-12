import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sources" };

const SOURCES = [
  {
    name: "Ghana Meteorological Agency",
    href: "https://www.meteo.gov.gh/api/cap/rss.xml",
    use: "The server reads the CAP RSS feed registered with the WMO Register of Alerting Authorities, then each alert XML. An alert is active only when status is Actual, the message type is Alert or Update, and the expiry time is still in the future. Each polygon is tested against the coordinate. CAP coordinates are latitude, longitude and are converted before the test.",
    limit: "An item that is still in the RSS after its expiry is listed under Recent expired. A polygon is never invented. A named area without a polygon is labeled as untested. The 10 November 2026 thunderstorm alert expired at 20:00 UTC and is not shown as active after that time.",
  },
  {
    name: "U.S. Geological Survey",
    href: "https://earthquake.usgs.gov/fdsnws/event/1/",
    use: "The FDSN event feed for earthquakes within 300 km during the past 7 days, magnitude 2.5 or greater, limited to 50 events.",
    limit: "This is a catalog of recorded events, not a warning. Events USGS did not mark as earthquakes are omitted and counted. An empty catalog does not add an earthquake.",
  },
  {
    name: "GDACS",
    href: "https://www.gdacs.org/gdacsapi/swagger/index.html",
    use: "The event list for earthquakes, tropical cyclones, floods, volcanoes, and wildfires over the past 14 days. An event is kept when its geometry contains the point, or when its representative point is in Ghana and within 500 km, or when the country text names Ghana and the point is within 800 km.",
    limit: "A GDACS level is an international coordination product from the European Commission Joint Research Centre. It is not a Ghana Meteorological Agency warning.",
  },
  {
    name: "geoBoundaries ADM1",
    href: "https://www.geoboundaries.org/api/current/gbOpen/GHA/ADM1/",
    use: "Sixteen region outlines, boundary ID GHA-ADM1-69750345, built from OpenStreetMap and dated 2021. A device or town coordinate is named by the region polygon that contains it.",
    limit: "The license is Creative Commons Attribution-ShareAlike 2.0. These outlines are not warning polygons and they are not district boundaries. The file is stored with the site. It is not requested again during a search.",
  },
  {
    name: "ReliefWeb",
    href: "https://reliefweb.int/updates/rss.xml?legacy-river=country%2Fgha",
    use: "The public Ghana updates RSS. The Bulletins page lists the items. The Situation page keeps the items whose category is Situation Report, with the publisher and date from the feed.",
    limit: "A ReliefWeb report is not a Ghana Meteorological Agency warning. A number inside a report is not copied into a count on this site.",
  },
  {
    name: "OpenStreetMap",
    href: "https://www.openstreetmap.org/copyright",
    use: "An Overpass query for motorway, trunk, primary, and secondary roads inside Ghana that are tagged access=no, access=closed, or highway=construction.",
    limit: "These are map tags, not Ghana Highway Authority closure notices. A road with no tag is not reported as open. The result may be reused for 10 minutes.",
  },
  {
    name: "Ghana Police Service",
    href: "https://police.gov.gh/en/index.php/wanted-missing/",
    use: "The WordPress pages for missing persons and missing children. Notices come from the posters in those sections, with the title, date, and link the police site publishes.",
    limit: "This site does not accept a missing-person report. Wanted persons and accident victims are not listed. A name that is not on the police page is not added.",
  },
  {
    name: "Network location",
    href: "https://ipwho.is/",
    use: "When the browser will not share a device location, the server asks ipwho.is for the approximate location of the connection. On this site the visitor address is used when it is a public address. A private address is not sent.",
    limit: "The result is labeled as a network location, not a GPS fix. A result outside Ghana is refused. The response does not include the address that was looked up.",
  },
  {
    name: "Town gazetteer",
    href: "/sources",
    use: "A selected list of regional capitals and major towns, with public town-center coordinates, is stored in data/places.json. A town search uses that center. A region search uses the regional capital.",
    limit: "Centers are not rooftop positions. GhanaPostGPS codes are not sent to a geocoder. A code shaped like GA-183-8164 returns an unresolved message.",
  },
];

export default function SourcesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Where the information comes from</h1>
      <p className="mt-4 text-lg">The browser talks only to this site. The server calls each source with the User-Agent GhanaDisaster/1.0 (https://ghanadisaster.com; https://codyza.com). A CAP response may be reused on the server for 60 seconds. API responses use Cache-Control: no-store. The browser can keep the last check so the page opens offline. That copy is labeled with the time it was retrieved and is not presented as a new check.</p>
      <p className="mt-4">Open-Meteo, on the Forecast page, is a numerical model and is kept off the warning list. Road tags, bulletins, and police notices stay on their own pages. They are not copied into the hazard list. Dam levels are not read from a live feed.</p>
      <div className="mt-8 space-y-6">
        {SOURCES.map((source) => (
          <section key={source.name} className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-serif text-2xl font-semibold">
              <a className="underline decoration-sea/40 underline-offset-4" href={source.href} target={source.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{source.name}</a>
            </h2>
            <p className="mt-3">{source.use}</p>
            <p className="mt-3 text-ink/80">{source.limit}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
