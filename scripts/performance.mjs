import { createBrowser, preparePage, readyPage } from "./browser.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await createBrowser({ software: false });
const results = [];
try {
  for (const [width, height, dpr] of [
    [1440, 960, 1],
    [1440, 960, 2],
    [390, 844, 2],
  ]) {
    const { page, context, errors } = await preparePage(browser, {
      width,
      height,
      dpr,
    });
    await readyPage(page, "http://127.0.0.1:4174/?t=6.5");
    const seek = await page.evaluate(() => {
      const samples = [];
      for (let i = 0; i < 120; i++) {
        const before = performance.now();
        window.__seek(3 + i / 10);
        samples.push(performance.now() - before);
      }
      samples.sort((a, b) => a - b);
      return {
        meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
        p95Ms: samples[Math.floor(samples.length * 0.95)],
      };
    });
    await page.evaluate(() => window.__seek(6.5));
    await page.getByRole("button", { name: "播放品牌动效" }).click();
    const paint = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const gaps = [];
          let previous = 0;
          const tick = (now) => {
            if (previous) gaps.push(now - previous);
            previous = now;
            if (gaps.length < 180) requestAnimationFrame(tick);
            else {
              const sorted = [...gaps].sort((a, b) => a - b);
              resolve({
                meanFrameMs: gaps.reduce((a, b) => a + b, 0) / gaps.length,
                p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
                framesOver25Ms: gaps.filter((x) => x > 25).length,
                sampleCount: gaps.length,
              });
            }
          };
          requestAnimationFrame(tick);
        }),
    );
    const interaction = await page.evaluate(() => {
      window.__seek(10.5);
      const samples = [];
      for (let i = 0; i < 12; i++) {
        const before = performance.now();
        document.querySelectorAll(".pod-hit:not([hidden])")[i % 3].click();
        samples.push(performance.now() - before);
      }
      window.__seek(10.5);
      samples.sort((a, b) => a - b);
      return {
        meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
        p95Ms: samples[Math.floor(samples.length * 0.95)],
        sampleCount: samples.length,
      };
    });
    const row = { width, height, dpr, seek, paint, interaction, errors };
    results.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
} finally {
  await browser.close();
}
await mkdir("renders/v8", { recursive: true });
await writeFile(
  "renders/v8/performance.json",
  JSON.stringify(
    { browser: "Chrome; browser acceleration enabled", results },
    null,
    2,
  ),
);
