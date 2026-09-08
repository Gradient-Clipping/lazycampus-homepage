import { clamp } from "./math";

type V = { x: number; y: number; z: number };
function orient(p: V): V {
  const a = 0.92,
    b = -0.34,
    c = -0.42;
  const y = p.y * Math.cos(a) - p.z * Math.sin(a),
    z = p.y * Math.sin(a) + p.z * Math.cos(a);
  const x = p.x * Math.cos(b) + z * Math.sin(b),
    zz = -p.x * Math.sin(b) + z * Math.cos(b);
  return {
    x: x * Math.cos(c) - y * Math.sin(c),
    y: x * Math.sin(c) + y * Math.cos(c),
    z: zz,
  };
}
export function ribbonPoint(u: number, v: number, flow: number): V {
  const angle = u / 2 + flow;
  return {
    x: (146 + v * 68 * Math.cos(angle)) * Math.cos(u),
    y: (146 + v * 68 * Math.cos(angle)) * Math.sin(u),
    z: v * 68 * Math.sin(angle),
  };
}
export const FLOW_PERIOD = 72,
  SPIN_PERIOD = 96,
  SCULPTURE_PERIOD = 288;
const cycle = (time: number, period: number) =>
  ((time % period) + period) % period;
export const sculptureAngle = (time: number) =>
  (cycle(time, FLOW_PERIOD) / FLOW_PERIOD) * Math.PI * 2;
export const sculpturePose = (time: number) => ({
  flow: sculptureAngle(time),
  spin: (-cycle(time, SPIN_PERIOD) / SPIN_PERIOD) * Math.PI * 2,
});

const U = 192,
  V_STEPS = 12,
  COUNT = (U + 1) * (V_STEPS + 1);
const positions = new Float64Array(COUNT * 3),
  normals = new Float64Array(COUNT * 3),
  warmth = new Float64Array(COUNT);
const projected = new Float64Array(COUNT * 3),
  colors = new Uint8Array(COUNT * 3);
const triangles = new Uint16Array(U * V_STEPS * 6);
// Shared topology and storage are allocated once. Each ribbon cross-section rolls
// about its own tangent; v=0 stays exactly on the fixed circular centerline.
for (let i = 0; i <= U; i++)
  for (let j = 0; j <= V_STEPS; j++) {
    const index = i * (V_STEPS + 1) + j;
    if (i < U && j < V_STEPS) {
      const b = index + V_STEPS + 1,
        offset = (i * V_STEPS + j) * 6;
      triangles.set([index, b, b + 1, index, b + 1, index + 1], offset);
    }
  }
function rollRibbon(flow: number) {
  for (let i = 0; i <= U; i++) {
    const u = (i / U) * Math.PI * 2,
      cu = Math.cos(u),
      su = Math.sin(u),
      ca = Math.cos(u / 2 + flow),
      sa = Math.sin(u / 2 + flow);
    for (let j = 0; j <= V_STEPS; j++) {
      const v = (j / V_STEPS) * 2 - 1,
        index = i * (V_STEPS + 1) + j,
        p = index * 3,
        radius = 146 + v * 68 * ca;
      positions[p] = radius * cu;
      positions[p + 1] = radius * su;
      positions[p + 2] = v * 68 * sa;
      const nx = radius * sa * cu - v * 34 * su,
        ny = radius * sa * su + v * 34 * cu,
        nz = -radius * ca,
        length = Math.hypot(nx, ny, nz);
      normals[p] = nx / length;
      normals[p + 1] = ny / length;
      normals[p + 2] = nz / length;
      warmth[index] = (sa * v + 1) * 0.5;
    }
  }
}
function shade(index: number, nx: number, ny: number, nz: number) {
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const diffuse = clamp(nx * -0.38 + ny * -0.58 + nz * 0.72);
  const softbox = Math.exp(
    -((nx + 0.33) ** 2 / 0.038 + (ny + 0.32) ** 2 / 0.35),
  );
  const rim = Math.exp(-((nx - 0.66) ** 2 / 0.023 + (ny - 0.04) ** 2 / 0.9));
  const dark = Math.exp(-((nx - 0.13) ** 2 / 0.032 + (ny + 0.01) ** 2 / 0.8));
  const sheen =
    0.53 + diffuse * 0.48 + softbox * 0.55 + rim * 0.5 - dark * 0.26;
  const w = warmth[index],
    p = index * 3;
  colors[p] = Math.round(clamp((133 + w * 17) * sheen, 0, 255));
  colors[p + 1] = Math.round(clamp((152 + w * 9) * sheen, 0, 255));
  colors[p + 2] = Math.round(clamp((118 + w * 21) * sheen, 0, 255));
}
let viewportKey = "",
  lastPhase = NaN,
  dpr = 1;
let pixels: ImageData, ground: Uint8ClampedArray, depth: Float32Array;

/** Canvas 2D software rasterization: one pixel upload instead of thousands of paths.
 * A depth buffer resolves the twisted surface correctly at every angle. Gouraud
 * lighting uses the rotated surface normals, independent of seek history. */
export function drawSculpture(canvas: HTMLCanvasElement, time: number) {
  const next = `${innerWidth}:${innerHeight}:${devicePixelRatio}`,
    phase = cycle(time, SCULPTURE_PERIOD),
    { flow, spin } = sculpturePose(time);
  const c = canvas.getContext("2d")!;
  if (next !== viewportKey) {
    viewportKey = next;
    dpr = Math.max(0.5, (devicePixelRatio * canvas.clientWidth) / 600);
    canvas.width = Math.round(600 * dpr);
    canvas.height = Math.round(480 * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.save();
    c.translate(304, 440);
    c.scale(1, 0.14);
    const shadow = c.createRadialGradient(0, 0, 10, 0, 0, 203);
    shadow.addColorStop(0, "#34452c27");
    shadow.addColorStop(0.45, "#34452c12");
    shadow.addColorStop(1, "#34452c00");
    c.fillStyle = shadow;
    c.fillRect(-208, -208, 416, 416);
    c.restore();
    ground = c.getImageData(0, 0, canvas.width, canvas.height).data;
    pixels = c.createImageData(canvas.width, canvas.height);
    depth = new Float32Array(canvas.width * canvas.height);
    lastPhase = NaN;
  }
  if (phase === lastPhase) return;
  lastPhase = phase;
  pixels.data.set(ground);
  depth.fill(-Infinity);
  rollRibbon(flow);
  const cs = Math.cos(spin),
    ss = Math.sin(spin);
  // Intrinsic ribbon roll and a separate camera-plane CCW turn. No world-Y flip.
  const columns = [
    orient({ x: 1, y: 0, z: 0 }),
    orient({ x: 0, y: 1, z: 0 }),
    orient({ x: 0, y: 0, z: 1 }),
  ].map((p) => ({ x: p.x * cs - p.y * ss, y: p.x * ss + p.y * cs, z: p.z }));
  const [a, b, d] = columns;
  for (let i = 0; i < COUNT; i++) {
    const p = i * 3,
      x = positions[p] * a.x + positions[p + 1] * b.x + positions[p + 2] * d.x,
      y = positions[p] * a.y + positions[p + 1] * b.y + positions[p + 2] * d.y,
      z = positions[p] * a.z + positions[p + 1] * b.z + positions[p + 2] * d.z;
    const perspective = 1 / (1 - z / 1100);
    projected[p] = (300 + x * 1.04 * perspective) * dpr;
    projected[p + 1] = (230 + y * 1.04 * perspective) * dpr;
    projected[p + 2] = z;
    shade(
      i,
      normals[p] * a.x + normals[p + 1] * b.x + normals[p + 2] * d.x,
      normals[p] * a.y + normals[p + 1] * b.y + normals[p + 2] * d.y,
      normals[p] * a.z + normals[p + 1] * b.z + normals[p + 2] * d.z,
    );
  }
  const width = canvas.width,
    height = canvas.height,
    rgba = pixels.data;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * 3,
      b = triangles[i + 1] * 3,
      cc = triangles[i + 2] * 3;
    const x0 = projected[a],
      y0 = projected[a + 1],
      x1 = projected[b],
      y1 = projected[b + 1],
      x2 = projected[cc],
      y2 = projected[cc + 1];
    const area = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(area) < 0.001) continue;
    const dx0 = (y1 - y2) / area,
      dy0 = (x2 - x1) / area,
      dx1 = (y2 - y0) / area,
      dy1 = (x0 - x2) / area;
    let low = a,
      middle = b,
      high = cc;
    if (projected[low + 1] > projected[middle + 1]) {
      const swap = low;
      low = middle;
      middle = swap;
    }
    if (projected[middle + 1] > projected[high + 1]) {
      const swap = middle;
      middle = high;
      high = swap;
    }
    if (projected[low + 1] > projected[middle + 1]) {
      const swap = low;
      low = middle;
      middle = swap;
    }
    const xl = projected[low],
      yl = projected[low + 1],
      xm = projected[middle],
      ym = projected[middle + 1],
      xh = projected[high],
      yh = projected[high + 1];
    const longSlope = (xh - xl) / (yh - yl),
      topSlope = (xm - xl) / (ym - yl),
      bottomSlope = (xh - xm) / (yh - ym);
    const minY = Math.max(0, Math.ceil(yl - 0.5)),
      maxY = Math.min(height - 1, Math.floor(yh - 0.5));
    const za = projected[a + 2] - projected[cc + 2],
      zb = projected[b + 2] - projected[cc + 2];
    const ra = colors[a] - colors[cc],
      rb = colors[b] - colors[cc];
    const ga = colors[a + 1] - colors[cc + 1],
      gb = colors[b + 1] - colors[cc + 1];
    const ba = colors[a + 2] - colors[cc + 2],
      bb = colors[b + 2] - colors[cc + 2];
    const dz = dx0 * za + dx1 * zb,
      dr = dx0 * ra + dx1 * rb,
      dg = dx0 * ga + dx1 * gb,
      db = dx0 * ba + dx1 * bb;
    // Walk only the covered span of each scanline. Slender projected triangles
    // would waste most of their bounding box on rejected pixel tests.
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5,
        edge = xl + (py - yl) * longSlope,
        other =
          py < ym ? xl + (py - yl) * topSlope : xm + (py - ym) * bottomSlope;
      const minX = Math.max(0, Math.ceil(Math.min(edge, other) - 0.5)),
        maxX = Math.min(width - 1, Math.floor(Math.max(edge, other) - 0.5));
      const u = dx0 * (minX + 0.5 - x2) + dy0 * (py - y2),
        v = dx1 * (minX + 0.5 - x2) + dy1 * (py - y2);
      let z = projected[cc + 2] + u * za + v * zb,
        r = colors[cc] + u * ra + v * rb,
        g = colors[cc + 1] + u * ga + v * gb,
        blue = colors[cc + 2] + u * ba + v * bb;
      for (
        let x = minX, index = y * width + minX;
        x <= maxX;
        x++, index++, z += dz, r += dr, g += dg, blue += db
      ) {
        if (z <= depth[index]) continue;
        depth[index] = z;
        const p = index * 4;
        rgba[p] = r;
        rgba[p + 1] = g;
        rgba[p + 2] = blue;
        rgba[p + 3] = 255;
      }
    }
  }
  c.putImageData(pixels, 0, 0);
  canvas.dataset.angle = flow.toFixed(9);
  canvas.dataset.flow = flow.toFixed(9);
  canvas.dataset.spin = spin.toFixed(9);
}
let studioKey = "";
export function drawStudio(canvas: HTMLCanvasElement) {
  const next = `${innerWidth}:${innerHeight}:${devicePixelRatio}`;
  if (next === studioKey) return;
  studioKey = next;
  const dpr = (devicePixelRatio * canvas.getBoundingClientRect().width) / 760;
  canvas.width = Math.round(760 * dpr);
  canvas.height = Math.round(640 * dpr);
  const c = canvas.getContext("2d")!;
  c.scale(dpr, dpr);
  c.save();
  c.translate(413, 533);
  c.scale(1, 0.15);
  const shadow = c.createRadialGradient(0, 0, 15, 0, 0, 318);
  shadow.addColorStop(0, "#26304b35");
  shadow.addColorStop(0.5, "#26304b20");
  shadow.addColorStop(1, "#26304b00");
  c.fillStyle = shadow;
  c.fillRect(-320, -320, 640, 640);
  c.restore();
}
