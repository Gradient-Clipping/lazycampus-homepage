import { mkdir, writeFile, readFile, stat, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { createBrowser, preparePage, readyPage } from "./browser.mjs";

const { values: args } = parseArgs({
  options: {
    url: { type: "string", default: "http://127.0.0.1:4173" },
    out: { type: "string", default: "renders/master" },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "960" },
    dpr: { type: "string", default: "2" },
    fps: { type: "string", default: "60" },
    start: { type: "string", default: "0" },
    duration: { type: "string", default: "32" },
    encode: { type: "string", default: "ffv1" },
    time: { type: "string" },
    "full-page": { type: "boolean", default: false },
    section: { type: "string" },
    recording: { type: "string" },
  },
});
const width = Number(args.width),
  height = Number(args.height),
  dpr = Number(args.dpr);
const fps = Number(args.fps),
  start = Number(args.start),
  duration = Number(args.duration);
const single = args.time !== undefined;
for (const [key, n] of Object.entries({
  width,
  height,
  dpr,
  fps,
  start,
  duration,
  ...(single ? { time: Number(args.time) } : {}),
})) {
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    (["width", "height", "dpr", "fps", "duration"].includes(key) && n === 0)
  )
    throw new Error(`Invalid --${key}`);
}
if (![width, height, fps].every(Number.isInteger))
  throw new Error("Width, height and fps must be integers.");
if (!["ffv1", "h264rgb", "none"].includes(args.encode))
  throw new Error("--encode must be ffv1, h264rgb or none.");
if (args["full-page"] && !single)
  throw new Error(
    "--full-page is available for single frames; video uses a fixed viewport.",
  );
const out = resolve(args.out),
  frames = join(out, "frames");
// Refuse overwrite; render outputs are never silently removed or mixed.
try {
  await stat(join(out, "manifest.json"));
  throw new Error("Output already contains a render. Choose a new --out.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(frames, { recursive: true });
if ((await readdir(frames)).length)
  throw new Error("Output frames folder must be empty. Choose a new --out.");
const count = single ? 1 : Math.round(duration * fps);
if (!single && Math.abs(count - duration * fps) > 1e-6)
  throw new Error("duration × fps must be an integer.");
const url = new URL(args.url);
url.search = "";
url.searchParams.set("render", "");
url.searchParams.set("t", single ? args.time : String(start));
const browser = await createBrowser();
const { page, errors } = await preparePage(browser, { width, height, dpr });
let manifest;
try {
  if (args.recording) {
    const recording = JSON.parse(
      await readFile(resolve(args.recording), "utf8"),
    );
    await page.addInitScript((recording) => {
      window.__initialRecording = recording;
    }, recording);
  }
  await readyPage(page, url.href);
  if (args.section)
    await page.evaluate((id) => {
      const section = document.getElementById(id);
      if (!section) throw new Error(`Unknown section: ${id}`);
      section.scrollIntoView({ behavior: "instant", block: "start" });
    }, args.section);
  manifest = {
    version: 2,
    url: url.href,
    width,
    height,
    dpr,
    pixelWidth: width * dpr,
    pixelHeight: height * dpr,
    fps,
    start: single ? Number(args.time) : start,
    duration: single ? 0 : duration,
    frameCount: count,
    fullPage: args["full-page"],
    section: args.section || "hero",
    browser: await browser.version(),
    platform: process.platform,
    node: process.version,
    timezone: "Asia/Singapore",
    locale: "zh-CN",
    colorSpace: "sRGB",
    rasterizer: "software (--disable-gpu)",
    timeline: await page.evaluate(() => window.__timeline),
    frames: [],
  };
  // A source lock hash makes the rendering environment auditable.
  manifest.lockfileSha256 = createHash("sha256")
    .update(await readFile("package-lock.json"))
    .digest("hex");
  for (let i = 0; i < count; i++) {
    const t = single ? Number(args.time) : start + i / fps;
    await page.evaluate((time) => window.__seek(time), t);
    // __seek synchronously commits DOM, Canvas and HUD. Screenshot forces paint.
    const buffer = await page.screenshot({
      type: "png",
      fullPage: args["full-page"],
      animations: "disabled",
      caret: "hide",
      scale: "device",
    });
    const name = `frame-${String(i).padStart(6, "0")}.png`;
    await writeFile(join(frames, name), buffer);
    manifest.frames.push({
      file: name,
      t,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    });
    if (errors.length) throw new Error(errors.join("\n"));
    if (i % 60 === 0 || i === count - 1)
      console.log(`Rendered ${i + 1}/${count} · t=${t.toFixed(4)}s`);
  }
} finally {
  await browser.close();
}
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));

function ffmpeg(parameters) {
  const result = spawnSync(
    process.env.FFMPEG_PATH || "ffmpeg",
    ["-hide_banner", "-loglevel", "error", ...parameters],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || result.stderr);
  return result.stdout;
}
if (!single && args.encode !== "none") {
  const input = [
    "-framerate",
    String(fps),
    "-start_number",
    "0",
    "-i",
    join(frames, "frame-%06d.png"),
  ];
  const codec =
    args.encode === "ffv1"
      ? [
          "-c:v",
          "ffv1",
          "-level",
          "3",
          "-coder",
          "1",
          "-context",
          "1",
          "-g",
          "1",
          "-slicecrc",
          "1",
          "-pix_fmt",
          "bgr0",
        ]
      : [
          "-c:v",
          "libx264rgb",
          "-crf",
          "0",
          "-preset",
          "slow",
          "-pix_fmt",
          "rgb24",
        ];
  const video = join(
    out,
    args.encode === "ffv1" ? "master-ffv1.mkv" : "master-rgb.mp4",
  );
  ffmpeg(["-n", ...input, ...codec, "-an", video]);
  // Compare decoded RGB hashes for every frame, not only the container/codec label.
  const source = ffmpeg([...input, "-pix_fmt", "rgb24", "-f", "framemd5", "-"]);
  const decoded = ffmpeg([
    "-i",
    video,
    "-pix_fmt",
    "rgb24",
    "-f",
    "framemd5",
    "-",
  ]);
  const hashes = (text) =>
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(",").at(-1).trim());
  const a = hashes(source),
    b = hashes(decoded);
  if (
    a.length !== count ||
    b.length !== count ||
    a.some((hash, i) => hash !== b[i])
  )
    throw new Error(
      "Lossless verification failed: decoded RGB differs from source PNG.",
    );
  manifest.video = {
    file: video,
    codec: args.encode,
    verifiedRgbFrames: count,
    rgbIdentical: true,
  };
  await writeFile(
    join(out, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`Lossless RGB verified: ${count}/${count} frames. ${video}`);
}
console.log(`Render complete: ${out}`);
