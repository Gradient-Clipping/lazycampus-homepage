import { clamp, mix, springMatrix, springStep } from "./math";
import { DURATION, phaseAt } from "./constants";
import {
  CONTROLS,
  AUTO_EVENTS,
  applyIntent,
  cloudAt,
  demoModelAt,
  type Action,
  type CloudModel,
  type RecordedIntent,
} from "./cloud";
export { CONTROLS } from "./cloud";
export type { Action, RecordedIntent } from "./cloud";
export type Point = { x: number; y: number; vx: number; vy: number };
export type Knot = Point & { t: number };
export type Motion = { card: Point; buttons: Point[] };
export const SCREEN = { width: 1000, height: 564 };
const HZ = 240,
  STRIDE = (CONTROLS.length + 1) * 4;
const zero = (): Point => ({ x: 0, y: 0, vx: 0, vy: 0 });
const k = (t: number, x: number, y: number, vx = 0, vy = 0): Knot => ({
  t,
  x,
  y,
  vx,
  vy,
});
export const DEMO_KNOTS: Knot[] = [
  k(0, 864, 430),
  k(1.2, 754, 390, -80, 30),
  k(2.2, 660, 421),
  k(4.8, 660, 421),
  k(5.65, 360, 468, -130, 35),
  k(6.15, 207.5, 497),
  k(6.8, 207.5, 497),
  k(8.2, 730, 354, 120, -60),
  k(9.2, 742, 354),
  k(10.2, 742, 354),
  k(11.65, 429, 497),
  k(12.35, 429, 497),
  k(13.65, 868, 327),
  k(14.45, 868, 327),
  k(15.65, 635, 497),
  k(16.35, 635, 497),
  k(17.65, 421, 335),
  k(18.45, 421, 335),
  k(19.65, 429, 497),
  k(20.35, 429, 497),
  k(21.8, 705, 365),
  k(22.2, 705, 365),
  k(23.65, 822.5, 497),
  k(24.35, 822.5, 497),
  k(25.8, 577, 410),
  k(27, 577, 410),
  k(28.3, 863, 443),
  k(30, 863, 443),
  k(32, 864, 430),
];
/** Cubic Hermite position and analytic velocity; no easing clock or integration. */
export function curveAt(knots: readonly Knot[], time: number): Point {
  if (time <= knots[0].t) {
    const { x, y, vx, vy } = knots[0];
    return { x, y, vx, vy };
  }
  const last = knots[knots.length - 1];
  if (time >= last.t) return { x: last.x, y: last.y, vx: last.vx, vy: last.vy };
  let i = 0;
  while (time > knots[i + 1].t) i++;
  const a = knots[i],
    b = knots[i + 1],
    dt = b.t - a.t,
    u = (time - a.t) / dt,
    u2 = u * u,
    u3 = u2 * u;
  const result = zero();
  for (const [position, velocity] of [
    ["x", "vx"],
    ["y", "vy"],
  ] as const) {
    result[position] =
      (2 * u3 - 3 * u2 + 1) * a[position] +
      (u3 - 2 * u2 + u) * dt * a[velocity] +
      (-2 * u3 + 3 * u2) * b[position] +
      (u3 - u2) * dt * b[velocity];
    result[velocity] =
      ((6 * u2 - 6 * u) * a[position] +
        (3 * u2 - 4 * u + 1) * dt * a[velocity] +
        (-6 * u2 + 6 * u) * b[position] +
        (3 * u2 - 2 * u) * dt * b[velocity]) /
      dt;
  }
  return result;
}
export const demoCursorAt = (time: number) =>
  curveAt(DEMO_KNOTS, phaseAt(time));
const cardMatrix = springMatrix(12, 0.92, 1 / HZ),
  buttonMatrix = springMatrix(23, 0.72, 1 / HZ);
function stepBody(
  body: Point,
  tx: number,
  ty: number,
  m: ReturnType<typeof springMatrix>,
) {
  const x = body.x - tx,
    y = body.y - ty,
    vx = body.vx,
    vy = body.vy;
  body.x = tx + m.xx * x + m.xv * vx;
  body.vx = m.vx * x + m.vv * vx;
  body.y = ty + m.xx * y + m.xv * vy;
  body.vy = m.vx * y + m.vv * vy;
}
function targets(p: Point) {
  return [
    {
      x: (p.x - 500) * 0.0022 + p.vx * 0.0012,
      y: (p.y - 280) * 0.002 + p.vy * 0.0012,
    },
    ...CONTROLS.map((b) => {
      const dx = p.x - b.x - b.w / 2,
        dy = p.y - b.y - b.h / 2,
        force = clamp(1 - Math.hypot(dx, dy) / 104) ** 2;
      return {
        x: force * (dx * 0.07 + p.vx * 0.008),
        y: force * (dy * 0.07 + p.vy * 0.008),
      };
    }),
  ];
}
function pack(m: Motion) {
  return [m.card, ...m.buttons].flatMap((p) => [p.x, p.y, p.vx, p.vy]);
}
function unpack(v: ArrayLike<number>): Motion {
  const points = Array.from({ length: CONTROLS.length + 1 }, (_, i) => ({
    x: v[i * 4],
    y: v[i * 4 + 1],
    vx: v[i * 4 + 2],
    vy: v[i * 4 + 3],
  }));
  return { card: points[0], buttons: points.slice(1) };
}
function buildTape(
  cursor: (t: number) => Point,
  duration: number,
  initial?: Motion,
  warmup = 0,
) {
  const count = Math.round(duration * HZ) + 1,
    data = new Float32Array(count * STRIDE);
  const motion = initial
    ? unpack(pack(initial))
    : { card: zero(), buttons: CONTROLS.map(() => zero()) };
  for (let i = -warmup * Math.round(duration * HZ); i < count; i++) {
    const time = (((i / HZ) % duration) + duration) % duration;
    if (i >= 0) data.set(pack(motion), i * STRIDE);
    const force = targets(cursor(time));
    stepBody(motion.card, force[0].x, force[0].y, cardMatrix);
    motion.buttons.forEach((button, j) =>
      stepBody(button, force[j + 1].x, force[j + 1].y, buttonMatrix),
    );
  }
  return { data, count, duration };
}
type Tape = ReturnType<typeof buildTape>;
function sampleTape(tape: Tape, time: number): Motion {
  const sample = Math.max(0, Math.min(tape.count - 1, time * HZ)),
    i = Math.floor(sample),
    j = Math.min(i + 1, tape.count - 1),
    f = sample - i;
  const v = new Float64Array(STRIDE);
  for (let n = 0; n < STRIDE; n++)
    v[n] = mix(tape.data[i * STRIDE + n], tape.data[j * STRIDE + n], f);
  return unpack(v);
}
type Scheduled = {
  event: RecordedIntent;
  model: CloudModel;
  automatic: boolean;
};
type Branch = {
  event: RecordedIntent;
  knots: Knot[];
  scheduled: Scheduled[];
  tape: Tape;
};
type Step = { action: Action; target?: number };
function observation(
  action: Action,
  model: CloudModel,
  time: number,
  target?: number,
) {
  const state = cloudAt(model, time),
    node =
      state.nodes[target ?? model.operation?.target ?? model.selected ?? 2];
  if (action === "inspect")
    return { x: Math.min(910, node.x + 76), y: node.y + 32 };
  if (action === "scale")
    return model.desired === 5 ? { x: 868, y: 327 } : { x: 705, y: 365 };
  if (action === "fault") return { x: Math.min(910, node.x + 78), y: 335 };
  if (action === "rollback") return { x: 577, y: 410 };
  return { x: 742, y: 354 };
}
/** A short curved connection preserves the incoming tangent. Bend direction is
 * geometric, with no fixed upper-left parking point or mandatory return arc. */
function connect(
  knots: Knot[],
  end: number,
  goal: { x: number; y: number },
  bend = 0.06,
) {
  const start = knots[knots.length - 1],
    dx = goal.x - start.x,
    dy = goal.y - start.y,
    dt = end - start.t;
  knots.push(
    k(
      start.t + dt * 0.52,
      start.x + dx * 0.52 - dy * bend,
      start.y + dy * 0.52 + dx * bend,
      dx / dt,
      dy / dt,
    ),
    k(end, goal.x, goal.y),
  );
}
function appendHold(knots: Knot[], time: number) {
  const last = knots[knots.length - 1];
  if (time > last.t) knots.push(k(time, last.x, last.y));
}
function followSteps(action: Action, model: CloudModel): Step[] {
  if (action === "deploy")
    return model.desired === 3
      ? [
          { action: "scale" },
          { action: "fault" },
          { action: "scale" },
          { action: "rollback" },
        ]
      : [{ action: "fault" }, { action: "rollback" }];
  if (action === "scale")
    return [
      { action: "fault" },
      ...(model.previous !== null ? [{ action: "rollback" as const }] : []),
    ];
  if (action === "fault" && model.previous !== null)
    return [{ action: "rollback" }];
  return [];
}
function continuation(
  start: Point,
  event: RecordedIntent,
  model: CloudModel,
  steps: Step[],
) {
  const knots = [k(0, start.x, start.y, start.vx, start.vy)],
    scheduled: Scheduled[] = [{ event, model, automatic: false }];
  // The user already completed the activation. Go directly to its result.
  connect(
    knots,
    1.65,
    observation(event.action, model, event.time, event.target),
  );
  appendHold(knots, 2.15);
  let previous = event.time;
  for (const step of steps) {
    const busyEnd = model.operation
      ? model.operation.start + model.operation.duration
      : previous;
    const at = Math.max(previous + 3.8, busyEnd + 2.2),
      nextEvent = { ...step, time: at };
    const nextModel = applyIntent(model, nextEvent);
    if (nextModel === model) continue;
    const control = CONTROLS.find((c) => c.action === step.action)!;
    const center = {
        x: control.x + control.w / 2,
        y: control.y + control.h / 2,
      },
      local = at - event.time;
    appendHold(knots, local - 1.7);
    connect(knots, local - 0.2, center, -0.05);
    appendHold(knots, local + 0.3);
    connect(
      knots,
      local + 1.75,
      observation(step.action, nextModel, at, step.target),
      0.04,
    );
    appendHold(knots, local + 2.15);
    scheduled.push({ event: nextEvent, model: nextModel, automatic: true });
    model = nextModel;
    previous = at;
  }
  const duration = Math.ceil(knots[knots.length - 1].t + 5);
  appendHold(knots, duration);
  return { knots, scheduled, duration };
}
/** Fixed user intents compile a deterministic continuation. Future generated
 * steps are replaced when the user intervenes; already-clicked actions are skipped. */
export class Experience {
  private defaultTape = buildTape(demoCursorAt, DURATION, undefined, 3);
  private branches: Branch[] = [];
  get recording(): readonly RecordedIntent[] {
    return Object.freeze(this.branches.map((b) => b.event));
  }
  get bytes() {
    return (
      this.defaultTape.data.byteLength +
      this.branches.reduce((n, b) => n + b.tape.data.byteLength, 0)
    );
  }
  get seamError() {
    const a = sampleTape(this.defaultTape, 0),
      b = sampleTape(this.defaultTape, DURATION);
    return Math.max(...pack(a).map((v, i) => Math.abs(v - pack(b)[i])));
  }
  reset() {
    this.branches = [];
  }
  restore(recording: readonly RecordedIntent[]) {
    if (
      !Array.isArray(recording) ||
      recording.some(
        (e, i) =>
          !e ||
          !Number.isFinite(e.time) ||
          e.time < 0 ||
          !["deploy", "scale", "fault", "rollback", "inspect"].includes(
            e.action,
          ) ||
          (e.target !== undefined &&
            (!Number.isInteger(e.target) || e.target < 0 || e.target > 4)) ||
          (e.action === "inspect" && e.target === undefined) ||
          (i > 0 && e.time < recording[i - 1].time),
      )
    )
      throw new TypeError(
        "Recording v7 requires chronological {time, action, target?} intents.",
      );
    this.reset();
    for (const event of recording)
      if (!this.record(event.action, event.time, event.target))
        throw new TypeError("Recorded action is unavailable at that time.");
  }
  private branchAt(t: number) {
    for (let i = this.branches.length - 1; i >= 0; i--)
      if (this.branches[i].event.time <= t) return this.branches[i];
  }
  sample(t: number) {
    const b = this.branchAt(t);
    if (!b)
      return {
        ...sampleTape(this.defaultTape, phaseAt(t)),
        cursor: demoCursorAt(t),
        visual: {
          ...cloudAt(demoModelAt(t), t),
          manual: false,
          automatic: true,
        },
      };
    const age = t - b.event.time,
      cursor = curveAt(b.knots, age),
      motion = sampleTape(b.tape, age);
    if (age > b.tape.duration) {
      const force = targets(cursor);
      [motion.card, ...motion.buttons].forEach((body, i) => {
        const omega = i ? 23 : 12,
          zeta = i ? 0.72 : 0.92;
        const x = springStep(
            { x: body.x, v: body.vx },
            force[i].x,
            age - b.tape.duration,
            omega,
            zeta,
          ),
          y = springStep(
            { x: body.y, v: body.vy },
            force[i].y,
            age - b.tape.duration,
            omega,
            zeta,
          );
        body.x = x.x;
        body.vx = x.v;
        body.y = y.x;
        body.vy = y.v;
      });
    }
    let active = b.scheduled[0];
    for (const item of b.scheduled) if (item.event.time <= t) active = item;
    return {
      ...motion,
      cursor,
      visual: {
        ...cloudAt(active.model, t),
        manual: true,
        automatic: active.automatic,
      },
    };
  }
  record(action: Action, time: number, target?: number) {
    if (
      !["deploy", "scale", "fault", "rollback", "inspect"].includes(action) ||
      !Number.isFinite(time) ||
      time < 0
    )
      throw new TypeError("Invalid recorded interaction.");
    const start = this.sample(time),
      previous = this.branchAt(time);
    const event = Object.freeze({
        time,
        action,
        ...(target === undefined ? {} : { target }),
      }),
      model = applyIntent(start.visual.model, event);
    if (model === start.visual.model) return false;
    const cycle = Math.floor(time / DURATION) * DURATION;
    const pending = previous
      ? previous.scheduled
          .filter((s) => s.automatic && s.event.time > time)
          .map((s) => s.event)
      : AUTO_EVENTS.map((e) => ({ ...e, time: cycle + e.time })).filter(
          (e) => e.time > time,
        );
    const steps =
      action === "inspect"
        ? pending.map(({ action, target }) => ({ action, target }))
        : followSteps(action, model);
    const plan = continuation(start.cursor, event, model, steps);
    this.branches = this.branches.filter((b) => b.event.time <= time);
    const tape = buildTape((t) => curveAt(plan.knots, t), plan.duration, {
      card: start.card,
      buttons: start.buttons,
    });
    this.branches.push({
      event,
      knots: plan.knots,
      scheduled: plan.scheduled,
      tape,
    });
    return true;
  }
}
export const experience = new Experience();
