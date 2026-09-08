import type { Point } from "./experience";

// Mirror symmetry about y=x. The two vectors at the re-entrant corner span
// 120 degrees, hence the polygon's concave interior angle is exactly 240 degrees.
const length = 16,
  angle = Math.PI / 12;
export const POINTER_VERTICES = Object.freeze([
  { x: 0, y: 0 },
  { x: 16 + length * Math.cos(angle), y: 16 - length * Math.sin(angle) },
  { x: 16, y: 16 },
  { x: 16 - length * Math.sin(angle), y: 16 + length * Math.cos(angle) },
]);
let outline: Path2D | undefined;
function pointerPath() {
  if (outline) return outline;
  const path = new Path2D();
  POINTER_VERTICES.forEach((point, i) => {
    const previous = POINTER_VERTICES[(i + 3) % 4],
      next = POINTER_VERTICES[(i + 1) % 4],
      radius = [1.8, 2.5, 2, 2.5][i];
    const a = Math.hypot(previous.x - point.x, previous.y - point.y),
      b = Math.hypot(next.x - point.x, next.y - point.y);
    const incoming = {
      x: point.x + ((previous.x - point.x) * radius) / a,
      y: point.y + ((previous.y - point.y) * radius) / a,
    };
    const outgoing = {
      x: point.x + ((next.x - point.x) * radius) / b,
      y: point.y + ((next.y - point.y) * radius) / b,
    };
    if (i === 0) path.moveTo(incoming.x, incoming.y);
    else path.lineTo(incoming.x, incoming.y);
    path.quadraticCurveTo(point.x, point.y, outgoing.x, outgoing.y);
  });
  path.closePath();
  outline = path;
  return path;
}
export function drawPointer(
  ctx: CanvasRenderingContext2D,
  p: Point,
  pressed = 0,
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1.13 - pressed * 0.05, 1.13 - pressed * 0.05);
  ctx.shadowColor = "#1b263e45";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#40506a";
  ctx.lineWidth = 1.2;
  ctx.lineJoin = "round";
  ctx.fill(pointerPath());
  ctx.shadowColor = "transparent";
  ctx.stroke(pointerPath());
  ctx.restore();
}
