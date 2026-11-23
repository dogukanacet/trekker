import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/a11y";

type Role = "Admin" | "Dispatcher" | "Driver";

// All tests share one demo session: the server allows only 3 demos per IP per hour and creating
// a demo is the slowest step. The tests therefore run in order, inside one browser context.
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

for (const path of ["/en", "/en/vehicles", "/en/dispatches", "/en/users", "/en/audit-log"]) {
  test(`admin: ${path} has no serious accessibility violations`, async () => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSeriousA11yViolations(page);
  });
}

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
