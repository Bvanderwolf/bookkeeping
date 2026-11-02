import { expect, test } from "@playwright/test";

test("de productie-PWA opent na het eerste bezoek offline", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hoe heet jouw bedrijf?" })).toBeVisible();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hoe heet jouw bedrijf?" })).toBeVisible();
  await context.setOffline(false);
});
