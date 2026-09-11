import assert from "node:assert/strict";
import { createBrowser, preparePage } from "./browser.mjs";

const base = process.env.VERIFY_URL || "http://127.0.0.1:4173";
const browser = await createBrowser();
try {
  const { page, context, errors } = await preparePage(browser, { dpr: 1 });
  const held = [];
  const requests = [];
  // Leave all font/image downloads pending: the hero must remain usable anyway.
  await page.route(/\.(?:woff2?|webp)(?:\?|$)/, (route) => { held.push(route); });
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__frame?.t > 0.1, null, { timeout: 5000 });
  assert.ok(await page.locator("#workspace-canvas").evaluate((canvas) =>
    canvas.getContext("2d").getImageData(10, 10, 1, 1).data[3] > 0,
  ), "Laptop canvas must be painted while fonts and product images are pending");
  assert.ok(!requests.some((url) => /smart-shop-concept/.test(url)),
    "Below-fold Smart Shop artwork must not compete with first paint");
  assert.ok(!requests.some((url) => /\/media\/|\/icons\//.test(url)),
    "The hero must not fetch unversioned PNGs, icon files or a sequence manifest");
  await page.getByRole("button", { name: "暂停品牌动效" }).click();
  const pausedAt = await page.evaluate(() => window.__frame.t);
  await Promise.all([
    page.waitForRequest(/smart-shop-concept.*\.webp/),
    page.locator("#product-canvas").scrollIntoViewIfNeeded(),
  ]);
  await page.unroute(/\.(?:woff2?|webp)(?:\?|$)/);
  await Promise.all(held.map((route) => route.continue()));
  await page.evaluate(() => window.__ready);
  await page.waitForFunction(() => document.querySelector("#product-canvas")
    .getContext("2d").getImageData(10, 10, 1, 1).data[3] > 0);
  assert.equal(await page.evaluate(() => window.__frame.t), pausedAt,
    "Late image/font decoding must repaint without resuming or resetting the clock");
  assert.deepEqual(errors, []);
  await context.close();
  console.log("PASS hero paints before downloads; products load near viewport; late assets preserve pause");

  const failed = await preparePage(browser, { dpr: 1, reducedMotion: "reduce" });
  await failed.page.route(/\.(?:woff2?|webp)(?:\?|$)/, (route) => route.abort());
  await failed.page.goto(base, { waitUntil: "domcontentloaded" });
  await failed.page.waitForFunction(() => window.__frame?.t === 3.2);
  await failed.page.evaluate(() => window.__ready);
  await failed.page.getByRole("button", { name: "云原生：提交并部署" }).click();
  assert.equal(await failed.page.evaluate(() => window.__frame.cloud.revision), 2);
  await failed.page.locator("#product-canvas").scrollIntoViewIfNeeded();
  await failed.page.locator("#sequence-error").waitFor({ state: "visible" });
  assert.equal(await failed.page.evaluate(() => window.__renderError), undefined);
  assert.equal(await failed.page.evaluate(() => window.__frame.cloud.revision), 2);
  await failed.context.close();
  console.log("PASS failed optional downloads do not stop the laptop or reduced-motion interactions");
} finally {
  await browser.close();
}
