import { describe, expect, it } from "vitest";
import { loadBulletins } from "@/lib/bulletins";
import { inGhana } from "@/lib/geo";
import { loadMissingNotices } from "@/lib/missing";
import { lookupNetwork } from "@/lib/network";
import { loadRoadNotices } from "@/lib/roads";

describe("live public feeds", () => {
  it("reads ReliefWeb, OpenStreetMap, the Ghana Police Service, and a network location", async () => {
    const [bulletins, roads, missing, network] = await Promise.all([
      loadBulletins(),
      loadRoadNotices(),
      loadMissingNotices(),
      lookupNetwork(null),
    ]);

    expect(bulletins.ok).toBe(true);
    if (bulletins.ok) {
      expect(bulletins.items.length).toBeGreaterThan(0);
      expect(bulletins.items.some((item) => item.situation)).toBe(true);
      expect(bulletins.items.every((item) => item.url.startsWith("https://reliefweb.int/"))).toBe(true);
    }

    expect(roads.ok).toBe(true);
    if (roads.ok) {
      for (const notice of roads.notices) {
        expect(inGhana(notice.latitude, notice.longitude)).toBe(true);
        expect(notice.tag === "access=no" || notice.tag === "access=closed" || notice.tag.startsWith("construction=")).toBe(true);
        expect(notice.url.startsWith("https://www.openstreetmap.org/way/")).toBe(true);
      }
    }

    expect(missing.ok).toBe(true);
    if (missing.ok) {
      expect(missing.notices.length).toBeGreaterThan(0);
      expect(missing.notices.every((notice) => notice.url.startsWith("https://police.gov.gh/"))).toBe(true);
      expect(missing.notices.some((notice) => notice.list === "persons")).toBe(true);
      expect(missing.notices.some((notice) => notice.list === "children")).toBe(true);
    }

    expect(network.ok).toBe(true);
    if (network.ok) {
      expect(network.hit.precision).toBe("network");
      expect(inGhana(network.hit.latitude, network.hit.longitude)).toBe(true);
    }
  }, 90_000);
});
