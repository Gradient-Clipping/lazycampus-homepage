import { arrival, clamp, mix, squash } from "./math";
import { project, RING, RING_N, STAGE, type PhysicsFrame } from "./physics";

const SURFACE_SIZE = 520;
const HALF = SURFACE_SIZE / 2;
let baseTexture: ImageBitmap | null = null;
let textureDpr = 0;
let surface: OffscreenCanvas | null = null;
let surfaceKey = "";

/** Bake the fully shaded material once per display resolution, not once per frame. */
function bakeMaterial(dpr: number) {
  const segments = 96,
    sides = 64;
  const vertices = new Float32Array(segments * sides * 3);
  const faces: { ids: number[]; depth: number; color: string }[] = [];
  for (let i = 0; i < segments; i++) {
    const u = (i / segments) * Math.PI * 2;
    for (let j = 0; j < sides; j++) {
      const v = (j / sides) * Math.PI * 2;
      const p = project(
        (RING.radius + RING.tube * Math.cos(v)) * Math.cos(u),
        (RING.radius + RING.tube * Math.cos(v)) * Math.sin(u),
        RING.tube * Math.sin(v),
      );
      vertices.set([p.x, p.y, p.z], (i * sides + j) * 3);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const u = ((i + 0.5) / segments) * Math.PI * 2,
        v = ((j + 0.5) / sides) * Math.PI * 2;
      const n = project(
        Math.cos(u) * Math.cos(v),
        Math.sin(u) * Math.cos(v),
        Math.sin(v),
      );
      if (n.z < -0.03) continue;
      const light = clamp(n.x * -0.35 + n.y * -0.65 + n.z * 0.64);
      const specular = clamp(n.x * -0.18 + n.y * -0.32 + n.z * 0.93) ** 32;
      const ids = [
        i * sides + j,
        ((i + 1) % segments) * sides + j,
        ((i + 1) % segments) * sides + ((j + 1) % sides),
        i * sides + ((j + 1) % sides),
      ];
      faces.push({
        ids,
        depth: ids.reduce((s, id) => s + vertices[id * 3 + 2], 0) / 4,
        color: `rgb(${Math.round(24 + light * 35 + specular * 65)},${Math.round(39 + light * 47 + specular * 69)},${Math.round(153 + light * 89 + specular * 13)})`,
      });
    }
  }
  faces.sort((a, b) => a.depth - b.depth);
  const size = Math.round(SURFACE_SIZE * dpr),
    buffer = new OffscreenCanvas(size, size);
  const ctx = buffer.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 0.65;
  for (const { ids, color } of faces) {
    ctx.beginPath();
    ctx.moveTo(HALF + vertices[ids[0] * 3], HALF + vertices[ids[0] * 3 + 1]);
    for (let k = 1; k < 4; k++)
      ctx.lineTo(HALF + vertices[ids[k] * 3], HALF + vertices[ids[k] * 3 + 1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.fill();
    ctx.stroke();
  }
  baseTexture?.close();
  baseTexture = buffer.transferToImageBitmap();
  surface = new OffscreenCanvas(size, size);
  textureDpr = dpr;
  surfaceKey = "";
}

// Screen-space strips map back to the same projected 72-node physical ring.
// Local affine warps preserve the shaded texture and the tube's planar area.
const STRIP_COUNT = 256;
const strips = Array.from({ length: STRIP_COUNT }, (_, i) => {
  const angle = ((i + 0.5) / STRIP_COUNT) * Math.PI * 2,
    halfAngle = Math.PI / STRIP_COUNT + 0.0006;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    cb = Math.cos(0.72);
  const u =
    (((Math.atan2(s / cb, c) + 0.48) % (Math.PI * 2)) + Math.PI * 2) %
    (Math.PI * 2);
  const radial = 1 / Math.hypot(c, s / cb);
  const path = new Path2D();
  path.moveTo(HALF, HALF);
  path.lineTo(
    HALF + Math.cos(angle - halfAngle) * 600,
    HALF + Math.sin(angle - halfAngle) * 600,
  );
  path.lineTo(
    HALF + Math.cos(angle + halfAngle) * 600,
    HALF + Math.sin(angle + halfAngle) * 600,
  );
  path.closePath();
  return { c, s, node: (u / (Math.PI * 2)) * RING_N, radial, path };
});

function torus(
  ctx: CanvasRenderingContext2D,
  state: PhysicsFrame,
  time: number,
  dpr: number,
) {
  if (textureDpr !== dpr) bakeMaterial(dpr);
  const shape = state.ring.map((x) => Math.round(x * 64) / 64);
  const key = shape.join(",");
  if (key !== surfaceKey) {
    const material = surface!.getContext("2d")!;
    material.setTransform(dpr, 0, 0, dpr, 0, 0);
    material.clearRect(0, 0, SURFACE_SIZE, SURFACE_SIZE);
    material.drawImage(baseTexture!, 0, 0, SURFACE_SIZE, SURFACE_SIZE);
    for (const strip of strips) {
      const { c, s, node, radial, path } = strip;
      const d = mix(
        shape[Math.floor(node)],
        shape[(Math.floor(node) + 1) % RING_N],
        node % 1,
      );
      if (Math.abs(d) < 1 / 128) continue;
      const stretch = 1 - (d * 0.1) / RING.tube,
        perpendicular = 1 / stretch;
      const a = c * c * stretch + s * s * perpendicular,
        b = c * s * (stretch - perpendicular),
        dd = s * s * stretch + c * c * perpendicular;
      const anchorX = HALF + c * RING.radius * radial,
        anchorY = HALF + s * RING.radius * radial;
      const tx = anchorX + c * d * radial - a * anchorX - b * anchorY,
        ty = anchorY + s * d * radial - b * anchorX - dd * anchorY;
      material.save();
      material.clip(path);
      material.clearRect(0, 0, SURFACE_SIZE, SURFACE_SIZE);
      material.transform(a, b, b, dd, tx, ty);
      material.drawImage(baseTexture!, 0, 0, SURFACE_SIZE, SURFACE_SIZE);
      material.restore();
    }
    surfaceKey = key;
  }
  const entry = arrival(time, 0, 28, 8, 0.96);
  const deformation = squash(state.card.vx * 0.3, entry.v, 0.00015, 0.025);
  ctx.save();
  ctx.globalAlpha = clamp(1 - entry.x / 40);
  ctx.translate(RING.x + state.card.x * 0.3, RING.y + entry.x);
  ctx.rotate(deformation.angle);
  ctx.scale(deformation.x, deformation.y);
  ctx.rotate(-deformation.angle);
  ctx.drawImage(surface!, -HALF, -HALF, SURFACE_SIZE, SURFACE_SIZE);
  ctx.restore();
}
function ropeAndBall(ctx: CanvasRenderingContext2D, state: PhysicsFrame) {
  const points = state.rope,
    end = points[points.length - 1],
    prior = points[points.length - 2];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = "#696a5e";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(154, 123, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#383a31";
  ctx.fill();
  ctx.translate(end.x, end.y + 20);
  const stretch = squash(
    state.ropeVelocity.x,
    state.ropeVelocity.y,
    0.0004,
    0.055,
  );
  ctx.rotate(stretch.angle);
  ctx.scale(stretch.x, stretch.y);
  ctx.rotate(-stretch.angle);
  ctx.rotate(Math.atan2(end.x - prior.x, end.y - prior.y) * -0.35);
  const gradient = ctx.createRadialGradient(-17, -23, 3, 4, 9, 59);
  gradient.addColorStop(0, "#ffbd79");
  gradient.addColorStop(0.3, "#ff8240");
  gradient.addColorStop(0.72, "#f55722");
  gradient.addColorStop(1, "#b9300b");
  ctx.shadowColor = "#983c2420";
  ctx.shadowBlur = 19;
  ctx.shadowOffsetY = 15;
  ctx.beginPath();
  ctx.arc(0, 0, 49, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#792704";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-17, -7);
  ctx.lineTo(-13, -4);
  ctx.moveTo(11, -5);
  ctx.lineTo(15, -8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1, -1, 16, 0.2, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}

let rasterViewport = "";
let rasterDpr = 1;

/** A tiny Canvas path keeps the cursor above the DOM card without SVG/filter
 * layer sampling changing with seek history. The hotspot is exactly the spline p.
 */
export function drawCursor(
  canvas: HTMLCanvasElement,
  p: { x: number; y: number },
  t: number,
) {
  const width = Math.round(STAGE.width * rasterDpr),
    height = Math.round(STAGE.height * rasterDpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(rasterDpr, 0, 0, rasterDpr, 0, 0);
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);
  ctx.save();
  ctx.globalAlpha = clamp(t * 1.8) * 0.78;
  ctx.translate(p.x, p.y);
  ctx.scale(0.82, 0.82);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(20, 17);
  ctx.lineTo(10, 18);
  ctx.lineTo(6, 28);
  ctx.closePath();
  ctx.fillStyle = "#252721";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawScene(
  canvas: HTMLCanvasElement,
  state: PhysicsFrame,
  time: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  const viewport = `${innerWidth}:${innerHeight}:${devicePixelRatio}`;
  if (viewport !== rasterViewport) {
    // Match actual display pixels, including the fixed responsive scene scale.
    // A mobile scene should not rasterize a desktop-size DPR 2 buffer every frame.
    rasterDpr =
      ((window.devicePixelRatio || 1) * canvas.getBoundingClientRect().width) /
      STAGE.width;
    rasterViewport = viewport;
  }
  const dpr = rasterDpr;
  const width = Math.round(STAGE.width * dpr),
    height = Math.round(STAGE.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);

  ctx.save();
  ctx.translate(411, 553);
  ctx.scale(1, 0.17);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 225);
  shadow.addColorStop(0, "#67645824");
  shadow.addColorStop(1, "#67645800");
  ctx.fillStyle = shadow;
  ctx.fillRect(-225, -225, 450, 450);
  ctx.restore();
  ropeAndBall(ctx, state);
  torus(ctx, state, time, dpr);

  const s = squash(state.follower.vx, state.follower.vy, 0.0004, 0.12);
  ctx.save();
  ctx.translate(state.follower.x, state.follower.y);
  ctx.rotate(s.angle);
  ctx.scale(s.x, s.y);
  const glow = ctx.createRadialGradient(-3, -4, 0, 0, 0, 12);
  glow.addColorStop(0, "#e5efb8");
  glow.addColorStop(0.5, "#bdcd6a");
  glow.addColorStop(1, "#839440");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
