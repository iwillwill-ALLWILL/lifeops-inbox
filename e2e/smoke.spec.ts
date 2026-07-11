import { expect, test } from "@playwright/test";

test("sample to proof trail smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Drop the paperwork/i })).toBeVisible();
  await page.getByRole("button", { name: /Overdue renewal bill/i }).click();

  await expect(page.getByText("Pay $184.62")).toBeVisible();
  await expect(page.getByText(/Built-in sample loaded/i)).toBeVisible();

  await page.getByRole("button", { name: /Amount due.*\$184\.62/i }).click();
  await expect(page.getByTestId("selected-evidence")).toHaveText("$184.62");
  await expect(page.getByRole("heading", { name: /Move the right things forward/i })).toBeVisible();
});
