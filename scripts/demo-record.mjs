import { chromium } from "playwright";
import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const outputDir = join(root, "assets", "demo");
const rawDir = join(outputDir, "raw");
await rm(rawDir, { recursive: true, force: true });
await mkdir(rawDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
  reducedMotion: "no-preference",
});
const page = await context.newPage();

const pause = (ms) => page.waitForTimeout(ms);
const smoothScrollTo = async (selector) => {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await pause(1200);
};

await page.goto("https://lifeops-inbox.vercel.app", { waitUntil: "networkidle" });
await page.screenshot({ path: join(outputDir, "01-hero.png") });
await pause(4000);

await smoothScrollTo("#workspace");
await page.getByRole("button", { name: /HOUSEHOLD Overdue renewal bill/i }).click();
await page.locator("#result-title").waitFor();
await pause(3500);

const amountFact = page.locator(".fact-row").filter({ hasText: "Amount due" }).first();
await amountFact.scrollIntoViewIfNeeded();
await amountFact.click();
await pause(1200);
await page.screenshot({ path: join(outputDir, "02-proof-trail.png") });
await pause(4500);

await smoothScrollTo(".action-section");
await pause(4000);

await page.getByRole("button", { name: /OFFICIAL NOTICE Genesis hackathon deadlines/i }).click();
await page.locator("#result-title").waitFor();
await pause(3500);
await smoothScrollTo(".exceptions");
await page.screenshot({ path: join(outputDir, "03-conflict-radar.png") });
await pause(5500);

await smoothScrollTo(".result-head");
const calendarDownload = page.waitForEvent("download");
await page.getByRole("button", { name: /Calendar/i }).click();
await calendarDownload;
await pause(2000);
const shareDownload = page.waitForEvent("download");
await page.getByRole("button", { name: /Safe share card/i }).click();
await shareDownload;
await pause(3500);

await smoothScrollTo("#proof");
await page.screenshot({ path: join(outputDir, "04-product-principles.png") });
await pause(5000);

await context.close();
await browser.close();

const rawFiles = (await readdir(rawDir)).filter((name) => name.endsWith(".webm"));
if (rawFiles.length !== 1) {
  throw new Error(`Expected one recorded video, found ${rawFiles.length}`);
}
const finalVideo = join(outputDir, "lifeops-walkthrough.webm");
await copyFile(join(rawDir, rawFiles[0]), finalVideo);

const mobileBrowser = await chromium.launch({ headless: true });
const mobileContext = await mobileBrowser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 1,
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto("https://lifeops-inbox.vercel.app", { waitUntil: "networkidle" });
await mobilePage.getByRole("button", { name: /TRAVEL Flight \+ hotel itinerary/i }).click();
await mobilePage.locator(".action-section").scrollIntoViewIfNeeded();
await mobilePage.screenshot({ path: join(outputDir, "05-mobile-actions.png") });
await mobileContext.close();
await mobileBrowser.close();

console.log(finalVideo);
