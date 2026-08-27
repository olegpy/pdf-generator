import { expect, test } from "@playwright/test";

test("home shows the agent and the form", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Invoice agent" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ask the agent" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Or fill the invoice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate PDF" }),
  ).toBeVisible();
});

test("form generates a downloadable PDF", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Fill fields" }).click();
  await page.locator('input[name="counterpartyName"]').fill("Acme");
  await page.getByRole("button", { name: "Generate PDF" }).click();

  const download = page.getByRole("link", { name: /Download INV-/ });
  await expect(download).toBeVisible({ timeout: 20_000 });

  const response = await page.request.get(
    (await download.getAttribute("href")) ?? "",
  );
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
});
