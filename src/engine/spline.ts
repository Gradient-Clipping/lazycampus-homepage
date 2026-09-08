import { type Vec2 } from "./math";

export const DURATION = 24;
export type Knot = Vec2 & { t: number };
// One C1 continuous, time-aware cubic Hermite spline for every external force.
// Closed C1 path; physics is warmed to its periodic steady state before capture.
export const CURSOR_KNOTS: readonly Knot[] = [
  { t: 0, x: 702, y: 588 },
  { t: 1.1, x: 668, y: 536 },
  { t: 2.5, x: 585, y: 488 },
  { t: 3.2, x: 584, y: 484 },
  { t: 4.6, x: 646, y: 270 },
  { t: 5.7, x: 590, y: 193 },
  { t: 7.2, x: 310, y: 176 },
  { t: 8.5, x: 276, y: 250 },
  { t: 10, x: 205, y: 362 },
  { t: 11.1, x: 146, y: 442 },
  { t: 12.4, x: 222, y: 470 },
  { t: 13.7, x: 267, y: 485 },
  { t: 15, x: 580, y: 488 },
  { t: 16.3, x: 643, y: 268 },
  { t: 17.5, x: 534, y: 175 },
  { t: 18.8, x: 289, y: 178 },
  { t: 20.1, x: 278, y: 285 },
  { t: 21.2, x: 407, y: 510 },
  { t: 22.7, x: 685, y: 578 },
  { t: DURATION, x: 702, y: 588 },
];

export function phaseAt(time: number) {
  const t = Math.max(0, time);
  return t <= DURATION ? t : t % DURATION;
}

function tangent(i: number): Vec2 {
  if (i === 0 || i === CURSOR_KNOTS.length - 1) return { x: 0, y: 0 };
  const a = CURSOR_KNOTS[i - 1],
    b = CURSOR_KNOTS[i + 1];
  const tension = 0.74;
  return {
    x: (tension * (b.x - a.x)) / (b.t - a.t),
    y: (tension * (b.y - a.y)) / (b.t - a.t),
  };
}

export function cursorAt(time: number) {
  const t = phaseAt(time);
  let i = 0;
  while (i < CURSOR_KNOTS.length - 2 && t > CURSOR_KNOTS[i + 1].t) i++;
  const a = CURSOR_KNOTS[i],
    b = CURSOR_KNOTS[i + 1];
  const ma = tangent(i),
    mb = tangent(i + 1),
    dt = b.t - a.t;
  const u = (t - a.t) / dt,
    u2 = u * u,
    u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1,
    h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2,
    h11 = u3 - u2;
  const d00 = (6 * u2 - 6 * u) / dt,
    d10 = 3 * u2 - 4 * u + 1;
  const d01 = (-6 * u2 + 6 * u) / dt,
    d11 = 3 * u2 - 2 * u;
  return {
    x: h00 * a.x + h10 * dt * ma.x + h01 * b.x + h11 * dt * mb.x,
    y: h00 * a.y + h10 * dt * ma.y + h01 * b.y + h11 * dt * mb.y,
    vx: d00 * a.x + d10 * ma.x + d01 * b.x + d11 * mb.x,
    vy: d00 * a.y + d10 * ma.y + d01 * b.y + d11 * mb.y,
  };
}
