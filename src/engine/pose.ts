import { arrival, squash } from "./math";

export const CARD = {
  x: 94,
  y: 70,
  width: 624,
  height: 390,
  buttonX: 525.67,
  buttonY: 305.782,
};
type Body = { x: number; y: number; vx: number; vy: number };

/** The same pose drives CSS and contact projection; there is no guessed hit point. */
export function cardPose(t: number, body: Body) {
  const entry = arrival(t, 0.12, 46, 8.5, 0.94);
  const deform = squash(body.vx, body.vy + entry.v, 0.0001, 0.022);
  return {
    entry,
    deform,
    degrees: (deform.angle * 180) / Math.PI,
    rotateX: 7 - body.y * 0.08,
    rotateY: -13 + body.x * 0.1,
  };
}

export function buttonWorld(t: number, body: Body, magnet = { x: 0, y: 0 }) {
  const p = cardPose(t, body),
    toRad = Math.PI / 180;
  const lx = CARD.buttonX - CARD.width / 2 + magnet.x;
  const ly = CARD.buttonY - CARD.height / 2 + magnet.y;
  // CSS: rotate(angle) · scale(sx,sy) · rotate(-angle-4) · perspective · Rx · Ry.
  const ry = p.rotateY * toRad,
    rx = p.rotateX * toRad;
  let x = lx * Math.cos(ry),
    z = -lx * Math.sin(ry);
  let y = ly * Math.cos(rx) - z * Math.sin(rx);
  z = ly * Math.sin(rx) + z * Math.cos(rx);
  x /= 1 - z / 1000;
  y /= 1 - z / 1000;
  const inner = (-p.degrees - 4) * toRad;
  const ix = (x * Math.cos(inner) - y * Math.sin(inner)) * p.deform.x;
  const iy = (x * Math.sin(inner) + y * Math.cos(inner)) * p.deform.y;
  const outer = p.deform.angle;
  return {
    x:
      CARD.x +
      CARD.width / 2 +
      body.x +
      ix * Math.cos(outer) -
      iy * Math.sin(outer),
    y:
      CARD.y +
      CARD.height / 2 +
      body.y +
      p.entry.x +
      ix * Math.sin(outer) +
      iy * Math.cos(outer),
  };
}
