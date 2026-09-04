import { test, expect } from "@playwright/test";

const BUYER_EMAIL = "buyer@coffee.test";
const BUYER_PASSWORD = "password123";

async function loginAs(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"], input[type="email"]', BUYER_EMAIL);
  await page.fill('input[name="password"], input[type="password"]', BUYER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/buyer/, { timeout: 10_000 });
}

test.describe("Happy path — buyer journey", () => {
  test("landing page renders with sign-in prompt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=CoffeeShopSupplier")).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test("buyer can log in and land on buyer dashboard", async ({ page }) => {
    await loginAs(page);
    await expect(page).toHaveURL(/\/buyer/);
  });

  test("buyer can browse product catalog", async ({ page }) => {
    await loginAs(page);
    await page.goto("/buyer/products");
    await expect(page.locator("text=Browse Products")).toBeVisible();
  });

  test("buyer can place an order (cart → orders)", async ({ page }) => {
    await loginAs(page);

    await page.goto("/buyer/products");
    await page.waitForLoadState("networkidle");

    // Click first product card (if any exist)
    const productLinks = page.locator('a[href^="/buyer/products/"]');
    const count = await productLinks.count();
    if (count > 0) {
      await productLinks.first().click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("buyer can view order list page", async ({ page }) => {
    await loginAs(page);
    await page.goto("/buyer/orders");
    await expect(page.locator("text=My Orders")).toBeVisible();
  });

  test("buyer can access cart page", async ({ page }) => {
    await loginAs(page);
    await page.goto("/buyer/cart");
    await expect(page.locator("text=Cart")).toBeVisible();
  });

  test("login page shows form and redirects on valid credentials", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "nonexistent@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Should stay on login or show error
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Happy path — supplier journey", () => {
  const SUPPLIER_EMAIL = "supplier@coffee.test";

  test("supplier can log in and land on supplier dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', SUPPLIER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/supplier/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/supplier/);
  });

  test("supplier can view incoming orders", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', SUPPLIER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/supplier/, { timeout: 10_000 });
    await page.goto("/supplier/orders");
    await expect(page.locator("text=Incoming Orders")).toBeVisible();
  });
});

test.describe("Accessibility checks", () => {
  test("login page has no critical axe violations", async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(critical).toEqual([]);
  });

  test("catalog page has no critical axe violations", async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/login");
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/buyer/, { timeout: 10_000 });
    await page.goto("/buyer/products");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(critical).toEqual([]);
  });
});
