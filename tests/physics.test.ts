import { test } from "node:test";
import assert from "node:assert/strict";
import { springStep, springMatrix, squash } from "../src/engine/math";
import { CURSOR_KNOTS, cursorAt } from "../src/engine/spline";
import { deliveryPacket } from "../src/engine/workspace";
import {
  DT,
  HZ,
  PHYSICS,
  precompute,
  sample,
  STRIDE,
} from "../src/engine/physics";
import {
  fallbackManifest,
  framePath,
  sequenceFrame,
} from "../src/engine/sequence";

test("analytic spring composes in time for under, critical and overdamping", () => {
  for (const zeta of [0.24, 0.72, 1, 1.4]) {
    const initial = { x: 85, v: -120 };
    const direct = springStep(initial, 3, 0.8, 11, zeta);
    let split = initial;
    for (let i = 0; i < 192; i++) split = springStep(split, 3, DT, 11, zeta);
    assert.ok(Math.abs(direct.x - split.x) < 1e-9);
    assert.ok(Math.abs(direct.v - split.v) < 1e-8);
  }
});

test("spline is continuous in position and velocity at every knot", () => {
  const epsilon = 1e-6;
  for (const knot of CURSOR_KNOTS.slice(1, -1)) {
    const a = cursorAt(knot.t - epsilon),
      b = cursorAt(knot.t + epsilon),
      at = cursorAt(knot.t);
    assert.ok(Math.hypot(at.x - knot.x, at.y - knot.y) < 1e-8);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.002);
    assert.ok(Math.hypot(a.vx - b.vx, a.vy - b.vy) < 0.01);
  }
  assert.deepEqual(
    [cursorAt(0).vx, cursorAt(0).vy, cursorAt(24).vx, cursorAt(24).vy],
    [0, 0, 0, 0],
  );
});

test("spline analytic velocity agrees with numerical position derivative", () => {
  for (const t of [0.3, 2.2, 5.1, 8.4, 10.9, 14.2, 17.4, 22]) {
    const h = 1e-5,
      p = cursorAt(t),
      a = cursorAt(t - h),
      b = cursorAt(t + h);
    assert.ok(Math.abs((b.x - a.x) / (2 * h) - p.vx) < 1e-5);
    assert.ok(Math.abs((b.y - a.y) / (2 * h) - p.vy) < 1e-5);
  }
});

const cache = precompute();
test("delivery packets move forward and hide at the loop boundary", () => {
  for (const connector of [0, 1]) {
    let previous = 0;
    for (let time = 0; time < 8; time += 1 / 240) {
      const packet = deliveryPacket(time, connector);
      assert.ok(packet.progress >= previous - 1e-12);
      assert.ok(packet.opacity >= 0 && packet.opacity <= 1);
      previous = packet.progress;
    }
    assert.equal(deliveryPacket(7.999, connector).opacity, 0);
    assert.equal(deliveryPacket(8, connector).opacity, 0);
  }
});
test("independent 240 Hz simulations are byte-identical and finite", () => {
  const other = precompute();
  assert.equal(
    Buffer.compare(
      Buffer.from(cache.values.buffer),
      Buffer.from(other.values.buffer),
    ),
    0,
  );
  assert.equal(cache.count, 24 * HZ + 1);
  assert.equal(cache.values.length, cache.count * STRIDE);
  assert.ok(cache.values.every(Number.isFinite));
});

test("random and reverse seeks do not mutate the cache or depend on seek order", () => {
  const before = new Float32Array(cache.values);
  const expected = sample(cache, 7.83127);
  [24, 0, 14, 1.33, 21.1, 5, 0.001].forEach((t) => sample(cache, t));
  assert.deepEqual(sample(cache, 7.83127), expected);
  assert.deepEqual(cache.values, before);
});

test("rope pin and distance constraints remain bounded for every frame", () => {
  let maxError = 0;
  for (let i = 0; i < cache.count; i += 5) {
    const { rope } = sample(cache, i / HZ);
    assert.deepEqual(rope[0], { x: 154, y: 123 });
    for (let j = 1; j < rope.length; j++) {
      maxError = Math.max(
        maxError,
        Math.abs(
          Math.hypot(rope[j].x - rope[j - 1].x, rope[j].y - rope[j - 1].y) -
            PHYSICS.rope.segmentLength,
        ),
      );
    }
  }
  assert.ok(maxError < 0.18, `Rope error ${maxError}px`);
});

test("cursor contact gently dents the ring and dissipates after release", () => {
  const contact = sample(cache, 8.5).ring;
  assert.ok(Math.min(...contact) < -5);
  assert.ok(Math.max(...contact) - Math.min(...contact) > 5);
  assert.ok(contact.filter((x) => x < -2).length > 5);
  assert.ok(Math.max(...sample(cache, 24).ring.map(Math.abs)) < 0.04);
});

test("motion remains perceptible but bounded for a calm homepage", () => {
  assert.ok(cache.contacts > 0);
  let card = 0,
    rope = 0,
    ring = 0;
  for (let i = 0; i < cache.count; i += 4) {
    const s = sample(cache, i / HZ);
    card = Math.max(card, Math.hypot(s.card.x, s.card.y));
    rope = Math.max(rope, Math.abs(s.rope.at(-1)!.x - 154));
    ring = Math.max(ring, ...s.ring.map(Math.abs));
  }
  assert.ok(card > 0.5 && card < 6, `Card excursion ${card}`);
  assert.ok(rope > 8 && rope < 75, `Rope excursion ${rope}`);
  assert.ok(ring > 5 && ring < 32, `Ring indentation ${ring}`);
});

test("compiled spring matrices retain the analytical state transition", () => {
  for (const zeta of [0.44, 0.88, 1, 1.4]) {
    const m = springMatrix(19, zeta, DT),
      s = { x: 8, v: -13 },
      target = 2;
    const direct = springStep(s, target, DT, 19, zeta);
    assert.ok(
      Math.abs(direct.x - (target + m.xx * (s.x - target) + m.xv * s.v)) <
        1e-12,
    );
    assert.ok(
      Math.abs(direct.v - (m.vx * (s.x - target) + m.vv * s.v)) < 1e-12,
    );
  }
});

test("warm periodic cache closes in both position and velocity, without a reset jump", () => {
  assert.ok(cache.seamError < 0.0001, `Loop seam ${cache.seamError}`);
  assert.deepEqual(sample(cache, 200), sample(cache, 8));
  assert.deepEqual(cursorAt(200), cursorAt(8));
});

test("squash conserves planar area and vanishes at rest", () => {
  for (const v of [0, 70, 200, 700]) {
    const s = squash(v, v / 2);
    assert.ok(Math.abs(s.x * s.y - 1) < 1e-12);
    if (v === 0) assert.deepEqual([s.x, s.y], [1, 1]);
    else assert.ok(s.x > 1 && s.y < 1);
  }
});

test("30 fps product mapping handles boundaries, offsets and end hold", () => {
  const manifest = {
    ...fallbackManifest,
    enabled: true,
    frameCount: 90,
    startTime: 2,
  };
  assert.equal(sequenceFrame(0, manifest), 0);
  assert.equal(sequenceFrame(2 + 1 / 30, manifest), 1);
  assert.equal(sequenceFrame(2.999999, manifest), 29);
  assert.equal(sequenceFrame(3, manifest), 30);
  assert.equal(sequenceFrame(24, manifest), 89);
  assert.equal(
    framePath(8, { ...manifest, startNumber: 1 }),
    "/media/product/frame-000009.png",
  );
});
