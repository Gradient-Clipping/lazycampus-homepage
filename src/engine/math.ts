export type Vec2 = { x: number; y: number };
export type Spring = { x: number; v: number };
export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Exact solution of x'' + 2ζω x' + ω²(x - target) = 0.
 * The target is held constant over dt (240 Hz zero-order hold).
 * Position and velocity are carried together; there is no Euler spring update.
 */
export function springStep(
  s: Spring,
  target: number,
  dt: number,
  omega: number,
  zeta: number,
): Spring {
  const y = s.x - target;
  if (Math.abs(zeta - 1) < 1e-7) {
    const e = Math.exp(-omega * dt);
    const b = s.v + omega * y;
    return { x: target + (y + b * dt) * e, v: (s.v - omega * b * dt) * e };
  }
  if (zeta < 1) {
    const a = zeta * omega;
    const w = omega * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-a * dt),
      c = Math.cos(w * dt),
      n = Math.sin(w * dt);
    const b = (s.v + a * y) / w;
    return {
      x: target + e * (y * c + b * n),
      v: e * (s.v * c - ((a * s.v + omega * omega * y) / w) * n),
    };
  }
  const q = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * (zeta - q),
    r2 = -omega * (zeta + q);
  const a = (s.v - r2 * y) / (r1 - r2),
    b = y - a;
  return {
    x: target + a * Math.exp(r1 * dt) + b * Math.exp(r2 * dt),
    v: r1 * a * Math.exp(r1 * dt) + r2 * b * Math.exp(r2 * dt),
  };
}

/** Analytic entry response, with the exact velocity used for deformation/blur. */
export function arrival(
  t: number,
  start: number,
  distance: number,
  omega = 7.4,
  zeta = 0.86,
) {
  return springStep(
    { x: distance, v: 0 },
    0,
    Math.max(0, t - start),
    omega,
    zeta,
  );
}

/** Compile the exact linear state transfer once per material, instead of repeating
 * exp/sin/cos for every node at every 240 Hz step. Valid for every damping regime.
 */
export function springMatrix(omega: number, zeta: number, dt: number) {
  const a = springStep({ x: 1, v: 0 }, 0, dt, omega, zeta);
  const b = springStep({ x: 0, v: 1 }, 0, dt, omega, zeta);
  return { xx: a.x, xv: b.x, vx: a.v, vv: b.v };
}

export function squash(vx: number, vy: number, strength = 0.00038, max = 0.19) {
  const speed = Math.hypot(vx, vy);
  const stretch = 1 + Math.min(max, speed * strength);
  return {
    angle: speed > 0.01 ? Math.atan2(vy, vx) : 0,
    x: stretch,
    y: 1 / stretch,
    speed,
  };
}
