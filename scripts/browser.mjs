import { chromium } from "playwright";
import { existsSync } from "node:fs";

export async function createBrowser({ software = true } = {}) {
  const options = {
    headless: true,
    args: [
      "--force-color-profile=srgb",
      "--disable-lcd-text",
      "--font-render-hinting=none",
      // Repaint complete tiles so 3D edges do not inherit partial-raster rounding.
      ...(software ? ["--disable-gpu", "--disable-partial-raster"] : []),
    ],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  else if (process.env.PLAYWRIGHT_CHANNEL)
    options.channel = process.env.PLAYWRIGHT_CHANNEL;
  else if (!existsSync(chromium.executablePath())) options.channel = "chrome";
  return chromium.launch(options);
}

export async function preparePage(
  browser,
  { width = 1440, height = 960, dpr = 2, reducedMotion = "no-preference" } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    locale: "zh-CN",
    timezoneId: "Asia/Singapore",
    colorScheme: "light",
    reducedMotion,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return { page, context, errors };
}

export async function readyPage(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => typeof window.__seek === "function" && !!window.__ready,
  );
  await page.evaluate(async () => {
    await window.__ready;
    if (window.__renderError) throw new Error(window.__renderError);
  });
}
