import { describe, expect, it } from "vitest";
import { parseReliefWebRss } from "@/lib/bulletins";
import { canRequestDeviceLocation } from "@/lib/locate";
import { galleryIds, parsePoliceMedia, sectionIds } from "@/lib/missing";
import { parseNetworkFix, publicAddress } from "@/lib/network";
import { parseOverpass } from "@/lib/roads";

const RSS = `<?xml version="1.0"?><rss><channel>
  <item>
    <title>Ghana: Flood Situation &amp; Needs</title>
    <link>https://reliefweb.int/report/ghana/flood-situation</link>
    <pubDate>Wed, 04 Nov 2026 18:04:26 +0000</pubDate>
    <category>Ghana</category>
    <category>Situation Report</category>
    <description>&lt;div class="tag source"&gt;Source: International Organization for Migration&lt;/div&gt;&lt;p&gt;Please refer to the attached file.&lt;/p&gt;&lt;p&gt;1,694 people were registered.&lt;/p&gt;</description>
  </item>
  <item>
    <title>A news headline about a closed road</title>
    <link>https://reliefweb.int/report/ghana/headline</link>
    <category>News and Press Release</category>
    <description>&lt;p&gt;The highway is closed according to a headline.&lt;/p&gt;</description>
  </item>
  <item>
    <title>Insecure link</title>
    <link>http://reliefweb.int/report/ghana/insecure</link>
    <category>Situation Report</category>
  </item>
</channel></rss>`;

const ROADS = {
  osm3s: { timestamp_osm_base: "2026-10-19T11:39:36Z" },
  elements: [
    { type: "way", id: 1, center: { lat: 11.111, lon: 0.159 }, tags: { access: "no", highway: "primary", ref: "N 17", name: "Border bridge" } },
    { type: "way", id: 2, center: { lat: 35.6, lon: 139.7 }, tags: { access: "no", highway: "primary", name: "Japan quake road" } },
    { type: "way", id: 3, center: { lat: 5.6, lon: -0.2 }, tags: { access: "no", highway: "footway", name: "A news headline" } },
    { type: "way", id: 4, center: { lat: 6.7, lon: -1.6 }, tags: { highway: "primary", name: "Open highway" } },
    { type: "way", id: 5, center: { lat: 7.3, lon: -2.3 }, tags: { highway: "construction", construction: "trunk", name: "Kumasi works" } },
  ],
};

const POLICE_HTML = `<h2><strong>MISSING PERSONS</strong></h2>images=&#8221;11,12&#8221;<h2>WANTED PERSONS</h2>images=&#8221;99&#8221;<h2>ACCIDENT VICTIMS</h2>images=&#8221;77&#8221;`;

describe("ReliefWeb Ghana RSS", () => {
  const items = parseReliefWebRss(RSS);

  it("keeps cited reports and drops an insecure link", () => {
    expect(items.map((item) => item.title)).toEqual([
      "Ghana: Flood Situation & Needs",
      "A news headline about a closed road",
    ]);
    expect(items[0]?.situation).toBe(true);
    expect(items[0]?.publisher).toBe("International Organization for Migration");
    expect(items[0]?.excerpt).toBe("1,694 people were registered.");
    expect(items[0]).not.toHaveProperty("count");
    expect(items[1]?.situation).toBe(false);
  });
});

describe("OpenStreetMap road tags", () => {
  it("keeps a closed primary road and a trunk under construction inside Ghana", () => {
    const parsed = parseOverpass(ROADS);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.osmTime).toBe("2026-10-19T11:39:36Z");
    expect(parsed.notices.map((notice) => notice.label)).toEqual(["Kumasi works", "N 17 · Border bridge"]);
    expect(parsed.notices.map((notice) => notice.tag)).toEqual(["construction=trunk", "access=no"]);
    expect(JSON.stringify(parsed.notices)).not.toContain("Japan");
    expect(JSON.stringify(parsed.notices)).not.toContain("headline");
    expect(JSON.stringify(parsed.notices)).not.toContain("Open highway");
  });
});

describe("Ghana Police Service notices", () => {
  it("reads missing-person posters and leaves wanted persons on the police page", () => {
    expect(sectionIds(POLICE_HTML, /missing persons/i)).toEqual(["11", "12"]);
    expect(galleryIds(POLICE_HTML)).toEqual(["11", "12", "99", "77"]);
    const notices = parsePoliceMedia([
      { id: 11, date: "2026-11-06T13:36:39", link: "https://police.gov.gh/en/index.php/wanted-missing/missing-anita/", title: { rendered: "MISSING ANITA" }, source_url: "https://police.gov.gh/en/wp-content/uploads/2026/11/MISSING-ANITA.jpg" },
      { id: 99, date: "2026-11-06T13:36:39", link: "https://police.gov.gh/en/index.php/wanted-missing/wanted/", title: { rendered: "WANTED PERSON" }, source_url: "https://police.gov.gh/en/wp-content/uploads/w.jpg" },
      { id: 12, date: "2026-11-01T00:00:00", link: "https://evil.example/missing", title: { rendered: "MISSING OUTSIDE" }, source_url: "https://evil.example/a.jpg" },
    ], new Map([["11", "persons"], ["12", "persons"]]));
    expect(notices).toHaveLength(1);
    expect(notices[0]?.title).toBe("MISSING ANITA");
    expect(notices[0]?.url).toContain("https://police.gov.gh/");
  });
});

describe("network location", () => {
  it("uses a Ghana result and refuses another country", () => {
    const fix = parseNetworkFix({
      success: true,
      country_code: "GH",
      city: "Accra",
      region: "Greater Accra",
      latitude: 5.55602,
      longitude: -0.19694,
      postal: "GD-110-6313",
    });
    expect(fix?.precision).toBe("network");
    expect(fix?.label).toBe("Network location, Accra, Greater Accra");
    expect(JSON.stringify(fix)).not.toContain("GD-110-6313");
    expect(parseNetworkFix({ success: true, country_code: "NG", latitude: 5.55, longitude: -0.19 })).toBeNull();
  });

  it("does not send a private address to the lookup", () => {
    expect(publicAddress("102.176.34.204")).toBe("102.176.34.204");
    expect(publicAddress("127.0.0.1")).toBeNull();
    expect(publicAddress("10.1.1.1")).toBeNull();
    expect(publicAddress("192.168.0.8")).toBeNull();
    expect(publicAddress("169.254.169.254")).toBeNull();
    expect(publicAddress("172.16.0.4")).toBeNull();
    expect(publicAddress("::1")).toBeNull();
    expect(publicAddress("102.176.34.204 extra")).toBeNull();
  });
});

describe("device location gate", () => {
  it("asks for a device fix on localhost and on a secure page", () => {
    expect(canRequestDeviceLocation(false, "192.168.1.8", true)).toBe(false);
    expect(canRequestDeviceLocation(false, "127.0.0.1", true)).toBe(true);
    expect(canRequestDeviceLocation(undefined, "localhost", true)).toBe(true);
    expect(canRequestDeviceLocation(true, "example.com", false)).toBe(false);
  });
});
