import { readFileSync } from "node:fs";

if (process.env.GHANA_USE_FIXTURES === "1") {
  console.error("Fixture mode is refused.");
  process.exit(1);
}

const places = JSON.parse(readFileSync(new URL("../data/places.json", import.meta.url), "utf8"));
const regions = JSON.parse(readFileSync(new URL("../data/regions.geojson", import.meta.url), "utf8"));
if (!Array.isArray(places) || places.length < 16) {
  console.error("Town gazetteer is missing.");
  process.exit(1);
}
if (!Array.isArray(regions.features) || regions.features.length !== 16) {
  console.error("Region file does not contain 16 features.");
  process.exit(1);
}

const headers = { "User-Agent": "GhanaDisaster/1.0 (https://ghanadisaster.com; https://codyza.com)" };
const rss = await fetch("https://www.meteo.gov.gh/api/cap/rss.xml", { headers });
const rssText = await rss.text();
if (rss.status !== 200 || !rssText.includes("meteo.gov.gh/api/cap/")) {
  console.error("CAP feed could not be read.");
  process.exit(1);
}

const quake = await fetch("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=5.6037&longitude=-0.187&maxradiuskm=300&limit=1", { headers });
if (quake.status !== 200 && quake.status !== 204) {
  console.error("USGS could not be read.");
  process.exit(1);
}

console.log(`Ready. Places ${places.length}. Regions ${regions.features.length}. CAP feed responded. USGS status ${quake.status}.`);
