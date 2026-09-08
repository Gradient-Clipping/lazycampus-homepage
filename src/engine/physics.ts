import { clamp, mix, springMatrix, type Spring } from "./math";
import { cursorAt, DURATION, phaseAt } from "./spline";
import { buttonWorld } from "./pose";

export const HZ = 240;
export const DT = 1 / HZ;
export const RING_N = 72;
export const ROPE_N = 22;
export const STAGE = { width: 760, height: 640 };
export const MAGNET = { radius: 130 };
export const RING = { x: 415, y: 290, radius: 164, tube: 62 };
export const PHYSICS = Object.freeze({
  magnet: { omega: 23, zeta: 0.58 },
  card: { omega: 9, zeta: 0.88 },
  follower: { omega: 11, zeta: 0.72 },
  ring: { omega: 19, zeta: 0.44, coupling: 180 },
  rope: { nodes: ROPE_N, iterations: 12, segmentLength: 15.6, gravity: 460 },
  warmupCycles: 3,
});

/** Shared projection keeps contact forces and the Canvas surface in one space. */
export function project(x: number, y: number, z: number) {
  const a = -0.48,
    b = 0.72;
  const xx = x * Math.cos(a) - y * Math.sin(a);
  const yy = x * Math.sin(a) + y * Math.cos(a);
  return {
    x: xx,
    y: yy * Math.cos(b) - z * Math.sin(b),
    z: yy * Math.sin(b) + z * Math.cos(b),
  };
}
export function ringCenterPoint(i: number) {
  const a = (i / RING_N) * Math.PI * 2;
  const p = project(Math.cos(a) * RING.radius, Math.sin(a) * RING.radius, 0);
  return { x: RING.x + p.x, y: RING.y + p.y };
}

const SCALARS = 12;
export const STRIDE = SCALARS + RING_N + ROPE_N * 2;
export type PhysicsCache = {
  values: Float32Array;
  count: number;
  bytes: number;
  contacts: number;
  seamError: number;
};

/** Exact affine spring update: trigonometric coefficients are compiled only once. */
const stepper = (omega: number, zeta: number) => {
  const m = springMatrix(omega, zeta, DT);
  return (s: Spring, target: number): Spring => ({
    x: target + m.xx * (s.x - target) + m.xv * s.v,
    v: m.vx * (s.x - target) + m.vv * s.v,
  });
};

/** Warm the closed input, then store one periodic cycle. No wall clock or randomness.
 * Typed double buffers avoid allocations for every spring-ring node at every step.
 */
export function precompute(): PhysicsCache {
  const steps = DURATION * HZ,
    count = steps + 1;
  const values = new Float32Array(count * STRIDE);
  let mx: Spring = { x: 0, v: 0 },
    my: Spring = { x: 0, v: 0 };
  let cx: Spring = { x: 0, v: 0 },
    cy: Spring = { x: 0, v: 0 };
  let fx: Spring = { x: 679, v: 0 },
    fy: Spring = { x: 582, v: 0 };
  let ringX = new Float64Array(RING_N),
    ringV = new Float64Array(RING_N);
  let nextX = new Float64Array(RING_N),
    nextV = new Float64Array(RING_N);
  const anchors = Array.from({ length: RING_N }, (_, i) => ringCenterPoint(i));
  const rope = Array.from({ length: ROPE_N }, (_, i) => ({
    x: 154,
    y: 123 + i * PHYSICS.rope.segmentLength,
    px: 154,
    py: 123 + i * PHYSICS.rope.segmentLength,
  }));
  const magnetStep = stepper(PHYSICS.magnet.omega, PHYSICS.magnet.zeta);
  const cardStep = stepper(PHYSICS.card.omega, PHYSICS.card.zeta);
  const followStep = stepper(PHYSICS.follower.omega, PHYSICS.follower.zeta);
  const ringStep = springMatrix(PHYSICS.ring.omega, PHYSICS.ring.zeta, DT);
  let contacts = 0;
  const save = (frame: number) => {
    const base = frame * STRIDE;
    values.set(
      [mx.x, my.x, mx.v, my.v, cx.x, cy.x, cx.v, cy.v, fx.x, fy.x, fx.v, fy.v],
      base,
    );
    for (let j = 0; j < RING_N; j++) values[base + SCALARS + j] = ringX[j];
    for (let j = 0; j < ROPE_N; j++) {
      values[base + SCALARS + RING_N + j * 2] = rope[j].x;
      values[base + SCALARS + RING_N + j * 2 + 1] = rope[j].y;
    }
  };
  for (let cycle = 0; cycle <= PHYSICS.warmupCycles; cycle++) {
    const recording = cycle === PHYSICS.warmupCycles;
    if (recording) save(0);
    for (let frame = 1; frame <= steps; frame++) {
      const phase = (frame - 0.5) * DT,
        p = cursorAt(phase);
      const anchor = buttonWorld(
        DURATION + phase,
        { x: cx.x, y: cy.x, vx: cx.v, vy: cy.v },
        { x: mx.x, y: my.x },
      );
      const dx = p.x - anchor.x,
        dy = p.y - anchor.y;
      const influence = clamp(1 - Math.hypot(dx, dy) / MAGNET.radius) ** 2;
      mx = magnetStep(mx, influence * (dx * 0.22 + p.vx * 0.035));
      my = magnetStep(my, influence * (dy * 0.22 + p.vy * 0.035));
      const cardInfluence =
        clamp(1 - Math.hypot(p.x - 425, p.y - 335) / 330) ** 2;
      cx = cardStep(cx, ((p.x - 425) * 0.035 + p.vx * 0.018) * cardInfluence);
      cy = cardStep(cy, ((p.y - 335) * 0.035 + p.vy * 0.018) * cardInfluence);
      fx = followStep(fx, p.x - 18);
      fy = followStep(fy, p.y - 5);

      // Read one complete state, write another: unbiased periodic Laplacian waves.
      let touching = false;
      for (let j = 0; j < RING_N; j++) {
        const point = anchors[j];
        const distance = Math.hypot(p.x - point.x - cx.x * 0.3, p.y - point.y);
        const contact = clamp(1 - distance / 104) ** 2;
        if (contact > 0.1) touching = true;
        const nx = (point.x - RING.x) / RING.radius,
          ny = (point.y - RING.y) / RING.radius;
        const velocityForce = (p.vx * nx + p.vy * ny) * 0.02;
        const laplacian =
          ringX[(j + RING_N - 1) % RING_N] +
          ringX[(j + 1) % RING_N] -
          2 * ringX[j];
        const target =
          contact * (-24 + velocityForce) +
          (PHYSICS.ring.coupling * laplacian) / PHYSICS.ring.omega ** 2;
        const y = ringX[j] - target;
        nextX[j] = target + ringStep.xx * y + ringStep.xv * ringV[j];
        nextV[j] = ringStep.vx * y + ringStep.vv * ringV[j];
      }
      [ringX, nextX] = [nextX, ringX];
      [ringV, nextV] = [nextV, ringV];
      if (recording && touching) contacts++;

      // A gentle cursor brush, rather than a large impulse, moves the hanging mass.
      for (let j = 1; j < ROPE_N; j++) {
        const r = rope[j],
          dx = r.x - p.x,
          dy = r.y - p.y;
        const d = Math.hypot(dx, dy),
          hit = clamp(1 - d / 70) ** 2;
        const vx = (r.x - r.px) * 0.993,
          vy = (r.y - r.py) * 0.993;
        r.px = r.x;
        r.py = r.y;
        r.x += vx + ((dx / Math.max(d, 1)) * 300 + p.vx * 4) * hit * DT * DT;
        r.y +=
          vy +
          (PHYSICS.rope.gravity +
            ((dy / Math.max(d, 1)) * 300 + p.vy * 4) * hit) *
            DT *
            DT;
      }
      for (
        let iteration = 0;
        iteration < PHYSICS.rope.iterations;
        iteration++
      ) {
        rope[0].x = 154;
        rope[0].y = 123;
        for (let j = 0; j < ROPE_N - 1; j++) {
          const a = rope[j],
            b = rope[j + 1],
            dx = b.x - a.x,
            dy = b.y - a.y;
          const d = Math.hypot(dx, dy),
            e = (d - PHYSICS.rope.segmentLength) / Math.max(d, 0.001);
          const wa = j === 0 ? 0 : 0.5,
            wb = j === 0 ? 1 : 0.5;
          a.x += dx * e * wa;
          a.y += dy * e * wa;
          b.x -= dx * e * wb;
          b.y -= dy * e * wb;
        }
      }
      if (recording) save(frame);
    }
  }
  let seamError = 0;
  for (let i = 0; i < STRIDE; i++)
    seamError = Math.max(
      seamError,
      Math.abs(values[i] - values[steps * STRIDE + i]),
    );
  return { values, count, bytes: values.byteLength, contacts, seamError };
}

/** Immutable interpolation: seek does not advance, copy or mutate the simulation. */
export function sample(cache: PhysicsCache, time: number) {
  const frame = phaseAt(time) * HZ;
  const a = Math.floor(frame),
    b = Math.min(cache.count - 1, a + 1),
    u = frame - a;
  const read = (i: number) =>
    mix(cache.values[a * STRIDE + i], cache.values[b * STRIDE + i], u);
  const velocity = (i: number) =>
    (cache.values[b * STRIDE + i] -
      cache.values[(b === a ? a - 1 : a) * STRIDE + i]) *
    HZ;
  return {
    magnet: { x: read(0), y: read(1), vx: read(2), vy: read(3) },
    card: { x: read(4), y: read(5), vx: read(6), vy: read(7) },
    follower: { x: read(8), y: read(9), vx: read(10), vy: read(11) },
    ring: Array.from({ length: RING_N }, (_, i) => read(SCALARS + i)),
    ropeVelocity: {
      x: velocity(SCALARS + RING_N + (ROPE_N - 1) * 2),
      y: velocity(SCALARS + RING_N + (ROPE_N - 1) * 2 + 1),
    },
    rope: Array.from({ length: ROPE_N }, (_, i) => ({
      x: read(SCALARS + RING_N + i * 2),
      y: read(SCALARS + RING_N + i * 2 + 1),
    })),
  };
}
export type PhysicsFrame = ReturnType<typeof sample>;
