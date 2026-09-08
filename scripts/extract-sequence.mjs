import { parseArgs } from "node:util";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";

const { values: args } = parseArgs({
  options: {
    input: { type: "string" },
    out: { type: "string", default: "public/media/recording" },
    fps: { type: "string", default: "30" },
    duration: { type: "string", default: "10" },
    offset: { type: "string", default: "0" },
    start: { type: "string", default: "2" },
    width: { type: "string", default: "1000" },
    format: { type: "string", default: "png" },
    label: { type: "string", default: "真实产品录屏" },
    source: { type: "string", default: "local recording" },
  },
});
if (!args.input)
  throw new Error("Usage: npm run extract -- --input path/to/recording.mp4");
const fps = Number(args.fps),
  duration = Number(args.duration),
  width = Number(args.width),
  offset = Number(args.offset),
  startTime = Number(args.start);
if (
  ![fps, duration, width, offset, startTime].every(Number.isFinite) ||
  fps <= 0 ||
  duration <= 0 ||
  width <= 0 ||
  offset < 0 ||
  startTime < 0 ||
  fps * duration > 900 ||
  !Number.isInteger(fps) ||
  !Number.isInteger(width)
)
  throw new Error("Invalid frame extraction settings (maximum 900 frames).");
if (!["png", "jpg"].includes(args.format))
  throw new Error("Format must be png or jpg.");
const output = resolve(args.out),
  publicRoot = resolve("public");
const path = relative(publicRoot, output);
if (path.startsWith("..") || path === "")
  throw new Error("--out must be a subdirectory of public.");
await mkdir(output, { recursive: true });
if ((await readdir(output)).length)
  throw new Error("Output folder must be empty. Choose a new --out.");
const result = spawnSync(
  process.env.FFMPEG_PATH || "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-n",
    "-ss",
    String(offset),
    "-i",
    resolve(args.input),
    "-t",
    String(duration),
    "-vf",
    `fps=${fps},scale=${width}:-2:flags=lanczos`,
    "-start_number",
    "0",
    ...(args.format === "jpg" ? ["-q:v", "2"] : []),
    resolve(output, `frame-%06d.${args.format}`),
  ],
  { encoding: "utf8" },
);
if (result.error || result.status !== 0)
  throw new Error(result.error?.message || result.stderr);
const frameCount = (await readdir(output)).filter((name) =>
  /^frame-\d{6}\.(png|jpg)$/.test(name),
).length;
if (!frameCount)
  throw new Error("No frames extracted. Check input and offset.");
const url = `/${path.split(sep).join("/")}`;
const manifest = {
  version: 1,
  enabled: true,
  fps,
  frameCount,
  startTime,
  startNumber: 0,
  pattern: `${url}/frame-{frame}.${args.format}`,
  poster: `${url}/frame-000000.${args.format}`,
  label: args.label,
  source: args.source,
};
await writeFile(
  resolve(output, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  `Extracted ${frameCount} frames. Copy ${output}/manifest.json to public/media/product/manifest.json to activate. PNG preserves the decoded recording pixels before optional scaling; JPEG is lossy.`,
);
