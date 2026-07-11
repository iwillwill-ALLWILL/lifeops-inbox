import { expect, test } from "@playwright/test";

test("PDF fact opens the correct original page for a repeated quote", async ({ page }, testInfo) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.setContent(`<!doctype html>
    <style>
      @page { size: 612px 792px; margin: 0; }
      html, body { margin: 0; }
      .sheet {
        position: relative;
        width: 612px;
        height: 792px;
        box-sizing: border-box;
        padding: 72px;
        break-after: page;
        page-break-after: always;
        color: #111;
        background: white;
        font: 18px Arial, sans-serif;
      }
      .sheet:last-child { break-after: auto; page-break-after: auto; }
      .lower-right { position: absolute; right: 58px; bottom: 92px; }
      .rotated { position: absolute; left: 82px; top: 350px; transform: rotate(8deg); }
      .quote { display: inline-block; font-weight: 600; }
      p { margin: 0 0 24px; }
    </style>
    <section class="sheet">
      <p>PREVIOUS STATEMENT</p>
      <p><span>Previous amount: </span><strong class="quote">$42.00</strong></p>
    </section>
    <section class="sheet">
      <p>PAYMENT NOTICE</p>
      <p>Due date: July 14, 2026</p>
      <p>Status: OVERDUE</p>
      <p class="rotated">Invoice total: $901.23</p>
      <p class="lower-right"><span>Amount due: </span><strong class="quote">$42.00</strong></p>
    </section>`);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await testInfo.attach("source-locator-proof.pdf", {
    body: pdf,
    contentType: "application/pdf",
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "source-locator-proof.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.getByText(/source-locator-proof\.pdf read locally · PDF extraction complete/i)).toBeVisible();

  const canonicalText = await page.getByLabel(/Paste the notice/i).inputValue();
  const firstQuoteStart = canonicalText.indexOf("$42.00");
  const secondQuoteStart = canonicalText.lastIndexOf("$42.00");
  expect(firstQuoteStart).toBeGreaterThanOrEqual(0);
  expect(secondQuoteStart).toBeGreaterThan(firstQuoteStart);

  await page.getByRole("button", { name: /^Amount due: \$42\.00$/i }).click();
  const surface = page.getByTestId("pdf-page-surface");
  const overlay = page.getByTestId("pdf-evidence-overlay");
  await expect(surface).toHaveAttribute("data-page-number", "2");
  await expect(surface).toHaveAttribute("data-page-count", "2");
  await expect(surface).toHaveAttribute("data-render-state", "ready");
  await expect(overlay).toHaveAttribute("data-evidence-start", String(secondQuoteStart));

  const geometry = await overlay.evaluate((element) => {
    const surfaceElement = element.closest<HTMLElement>('[data-testid="pdf-page-surface"]');
    if (!surfaceElement) return null;
    const surfaceBox = surfaceElement.getBoundingClientRect();
    const overlayBox = element.getBoundingClientRect();
    return {
      surfaceBox: {
        x: surfaceBox.x,
        y: surfaceBox.y,
        width: surfaceBox.width,
        height: surfaceBox.height,
      },
      overlayBox: {
        x: overlayBox.x,
        y: overlayBox.y,
        width: overlayBox.width,
        height: overlayBox.height,
      },
      normalizedOverlay: {
        left: (overlayBox.x - surfaceBox.x) / surfaceBox.width,
        top: (overlayBox.y - surfaceBox.y) / surfaceBox.height,
        right: (overlayBox.right - surfaceBox.x) / surfaceBox.width,
        bottom: (overlayBox.bottom - surfaceBox.y) / surfaceBox.height,
      },
    };
  });
  expect(geometry).not.toBeNull();
  const { surfaceBox, overlayBox, normalizedOverlay } = geometry!;
  expect(overlayBox.width).toBeGreaterThan(0);
  expect(overlayBox.height).toBeGreaterThan(0);
  expect(overlayBox.x).toBeGreaterThanOrEqual(surfaceBox.x);
  expect(overlayBox.y).toBeGreaterThanOrEqual(surfaceBox.y);
  expect(overlayBox.x + overlayBox.width).toBeLessThanOrEqual(surfaceBox.x + surfaceBox.width + 1);
  expect(overlayBox.y + overlayBox.height).toBeLessThanOrEqual(surfaceBox.y + surfaceBox.height + 1);

  expect(normalizedOverlay.left).toBeGreaterThan(0.72);
  expect(normalizedOverlay.top).toBeGreaterThan(0.75);
  expect(normalizedOverlay.right).toBeLessThanOrEqual(1.01);
  expect(normalizedOverlay.bottom).toBeLessThanOrEqual(1.01);

  const canvasStats = await surface.locator("canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    if (!context || canvas.width === 0 || canvas.height === 0) {
      return {
        width: canvas.width,
        height: canvas.height,
        nonWhitePixels: 0,
        lowerRightNonWhitePixels: 0,
      };
    }
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhitePixels = 0;
    let lowerRightNonWhitePixels = 0;
    const lowerRightStartX = Math.floor(canvas.width * 0.7);
    const lowerRightStartY = Math.floor(canvas.height * 0.72);
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        if (
          pixels[index + 3]! > 0
          && (pixels[index]! < 245 || pixels[index + 1]! < 245 || pixels[index + 2]! < 245)
        ) {
          nonWhitePixels += 1;
          if (x >= lowerRightStartX && y >= lowerRightStartY) {
            lowerRightNonWhitePixels += 1;
          }
        }
      }
    }
    return {
      width: canvas.width,
      height: canvas.height,
      nonWhitePixels,
      lowerRightNonWhitePixels,
    };
  });
  expect(canvasStats.width).toBeGreaterThan(0);
  expect(canvasStats.height).toBeGreaterThan(0);
  expect(canvasStats.nonWhitePixels).toBeGreaterThan(500);
  expect(canvasStats.lowerRightNonWhitePixels).toBeGreaterThan(100);
  await surface.screenshot({ path: testInfo.outputPath("pdf-source-locator.png") });

  await page.getByRole("button", { name: /^Amount due: \$901\.23$/i }).click();
  await expect(page.getByTestId("selected-evidence")).toHaveText("$901.23");
  await expect(page.getByTestId("pdf-page-surface")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
