import { expect, test } from "@playwright/test";

test("explains the service, rejects a bad place, and keeps the footer on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("If you are in immediate danger, call 112.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Know hazards around your location" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codyza.com" })).toHaveAttribute("href", "https://codyza.com");
  await expect(page.locator("[data-national='ready']")).toBeVisible({ timeout: 90_000 });

  await page.getByLabel("Town, district, or region").fill("zzzznotaplace");
  await page.getByRole("button", { name: "Check hazards" }).click();
  await expect(page.getByText("That location could not be found. Try a town, a district, or device location.")).toBeVisible();

  await page.getByLabel("Town, district, or region").fill("GA-183-8164");
  await page.getByRole("button", { name: "Check hazards" }).click();
  await expect(page.getByText("This digital address cannot be resolved here.")).toBeVisible();

  await page.getByRole("link", { name: "Sources" }).click();
  await expect(page.getByRole("heading", { name: "Where the information comes from" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codyza.com" })).toBeVisible();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { name: "About GhanaDisaster" })).toBeVisible();
  await page.getByRole("link", { name: "Helplines" }).click();
  await expect(page.getByRole("heading", { name: "Emergency helplines" })).toBeVisible();
  await expect(page.getByRole("link", { name: "112" }).first()).toBeVisible();

  await page.goto("/news");
  await expect(page.locator("[data-bulletins='ready']")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-bulletins='ready'] a[href^='https://reliefweb.int/']").first()).toBeVisible();
  await page.goto("/situation");
  await expect(page.locator("[data-situation='ready']")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Counts are not collected from news headlines.")).toBeVisible();
  await page.goto("/roads");
  await expect(page.getByText("News headlines are not turned into closure notices.")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("[data-roads='ready'], [data-roads='empty']")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ghana Highway Authority road condition survey" })).toBeVisible();
  await page.goto("/missing");
  await expect(page.getByText("does not accept reports")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("[data-missing='ready'] a[href^='https://police.gov.gh/']").first()).toBeVisible();

  const missing = await page.goto("/not-a-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Codyza.com" })).toBeVisible();
});

for (const place of ["Accra", "Tamale", "Wa"]) {
  test(`checks live sources for ${place}`, async ({ page }) => {
    await openPlace(page, place);
  });
}

test("tells the user when location permission is denied", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Location permission was denied. Enter a town or region.")).toBeVisible();
});

test("checks a granted device location in Accra", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 5.6037, longitude: -0.187 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("heading", { name: "Hazards for Device location" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Results use your device location")).toBeVisible();
  await expect(page.locator(".maplibregl-user-location-dot")).toBeVisible();
  await expectChecked(page);
});

test("stays usable on a phone-width screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlace(page, "Accra");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "Codyza.com" })).toBeVisible();
});

async function openPlace(page: import("@playwright/test").Page, place: string) {
  await page.goto("/");
  await page.getByLabel("Town, district, or region").fill(place);
  await page.getByRole("button", { name: "Check hazards" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Hazards for ${place}`) })).toBeVisible({ timeout: 90_000 });
  await expectChecked(page);
  const failed = page.getByText("The Ghana Meteorological Agency feed could not be checked.");
  if (await failed.count()) {
    await expect(page.locator("article[data-alert='active']")).toHaveCount(0);
    return;
  }
  const empty = page.getByText("No matching active alerts were returned by the sources checked.");
  const cards = page.locator("article[data-alert='active'], article[data-alert='area']");
  if (await empty.count()) await expect(empty).toBeVisible();
  else expect(await cards.count()).toBeGreaterThan(0);
}

async function expectChecked(page: import("@playwright/test").Page) {
  await expect(page.locator("[data-source='gmet']")).toContainText("Ghana Meteorological Agency");
  await expect(page.locator("[data-source='usgs']")).toContainText("U.S. Geological Survey");
  await expect(page.locator("[data-source='gdacs']")).toContainText("GDACS");
  await expect(page.locator("[data-safety='no-guarantee']")).toContainText("does not mean the area is completely safe");
  await expect(page.getByRole("link", { name: "Codyza.com" })).toHaveAttribute("href", "https://codyza.com");
  await expect(page.getByRole("link", { name: "Open the GMet forecast products" })).toHaveAttribute("href", "https://www.meteo.gov.gh/product/");
  await expect(page.locator("[data-map-ready='true']")).toBeVisible({ timeout: 45_000 });
}
