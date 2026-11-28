import { expect, test, type Page } from "@playwright/test";
import { findSeriousA11yViolations } from "./helpers/a11y";

type Role = "Admin" | "Dispatcher" | "Driver";

const ADMIN_PAGES = ["/en", "/en/vehicles", "/en/dispatches", "/en/users", "/en/audit-log"];
// Plates in a fresh demo tenant are random "34 AB 123" values, so this one can never collide.
const E2E_PLATE = "34 E2E 001";

// All tests share one demo session: the server allows only 3 demos per IP per hour and creating
// a demo is the slowest step. Serial mode keeps them in one worker, but a failed test skips the
// rest, so the functional tests come first and the accessibility scan (which fails easily) is last.
test.describe.configure({ mode: "serial" });

let page: Page;

const banner = () => page.getByRole("status").filter({ hasText: /demo data is deleted/i });
const roleButton = (role: Role) => banner().getByRole("button", { name: role, exact: true });

// While a switch is in flight every button is disabled, so wait for the final state:
// the previous role is enabled again and the new one is the (disabled) current role.
async function switchRole(from: Role, to: Role) {
  await roleButton(to).click();
  await expect(roleButton(from)).toBeEnabled();
  await expect(roleButton(to)).toBeDisabled();
}

async function fillAndSubmitVehicleForm(plate: string) {
  await page.getByRole("button", { name: /add vehicle/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#plate").fill(plate);
  await dialog.locator("#model").fill("Playwright Van");
  await dialog.locator("#depotId").click();
  await page.getByRole("option").first().click(); // the options are rendered outside the dialog
  await dialog.locator('button[type="submit"]').click();
  return dialog;
}

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  page = await context.newPage();
  await page.goto("/en/login");
  await page.getByRole("button", { name: /try the live demo/i }).click();
  // If this times out, check the demo limits first: 3 demos per IP per hour, 50 active demos.
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45_000 });
});

test.afterAll(async () => {
  await page.context().close();
});

test("starts a demo as admin and shows the demo banner", async () => {
  await expect(banner()).toBeVisible();
  await expect(roleButton("Admin")).toBeDisabled();
  await expect(roleButton("Dispatcher")).toBeEnabled();
  await expect(roleButton("Driver")).toBeEnabled();
});

test("admin can create a vehicle", async () => {
  await page.goto("/en/vehicles");
  const dialog = await fillAndSubmitVehicleForm(E2E_PLATE);
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("a duplicate plate in the same tenant is rejected", async () => {
  // Also proves the first vehicle was really saved: the unique constraint is [tenantId, plate].
  await page.goto("/en/vehicles");
  const dialog = await fillAndSubmitVehicleForm(E2E_PLATE);
  await expect(dialog.locator("p.text-destructive")).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

// The plate filter (?q=) narrows the grid to the vehicle under test, so the next tests do not
// depend on the default sort order or the page size.
const vehicleRow = () => page.locator(".ag-row").filter({ hasText: E2E_PLATE });
const gotoVehicleList = (query: string) => page.goto(`/en/vehicles?q=${encodeURIComponent(query)}`);

test("the created vehicle is listed and the plate filter narrows the grid", async () => {
  await gotoVehicleList(E2E_PLATE);
  await expect(vehicleRow()).toHaveCount(1);
  await expect(vehicleRow()).toContainText("Playwright Van");

  await gotoVehicleList("NO-SUCH-PLATE");
  await expect(page.locator(".ag-row")).toHaveCount(0);
});

test("admin can edit a vehicle", async () => {
  await gotoVehicleList(E2E_PLATE);
  // The icon buttons are named "<action> <plate>" for screen readers; the tests rely on that too.
  await vehicleRow()
    .getByRole("button", { name: new RegExp(`edit.*${E2E_PLATE}`, "i") })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="model"]').fill("Playwright Truck");
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(vehicleRow()).toContainText("Playwright Truck");
});

test("admin can delete a vehicle", async () => {
  await gotoVehicleList(E2E_PLATE);
  await vehicleRow()
    .getByRole("button", { name: new RegExp(`delete.*${E2E_PLATE}`, "i") })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.locator('button[type="submit"]').click();
  await expect(confirmation).toBeHidden();
  await expect(vehicleRow()).toHaveCount(0);

  // A reload proves the deletion reached the database and not just the client.
  await gotoVehicleList(E2E_PLATE);
  await expect(page.locator(".ag-row")).toHaveCount(0);
});

test("dispatcher loses access to the users page", async () => {
  await switchRole("Admin", "Dispatcher");
  await page.goto("/en/users");
  await expect(page).toHaveURL(/\/en\/?$/);
});

test("driver only keeps access to dispatches", async () => {
  await switchRole("Dispatcher", "Driver");
  await page.goto("/en/vehicles");
  await expect(page).toHaveURL(/\/en\/?$/);
  await page.goto("/en/dispatches");
  await expect(page).toHaveURL(/\/en\/dispatches/);
});

test("switching back to admin restores access", async () => {
  await switchRole("Driver", "Admin");
  await page.goto("/en/users");
  await expect(page).toHaveURL(/\/en\/users/);
});

test("admin pages have no serious accessibility violations", async () => {
  test.setTimeout(120_000);
  const findings: string[] = [];
  for (const path of ADMIN_PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const found = await findSeriousA11yViolations(page);
    findings.push(...found.map((finding) => `${path}: ${finding}`));
  }
  // One report for every page, so a single run lists everything that needs fixing.
  expect(findings).toEqual([]);
});
