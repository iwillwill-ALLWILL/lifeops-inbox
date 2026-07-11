import { chromium } from "playwright";
import { join } from "node:path";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto("https://lifeops-inbox.vercel.app", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /OFFICIAL NOTICE Genesis hackathon deadlines/i }).click();
await page.locator("#result-title").waitFor();
const exceptions = page.locator(".exceptions");
await exceptions.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await exceptions.screenshot({
  path: join(process.cwd(), "assets", "demo", "03-conflict-radar-closeup.png"),
});
await context.close();
await browser.close();
