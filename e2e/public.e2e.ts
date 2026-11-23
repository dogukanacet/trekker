import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/a11y";

test("the login page offers the live demo", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.getByRole("button", { name: /try the live demo/i })).toBeVisible();
});

test("protected pages redirect signed-out visitors to the login page", async ({ page }) => {
  await page.goto("/en/vehicles");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("the login page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/en/login");
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yViolations(page);
});
