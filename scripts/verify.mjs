import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createBrowser, preparePage, readyPage } from "./browser.mjs";
const url = process.env.VERIFY_URL || "http://127.0.0.1:4173",
  out = resolve("renders/v8.1/verification");
await mkdir(out, { recursive: true });
const browser = await createBrowser();
const report = {
  checks: [],
  screenshots: [],
  browser: await browser.version(),
};
const check = (name, detail) => {
  report.checks.push({ name, status: "passed", detail });
  console.log(`PASS ${name}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function verifyDeliveryGeometry(page) {
  const packets = await page
    .locator(".pipeline-connector")
    .evaluateAll((nodes) =>
      nodes.map((svg) => {
        const dot = svg.querySelector(".pipeline-packet");
        const circle = dot.getBoundingClientRect();
        const viewport = svg.getBoundingClientRect();
        const start = svg.querySelector(".pipeline-line").getPointAtLength(0);
        return {
          width: circle.width,
          height: circle.height,
          offsetY:
            circle.y + circle.height / 2 - viewport.y - viewport.height / 2,
          pathOffsetY: start.y - svg.clientHeight / 2,
        };
      }),
    );
  assert.equal(packets.length, 2);
  for (const packet of packets) {
    assert.ok(Math.abs(packet.width - 6) < 0.02);
    assert.ok(
      Math.abs(packet.height - packet.width) < 0.02,
      "Delivery dots must remain circular in screen coordinates",
    );
    assert.ok(Math.abs(packet.offsetY) < 0.6);
    assert.equal(packet.pathOffsetY, 0);
  }
}
try {
  const { page, context, errors } = await preparePage(browser, {
    width: 1440,
    height: 960,
    dpr: 2,
  });
  await readyPage(page, `${url}/?t=2&hud&render`);
  assert.match(await page.title(), /云原生/);
  assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
  assert.equal(await page.evaluate(() => window.__timeline.version), 7);
  check("Production page, assets and v7 timeline are ready");
  await verifyDeliveryGeometry(page);
  check(
    "Delivery dots retain a circular 6px footprint on the arrow centerline at DPR 2",
  );
  const seek = async (t) =>
    page.evaluate((t) => {
      window.__seek(t);
      return window.__frame;
    }, t);
  const bytesAt = async (t) => {
    await seek(t);
    return page.screenshot({ type: "png", scale: "device", caret: "hide" });
  };
  const baseline = await bytesAt(7.83127);
  for (const t of [23.5, 0, 3.12, 14.8, 1.001]) await seek(t);
  assert.equal(hash(await bytesAt(7.83127)), hash(baseline));
  await page.waitForTimeout(200);
  assert.equal(
    hash(
      await page.screenshot({ type: "png", scale: "device", caret: "hide" }),
    ),
    hash(baseline),
  );
  check(
    "DPR 2 fractional random seeking and delayed capture are pixel-identical",
    hash(baseline),
  );
  const second = await preparePage(browser, {
    width: 1440,
    height: 960,
    dpr: 2,
  });
  await readyPage(second.page, `${url}/?t=7.83127&hud&render`);
  assert.equal(
    hash(
      await second.page.screenshot({
        type: "png",
        scale: "device",
        caret: "hide",
      }),
    ),
    hash(baseline),
  );
  await second.context.close();
  check("Independent browser context produces identical pixels");
  const points = [
      0, 0.33, 1.52, 3.87, 6.4, 6.88, 8.2, 12.2, 13.9, 16.4, 19.2, 20.2, 24.7,
      30.4, 32, 288, 200,
    ],
    hashes = new Map();
  for (const t of points) hashes.set(t, hash(await bytesAt(t)));
  for (const t of [...points].reverse())
    assert.equal(hash(await bytesAt(t)), hashes.get(t), `Reverse t=${t}`);
  check(
    "Seventeen deployment, scale, failure and loop states survive reverse pixel comparison",
  );
  const sculpture = async (t) =>
    page.evaluate((t) => {
      window.__seek(t);
      const c = document.querySelector("#about-sculpture");
      return {
        image: c.toDataURL(),
        alpha: c.getContext("2d").getImageData(0, 0, 1, 1).data[3],
        angle: c.dataset.angle,
        background: getComputedStyle(document.querySelector(".continuity-art"))
          .backgroundColor,
      };
    }, t);
  const art0 = await sculpture(0),
    art12 = await sculpture(12);
  assert.equal(art0.alpha, 0);
  assert.equal(art0.background, "rgba(0, 0, 0, 0)");
  assert.notEqual(art0.image, art12.image);
  await sculpture(42);
  assert.deepEqual(await sculpture(12), art12);
  assert.equal((await sculpture(288)).image, art0.image);
  assert.equal(await page.locator(".art-topline").count(), 0);
  check(
    "Mobius mesh rotates with lighting, has transparent corners and a deterministic 288-second cycle",
  );
  await seek(8.2);
  const full = await page.screenshot({ fullPage: true, scale: "css" });
  await seek(41);
  await seek(8.2);
  assert.equal(
    hash(await page.screenshot({ fullPage: true, scale: "css" })),
    hash(full),
  );
  check(
    "Full-page capture including the moving sculpture is history-independent",
  );
  assert.equal(
    await page.locator(".screen-home, [data-workspace-tab]").count(),
    0,
  );
  assert.equal(
    await page.locator(".screen-controls .concept-control").count(),
    4,
  );
  assert.doesNotMatch(
    await page.locator(".scene-viewport").innerText(),
    /easy campus|smart shop|校园|零售/i,
  );
  check(
    "Laptop contains one cloud-native workspace and no product-switching interactions",
  );
  await seek(1.5);
  const earlyCode = Number(
    await page.locator("#workspace-canvas").getAttribute("data-characters"),
  );
  assert.equal(
    await page.locator("#workspace-canvas").getAttribute("data-view"),
    "code",
  );
  await seek(6.1);
  assert.ok(
    Number(
      await page.locator("#workspace-canvas").getAttribute("data-characters"),
    ) > earlyCode,
  );
  assert.equal(
    await page
      .locator('.screen-controls [data-cloud-action="scale"]')
      .isHidden(),
    true,
  );
  await seek(8.8);
  assert.equal(
    await page.locator("#workspace-canvas").getAttribute("data-view"),
    "cloud",
  );
  check(
    "Highlighted code appears progressively before submission and transitions to the running service",
  );
  const geometry = await page.evaluate(() => {
    const r = (s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return {
      back: [r(".back-left"), r(".back-right")],
      front: [r(".front-left"), r(".front-right")],
      display: r(".laptop-display"),
      deck: r(".laptop-deck"),
    };
  });
  assert.ok(
    geometry.front[1].x - geometry.front[0].x >
      geometry.back[1].x - geometry.back[0].x,
  );
  assert.ok(geometry.deck.h < geometry.display.h * 0.4);
  check("Thin laptop retains physically consistent keyboard perspective");
  const command = (action) =>
      page.locator(`.screen-controls [data-cloud-action="${action}"]`),
    pod = (i) => page.locator(`[data-pod-index="${i}"]`);
  await seek(2.62);
  assert.equal(await command("rollback").isDisabled(), true);
  const before = await page.evaluate(() => window.__frame.cursor);
  await command("deploy").click();
  const after = await seek(2.62);
  for (const key of ["x", "y", "vx", "vy"])
    assert.ok(Math.abs(before[key] - after.cursor[key]) < 0.0001);
  assert.equal(after.cloud.revision, 2);
  assert.equal(after.cloud.busy, true);
  assert.equal(await command("scale").isDisabled(), true);
  for (const t of [2.8, 3.2, 3.7]) assert.ok((await seek(t)).cursor.x > 310);
  const continuation = await seek(8.63);
  assert.equal(continuation.cloud.action, "scale");
  assert.equal(continuation.cloud.revision, 2);
  assert.equal(continuation.cloud.desired, 5);
  check(
    "Manual submission skips the completed button and continues with scaling without another deployment",
  );
  await seek(4.1);
  const interrupted = await page.evaluate(() => window.__frame.cursor);
  await pod(2).focus();
  await page.keyboard.press("Enter");
  const inspected = await seek(4.1);
  for (const key of ["x", "y", "vx", "vy"])
    assert.ok(Math.abs(interrupted[key] - inspected.cursor[key]) < 0.0001);
  assert.equal(inspected.cloud.selected, 2);
  assert.equal(inspected.cloud.busy, true);
  assert.equal((await seek(6.5)).cloud.busy, false);
  assert.equal((await seek(6.5)).cloud.actual, 3);
  check(
    "Deployment changes version, command availability and instance inspection without restarting progress or jumping the cursor",
  );
  await seek(7);
  await command("scale").click();
  assert.equal((await seek(7.1)).cloud.desired, 5);
  assert.equal((await seek(7.1)).cloud.actual, 3);
  assert.equal((await seek(9.3)).cloud.actual, 5);
  assert.equal(await page.locator(".pod-hit:not([hidden])").count(), 5);
  check("Scale command adds two actual instances and waits for readiness");
  await seek(10);
  await command("fault").click();
  assert.equal((await seek(10.3)).cloud.actual, 4);
  await pod(3).click();
  assert.equal((await seek(10.3)).cloud.selected, 3);
  assert.equal((await seek(12.9)).cloud.actual, 5);
  check(
    "Failure drops a replica; inspection is available while automatic recovery restores it",
  );
  await seek(13);
  await command("rollback").click();
  assert.equal((await seek(16)).cloud.revision, 1);
  assert.equal((await seek(16)).cloud.desired, 5);
  assert.equal(await command("rollback").isDisabled(), true);
  await seek(16.5);
  await command("scale").click();
  assert.equal((await seek(19)).cloud.desired, 3);
  assert.equal((await seek(19)).cloud.actual, 3);
  assert.equal(await page.locator(".pod-hit:not([hidden])").count(), 3);
  assert.equal((await seek(200)).cloud.revision, 1);
  check(
    "Rollback restores the previous version; scale-down removes replicas and manual state persists",
  );
  const recording = await page.evaluate(() => window.__timeline.recording);
  await writeFile(
    resolve(out, "interaction-recording.json"),
    JSON.stringify(recording, null, 2),
  );
  await page.mouse.move(10, 10);
  await page.evaluate(() => document.activeElement.blur());
  const replay = await preparePage(browser, {
    width: 1440,
    height: 960,
    dpr: 2,
  });
  await replay.page.addInitScript((recording) => {
    window.__initialRecording = recording;
  }, recording);
  await readyPage(replay.page, `${url}/?t=2&hud&render`);
  for (const t of [2.81, 3.21, 7.12, 10.78123, 13.34, 200]) {
    const live = await bytesAt(t);
    await replay.page.evaluate((t) => window.__seek(t), t);
    assert.equal(
      hash(
        await replay.page.screenshot({
          type: "png",
          scale: "device",
          caret: "hide",
        }),
      ),
      hash(live),
      `Recording replay t=${t}`,
    );
  }
  assert.deepEqual(replay.errors, []);
  await replay.context.close();
  check(
    "Recorded cloud actions and cursor interruptions replay identical pixels in an independent context",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出交互记录" }).click(),
  ]);
  assert.equal(download.suggestedFilename(), "lazycampus-interactions.json");
  await page.getByRole("button", { name: "重新播放电脑演示" }).click();
  assert.equal(
    await page.evaluate(() => window.__timeline.recording.length),
    0,
  );
  assert.equal((await seek(2)).cloud.revision, 1);
  check("Recording download and explicit reset restore the original demo");
  for (const icon of ["kubernetes", "git-branch", "flux"])
    assert.ok(
      await page.locator(`[data-supplied-icon="${icon}"] > img`).count(),
    );
  assert.ok(
    (await page.locator(".easy-campus-story").boundingBox()).y <
      (await page.locator(".smart-shop-story").boundingBox()).y,
  );
  assert.equal(
    await page
      .locator("#easy-campus-concept")
      .evaluate((img) => img.complete && img.naturalWidth === 1536),
    true,
  );
  assert.ok(
    await page.locator('a[href="mailto:support@lazycampus.com"]').count(),
  );
  const links = await page
    .locator('a[href^="https:"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  assert.ok(links.includes("https://github.com/ystemsrx/easy-campus"));
  assert.ok(links.includes("https://shop.lazycampus.com"));
  assert.ok(!links.some((link) => /bbbto|easy-swu|；/i.test(link)));
  check(
    "Product concepts, original icons and contact routes remain intact outside the laptop",
  );
  await readyPage(page, `${url}/?play`);
  const t0 = await page.evaluate(() => window.__frame.t);
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate((t) => window.__frame.t > t, t0));
  await seek(4.2);
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.__frame.t), 4.2);
  assert.equal((await seek(-10)).t, 0);
  assert.equal((await seek(200)).phase, 8);
  assert.equal(
    await page.evaluate(() => {
      try {
        window.__seek(NaN);
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );
  check(
    "Preview uses the sole seek clock; external seeks freeze both screen and sculpture",
  );
  await readyPage(page, `${url}/?t=2&render`);
  for (const [name, t] of [
    ["hero", 6.1],
    ["code-typing", 2.8],
    ["deployment", 8.8],
    ["scale", 13.3],
    ["self-healing", 17.1],
    ["rollback", 25.2],
  ]) {
    await seek(t);
    const path = resolve(out, `${name}.png`);
    await page.screenshot({ path, scale: "device" });
    report.screenshots.push(path);
  }
  await seek(12);
  await page
    .locator("#about")
    .screenshot({ path: resolve(out, "about.png"), scale: "css" });
  await seek(6.1);
  await page.screenshot({
    path: resolve(out, "desktop-full.png"),
    fullPage: true,
    scale: "css",
  });
  for (const section of ["capabilities", "approach", "products", "contact"])
    await page
      .locator(`#${section}`)
      .screenshot({ path: resolve(out, `${section}.png`), scale: "css" });
  await seek(1.65);
  await page
    .locator("#gitops")
    .screenshot({ path: resolve(out, "delivery-dot.png"), scale: "css" });
  await page
    .locator("#platform")
    .screenshot({ path: resolve(out, "platform.png"), scale: "css" });
  check("Final desktop and transparent rotating art screenshots captured");
  await readyPage(page, `${url}/?t=2`);
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "smooth",
  );
  const destination = await page
    .locator("#capabilities")
    .evaluate((el) => el.getBoundingClientRect().top + scrollY - 35);
  await page.getByRole("link", { name: "探索云原生能力", exact: true }).click();
  await page.waitForTimeout(100);
  const midway = await page.evaluate(() => scrollY);
  assert.ok(midway > 0 && midway < destination - 3);
  await page.waitForFunction((y) => Math.abs(scrollY - y) < 3, destination);
  check("Internal navigation scrolls smoothly through intermediate positions");
  assert.deepEqual(errors, []);
  await context.close();
  for (const width of [320, 390, 768, 1024]) {
    const mobile = await preparePage(browser, { width, height: 844, dpr: 1 });
    await readyPage(mobile.page, `${url}/?t=2&render`);
    assert.equal(
      await mobile.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(
      await mobile.page.locator(".workspace-mobile-controls").count(),
      0,
    );
    assert.equal(await mobile.page.locator("[data-cloud-action]").count(), 4);
    await verifyDeliveryGeometry(mobile.page);
    const columns = await mobile.page
      .locator(".stratum-content")
      .evaluateAll((rows) =>
        rows.map((row) =>
          [...row.children].map((cell) => {
            const r = cell.getBoundingClientRect();
            return { x: r.x, width: r.width };
          }),
        ),
      );
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(columns[0][i].x - columns[1][i].x) < 0.1);
      assert.ok(Math.abs(columns[0][i].width - columns[1][i].width) < 0.1);
    }
    if (width === 390) {
      const caption = await mobile.page
        .locator(".studio-caption")
        .boundingBox();
      const scene = await mobile.page.locator(".scene-viewport").boundingBox();
      const footer = await mobile.page.locator(".hero-bottom").boundingBox();
      assert.ok(caption.y + caption.height <= scene.y + scene.height + 1);
      assert.ok(caption.y + caption.height < footer.y);
      await mobile.page
        .locator('.screen-controls [data-cloud-action="deploy"]')
        .click();
      await mobile.page.evaluate(() => window.__seek(6.2));
      await mobile.page
        .locator('.screen-controls [data-cloud-action="scale"]')
        .click();
      await mobile.page.evaluate(() => window.__seek(8.5));
      assert.equal(
        await mobile.page.evaluate(() => window.__frame.cloud.desired),
        5,
      );
      await mobile.page.getByLabel("展开导航").click();
      assert.equal(
        await mobile.page
          .getByRole("navigation", { name: "移动导航" })
          .isVisible(),
        true,
      );
      await mobile.page.getByLabel("展开导航").click();
      await mobile.page.screenshot({
        path: resolve(out, "mobile-full.png"),
        fullPage: true,
      });
      await mobile.page
        .locator("#hero")
        .screenshot({ path: resolve(out, "mobile-hero.png"), scale: "css" });
      await mobile.page.locator("#capabilities").screenshot({
        path: resolve(out, "mobile-capabilities.png"),
        scale: "css",
      });
      await mobile.page
        .locator("#about")
        .screenshot({ path: resolve(out, "mobile-about.png"), scale: "css" });
      await mobile.page
        .locator("#platform")
        .screenshot({
          path: resolve(out, "mobile-platform.png"),
          scale: "css",
        });
      await mobile.page.setViewportSize({ width: 768, height: 844 });
      await mobile.page.waitForFunction(() => {
        const svg = document.querySelector(".pipeline-connector");
        return (
          Number(svg.querySelector(".pipeline-packet").getAttribute("cy")) ===
          svg.clientHeight / 2
        );
      });
      await verifyDeliveryGeometry(mobile.page);
    }
    assert.deepEqual(mobile.errors, []);
    await mobile.context.close();
    check(
      `Responsive ${width}px layout and available controls work without overflow`,
    );
  }
  const reduced = await preparePage(browser, {
    width: 390,
    height: 844,
    dpr: 1,
    reducedMotion: "reduce",
  });
  await readyPage(reduced.page, `${url}/?play`);
  const stopped = await reduced.page.evaluate(() => window.__frame.t),
    angle = await reduced.page
      .locator("#about-sculpture")
      .getAttribute("data-angle");
  await reduced.page.waitForTimeout(200);
  assert.equal(await reduced.page.evaluate(() => window.__frame.t), stopped);
  await reduced.page
    .locator('.screen-controls [data-cloud-action="deploy"]')
    .click();
  assert.equal(
    await reduced.page.evaluate(() => window.__frame.cloud.revision),
    2,
  );
  assert.equal(
    await reduced.page.evaluate(() => window.__frame.cloud.busy),
    false,
  );
  assert.equal(
    await reduced.page.locator("#about-sculpture").getAttribute("data-angle"),
    angle,
  );
  assert.deepEqual(reduced.errors, []);
  await reduced.context.close();
  check(
    "Reduced motion keeps the sculpture still and immediately completes explicit cloud actions",
  );
} finally {
  await browser.close();
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
}
console.log(`Verification complete: ${report.checks.length} checks. ${out}`);
