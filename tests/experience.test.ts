import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Experience,
  DEMO_KNOTS,
  curveAt,
  demoCursorAt,
  type Point,
} from "../src/engine/experience";
import {
  AUTO_EVENTS,
  BASE_MODEL,
  applyIntent,
  cloudAt,
  demoModelAt,
  canAct,
} from "../src/engine/cloud";
import { POINTER_VERTICES } from "../src/engine/pointer";
import {
  sculptureAngle,
  sculpturePose,
  ribbonPoint,
  SCULPTURE_PERIOD,
} from "../src/engine/sculpture";
import { DURATION } from "../src/engine/constants";
import { codeCharacters, CODE_LENGTH, CODE_LINES } from "../src/engine/code";
const near = (a: number, b: number, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} ≉ ${b}`);
const samePoint = (a: Point, b: Point, tolerance = 1e-5) => {
  for (const key of ["x", "y", "vx", "vy"] as const)
    near(a[key], b[key], tolerance);
};

test("one visible Hermite cursor is C1, has analytic velocity and pauses at actual command locations", () => {
  for (const knot of DEMO_KNOTS.slice(1, -1))
    samePoint(
      curveAt(DEMO_KNOTS, knot.t - 1e-7),
      curveAt(DEMO_KNOTS, knot.t + 1e-7),
      0.001,
    );
  for (let t = 0.05; t < DURATION; t += 0.123) {
    const p = demoCursorAt(t),
      a = demoCursorAt(t - 1e-7),
      b = demoCursorAt(t + 1e-7);
    near(p.vx, (b.x - a.x) / 2e-7, 0.0001);
    near(p.vy, (b.y - a.y) / 2e-7, 0.0001);
    assert.ok(p.x > 0 && p.x < 970 && p.y > 0 && p.y < 535);
  }
  for (const event of AUTO_EVENTS) {
    const p = demoCursorAt(event.time);
    near(p.vx, 0);
    near(p.vy, 0);
  }
  samePoint(demoCursorAt(0), demoCursorAt(DURATION));
});
test("pointer is mirror symmetric with a 240 degree reentrant skeleton", () => {
  const [a, b, c, d] = POINTER_VERTICES;
  assert.deepEqual(a, { x: 0, y: 0 });
  assert.equal(c.x, c.y);
  near(b.x, d.y);
  near(b.y, d.x);
  const u = { x: b.x - c.x, y: b.y - c.y },
    v = { x: d.x - c.x, y: d.y - c.y };
  near(
    360 -
      (Math.acos(
        (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)),
      ) *
        180) /
        Math.PI,
    240,
  );
});
test("240 Hz physical cache is periodic, deterministic, read-only and below 700 KiB", () => {
  const a = new Experience(),
    b = new Experience();
  assert.equal(a.seamError, 0);
  assert.ok(a.bytes < 700 * 1024);
  for (const t of [0, 3.38, 9.081, 13.8, 20.7, 24, 200])
    assert.deepEqual(a.sample(t), b.sample(t));
  const before = a.sample(8.931);
  [24, 2.7, 18.36, 0, 200].forEach((t) => a.sample(t));
  assert.deepEqual(a.sample(8.931), before);
  assert.deepEqual(a.sample(200).card, a.sample(8).card);
  samePoint(a.sample(200).cursor, a.sample(8).cursor);
});
test("manual inspection interrupts pointer motion without restarting the running deployment", () => {
  const e = new Experience();
  e.record("deploy", 2.62);
  for (const [t, target] of [
    [2.88, 2],
    [3.01, 1],
  ] as const) {
    const before = e.sample(t);
    e.record("inspect", t, target);
    const after = e.sample(t);
    samePoint(before.cursor, after.cursor);
    samePoint(before.card, after.card);
    before.buttons.forEach((p, i) => samePoint(p, after.buttons[i]));
    assert.deepEqual(
      after.visual.nodes.map((n) => ({ ...n, selected: false })),
      before.visual.nodes.map((n) => ({ ...n, selected: false })),
    );
    assert.equal(after.visual.model.operation?.start, 2.62);
    const next = e.sample(t + 1e-6).cursor;
    near((next.x - after.cursor.x) / 1e-6, after.cursor.vx, 0.01);
    near((next.y - after.cursor.y) / 1e-6, after.cursor.vy, 0.01);
  }
  assert.equal(e.sample(6.5).visual.busy, false);
  assert.equal(e.sample(6.5).visual.revision, 2);
  assert.equal(e.recording.length, 3);
});
test("deploy, scaling, self-healing and rollback change persistent service state", () => {
  const e = new Experience();
  assert.equal(e.record("deploy", 1), true);
  assert.equal(e.sample(1.5).visual.busy, true);
  assert.equal(e.sample(4.81).visual.revision, 2);
  assert.ok(
    e
      .sample(4.81)
      .visual.nodes.filter((n) => n.active)
      .every((n) => n.version === 2),
  );
  e.record("scale", 5);
  assert.equal(e.sample(5.05).visual.desired, 5);
  assert.equal(e.sample(5.05).visual.actual, 3);
  assert.equal(e.sample(7.3).visual.actual, 5);
  e.record("fault", 8, 1);
  assert.equal(e.sample(8.3).visual.actual, 4);
  assert.equal(e.sample(8.3).visual.nodes[1].phase, "failed");
  assert.equal(e.sample(9.2).visual.nodes[1].phase, "recovering");
  assert.equal(e.sample(11).visual.actual, 5);
  e.record("rollback", 12);
  assert.equal(e.sample(15).visual.revision, 1);
  assert.equal(e.sample(15).visual.model.previous, null);
  assert.equal(e.sample(200).visual.desired, 5);
  assert.equal(e.sample(200).visual.revision, 1);
  assert.equal(e.sample(200).visual.manual, true);
});
test("unavailable operations do not mutate history, and inspection remains available during work", () => {
  const e = new Experience();
  assert.equal(e.record("rollback", 0), false);
  e.record("deploy", 1);
  const original = e.recording;
  assert.equal(e.record("fault", 1.2), false);
  assert.deepEqual(e.recording, original);
  assert.equal(e.record("inspect", 1.2, 2), true);
  assert.equal(e.sample(1.3).visual.model.selected, 2);
  e.record("inspect", 1.4, 2);
  assert.equal(e.sample(1.5).visual.model.selected, null);
  e.record("inspect", 4.9, 2);
  e.record("fault", 5);
  assert.equal(e.sample(5.3).visual.nodes[2].phase, "failed");
  assert.equal(e.sample(5.3).visual.model.operation?.target, 2);
});
test("serialized command recordings exactly replay interrupted motion and service state", () => {
  const a = new Experience();
  a.record("deploy", 1);
  a.record("inspect", 1.23, 2);
  a.record("scale", 5);
  a.record("fault", 8, 1);
  a.record("inspect", 8.25, 1);
  a.record("rollback", 12);
  const b = new Experience();
  b.restore(JSON.parse(JSON.stringify(a.recording)));
  for (const t of [0, 1, 1.3, 5.07, 8.3, 9.78123, 12.2, 15, 300, 2.7])
    assert.deepEqual(b.sample(t), a.sample(t));
  assert.ok(Object.isFrozen(a.recording));
  assert.ok(Object.isFrozen(a.recording[0]));
});
test("editing the past replaces only future intents; malformed and old recordings reject", () => {
  const e = new Experience();
  e.record("deploy", 1);
  e.record("scale", 5);
  e.record("fault", 8);
  e.record("inspect", 2, 2);
  assert.deepEqual(e.recording, [
    { time: 1, action: "deploy" },
    { time: 2, action: "inspect", target: 2 },
  ]);
  assert.throws(() => e.record("deploy", NaN));
  assert.throws(() => e.record("scale", -1));
  assert.throws(() =>
    e.restore([
      { time: 5, action: "scale" },
      { time: 1, action: "inspect", target: 2 },
    ]),
  );
  assert.throws(() => e.restore([{ time: 0, action: "inspect", target: 6 }]));
  e.reset();
  assert.equal(e.recording.length, 0);
});
test("default demonstration restores its original deployment and three replicas before looping", () => {
  const final = cloudAt(demoModelAt(27.8), 27.8);
  assert.equal(final.desired, 3);
  assert.equal(final.actual, 3);
  assert.equal(final.revision, 1);
  assert.equal(final.busy, false);
  assert.equal(final.model.previous, null);
  assert.equal(canAct(BASE_MODEL, "rollback", 0), false);
  const inspected = applyIntent(BASE_MODEL, {
    time: 0,
    action: "inspect",
    target: 0,
  });
  assert.equal(inspected, BASE_MODEL);
});
test("Ribbon roll and counterclockwise spin share a deterministic 288-second cycle", () => {
  assert.equal(SCULPTURE_PERIOD, 288);
  assert.ok(sculpturePose(1).spin < 0);
  assert.deepEqual(sculpturePose(288), sculpturePose(0));
  near(sculptureAngle(72), sculptureAngle(0));
  near(sculptureAngle(12.5 + 72), sculptureAngle(12.5));
  near(sculptureAngle(1) - sculptureAngle(0), Math.PI / 36);
  near(
    sculptureAngle(19.999) + 2 * Math.PI - sculptureAngle(20.001),
    2 * Math.PI - (0.002 * Math.PI) / 36,
  );
});
test("Highlighted source appears in ordered character prefixes and completes before submission", () => {
  assert.equal(codeCharacters(0), 0);
  assert.equal(codeCharacters(6.1), CODE_LENGTH);
  let previous = 0;
  for (let t = 0; t < 6.1; t += 0.031) {
    const count = codeCharacters(t);
    assert.ok(count >= previous && count <= CODE_LENGTH);
    assert.equal(codeCharacters(t + 32, 32), count);
    previous = count;
  }
  assert.ok(new Set(CODE_LINES.flat().map((token) => token.color)).size >= 5);
});
test("User activation skips its button and continues with the next valid cloud operation", () => {
  const e = new Experience();
  const before = e.sample(2.62);
  e.record("deploy", 2.62);
  samePoint(e.sample(2.62).cursor, before.cursor);
  for (let t = 2.72; t <= 6; t += 0.1) {
    const p = e.sample(t).cursor;
    assert.ok(
      p.x > 310,
      "Already submitted: pointer must not revisit the commit button",
    );
    assert.equal(e.sample(t).visual.automatic, false);
  }
  const next = e.sample(8.63);
  assert.equal(next.visual.action, "scale");
  assert.equal(next.visual.automatic, true);
  assert.equal(next.visual.revision, 2);
  assert.equal(next.visual.desired, 5);
  near(next.cursor.x, 429);
  near(next.cursor.y, 497);
  e.record("inspect", 9, 2);
  near(e.sample(9).visual.model.operation!.start, 8.62, 1e-10);
  assert.equal(e.sample(9).visual.action, "scale");
});
test("Intrinsic ribbon motion fixes its centerline, preserves width and closes the Mobius seam", () => {
  for (const u of [0, 0.8, 2, 4.5, Math.PI * 2]) {
    const center = ribbonPoint(u, 0, 0);
    for (const flow of [0, 0.5, Math.PI / 2, Math.PI]) {
      const current = ribbonPoint(u, 0, flow);
      near(current.x, center.x);
      near(current.y, center.y);
      near(current.z, center.z);
      const edge = ribbonPoint(u, 1, flow);
      near(
        Math.hypot(edge.x - center.x, edge.y - center.y, edge.z - center.z),
        68,
      );
    }
  }
  for (const flow of [0, 0.6, 2.5]) {
    const a = ribbonPoint(0, 1, flow),
      b = ribbonPoint(Math.PI * 2, -1, flow);
    near(a.x, b.x);
    near(a.y, b.y);
    near(a.z, b.z);
  }
});
