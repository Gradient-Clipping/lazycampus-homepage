import { arrival, clamp, squash } from "./math";
import { phaseAt } from "./spline";
import { type Experience } from "./experience";
import { CONTROLS, POD_WIDTH, POD_HEIGHT, canAct, controlLabel } from "./cloud";
import { drawPointer } from "./pointer";
import { CODE_LINES } from "./code";
import { getVscodeIcon } from "./icons";

export function deliveryPacket(time: number, connector: number) {
  const local = (phaseAt(time) % 8) - 0.8 - connector * 2.1;
  return {
    progress: clamp(1 - arrival(local, 0, 1, 2.7, 1).x),
    opacity:
      local <= 0 || local >= 2.2
        ? 0
        : clamp(local / 0.22) * clamp((2.2 - local) / 0.45),
  };
}
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const ink = "#28313e",
  muted = "#748091",
  blue = "#3968dc";
function round(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  r = 20,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
}
function text(
  c: Ctx,
  label: string,
  x: number,
  y: number,
  size = 24,
  color = ink,
  weight = 500,
) {
  c.font = `${weight} ${size}px Manrope, 'Microsoft YaHei', sans-serif`;
  c.fillStyle = color;
  c.fillText(label, x, y);
}
function line(
  c: Ctx,
  x: number,
  y: number,
  xx: number,
  yy: number,
  color: string,
  width = 2,
) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.stroke();
}
function dot(c: Ctx, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}
let background: OffscreenCanvas | undefined,
  bufferDpr = 0;
function backdrop(dpr: number) {
  if (background && bufferDpr === dpr) return background;
  bufferDpr = dpr;
  background = new OffscreenCanvas(
    Math.round(1000 * dpr),
    Math.round(564 * dpr),
  );
  const c = background.getContext("2d")!;
  c.scale(dpr, dpr);
  round(c, 0, 0, 1000, 564, "#fafbfd", 0);
  text(c, "Cloud Studio", 45, 49, 22, ink, 650);
  c.textAlign = "center";
  text(c, "从代码，到云端。", 500, 133, 51, ink, 650);
  c.textAlign = "left";
  return background;
}
function drawCode(
  c: CanvasRenderingContext2D,
  frame: ReturnType<Experience["sample"]>,
  time: number,
) {
  const editor = frame.visual.editor;
  if (editor.weight < 0.0001) return;
  c.save();
  c.globalAlpha = editor.weight;
  round(c, 0, 0, 1000, 564, "#171d28", 0);
  round(c, 0, 0, 1000, 66, "#222936", 0);
  // A pared-back Code title bar; no explorer, minimap or dense toolbars.
  const vscodeIcon = getVscodeIcon();
  if (vscodeIcon) c.drawImage(vscodeIcon, 23, 18, 32, 32);
  c.textAlign = "left";
  text(c, "VS Code", 72, 42, 23, "#e0e7f2", 550);
  c.textAlign = "center";
  text(c, "service.ts", 500, 42, 22, "#c5d0e1", 500);
  dot(c, 571, 34, 3.3, editor.committing ? "#82b58a" : "#cfb778");
  const font = "26px 'Cascadia Code', Consolas, monospace";
  let remaining = editor.characters,
    caret = { x: 101, y: 131 },
    stopped = false;
  CODE_LINES.forEach((tokens, i) => {
    const y = 131 + i * 42,
      length = tokens.reduce((n, token) => n + token.text.length, 0);
    c.textAlign = "right";
    c.font = "19px 'Cascadia Code', Consolas, monospace";
    c.fillStyle = "#66768d";
    c.fillText(String(i + 1), 63, y);
    if (i === 4 && remaining > 0) {
      round(c, 82, y - 31, 846, 42, "#80b78a0c", 4);
      round(c, 81, y - 28, 2, 33, "#80b78a", 0);
    }
    c.textAlign = "left";
    c.font = font;
    let x = 102,
      shown = Math.min(length, remaining);
    for (const token of tokens) {
      const part = token.text.slice(0, shown);
      c.fillStyle = token.color;
      c.fillText(part, x, y);
      x += c.measureText(part).width;
      shown -= part.length;
    }
    if (!stopped && (remaining < length || i === CODE_LINES.length - 1)) {
      caret = { x, y };
      stopped = true;
    }
    remaining = Math.max(0, remaining - length);
  });
  c.globalAlpha =
    editor.weight * (0.45 + 0.55 * (0.5 + 0.5 * Math.cos(time * Math.PI * 2)));
  c.fillStyle = "#b8cce9";
  c.fillRect(caret.x + 2, caret.y - 26, 2, 31);
  c.globalAlpha = editor.weight;
  const control = CONTROLS[0],
    body = frame.buttons[0],
    deform = squash(body.vx, body.vy, 0.0006, 0.035),
    cx = control.x + control.w / 2,
    cy = control.y + control.h / 2;
  c.save();
  c.translate(cx + body.x, cy + body.y);
  c.rotate(deform.angle);
  c.scale(deform.x, deform.y);
  c.rotate(-deform.angle);
  c.translate(-cx, -cy);
  round(
    c,
    control.x,
    control.y,
    control.w,
    control.h,
    editor.committing ? "#7a879c" : "#edf3fe",
    27,
  );
  c.textAlign = "center";
  text(
    c,
    editor.committing ? "正在提交…" : "提交并部署",
    cx,
    control.y + 35,
    23,
    "#1e2a3c",
    600,
  );
  c.restore();
  c.textAlign = "right";
  text(
    c,
    editor.committing
      ? "镜像构建中"
      : editor.complete
        ? "服务已更新"
        : "正在编辑服务",
    899,
    505,
    21,
    "#8294ad",
    500,
  );
  c.restore();
}
export function drawWorkspace(
  canvas: HTMLCanvasElement,
  frame: ReturnType<Experience["sample"]>,
  time: number,
) {
  const viewport = `${innerWidth}:${innerHeight}:${devicePixelRatio}`;
  if (viewport !== viewportKey) {
    const scale =
      canvas.closest<HTMLElement>(".scene-viewport")!.clientWidth / 820;
    dpr = Math.max(0.4, (devicePixelRatio * scale * canvas.clientWidth) / 1000);
    viewportKey = viewport;
  }
  const w = Math.round(1000 * dpr),
    h = Math.round(564 * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, 1000, 564);
  c.drawImage(backdrop(dpr), 0, 0, 1000, 564);
  const state = frame.visual,
    { model } = state;
  c.textAlign = "center";
  text(
    c,
    state.busy &&
      model.operation &&
      (state.action === "deploy" || state.action === "rollback")
      ? `v${model.operation.fromRevision}  →  v${model.revision}`
      : `v${model.revision} · 持续运行`,
    500,
    178,
    24,
    muted,
    500,
  );
  if (state.busy) {
    round(c, 395, 198, 210, 3, "#e1e7ef", 2);
    round(c, 395, 198, Math.max(3, 210 * state.progress), 3, blue, 2);
  }
  // A shared service bus stays attached to the actual spring positions of its instances.
  for (const node of state.nodes) {
    if (node.alpha < 0.001) continue;
    c.save();
    c.globalAlpha = node.alpha;
    c.beginPath();
    c.moveTo(node.x, node.y + POD_HEIGHT / 2 + 5);
    c.lineTo(node.x, 366);
    c.quadraticCurveTo(node.x, 380, node.x + (node.x < 500 ? 14 : -14), 380);
    c.lineTo(500, 380);
    c.strokeStyle = "#dce3ec";
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  }
  dot(c, 500, 380, 4, state.actual === state.desired ? "#7e9d72" : blue);
  for (const node of state.nodes) {
    if (node.alpha < 0.001) continue;
    const deform = squash(node.vx, node.vy, 0.0004, 0.025);
    c.save();
    c.globalAlpha = node.alpha;
    c.translate(node.x, node.y);
    c.rotate(deform.angle);
    c.scale(deform.x * node.scale, deform.y * node.scale);
    c.rotate(-deform.angle);
    c.shadowColor = node.selected ? "#456ddb20" : "#2c385a13";
    c.shadowBlur = node.selected ? 22 : 16;
    c.shadowOffsetY = 8;
    round(
      c,
      -POD_WIDTH / 2,
      -POD_HEIGHT / 2,
      POD_WIDTH,
      POD_HEIGHT,
      node.phase === "failed" ? "#fcf0e8" : node.selected ? "#f0f4ff" : "#fff",
      22,
    );
    c.shadowColor = "transparent";
    c.strokeStyle = node.selected
      ? "#7094e3"
      : node.phase === "failed"
        ? "#dfb398"
        : "#e1e6ed";
    c.lineWidth = node.selected ? 1.7 : 1;
    c.beginPath();
    c.roundRect(
      -POD_WIDTH / 2 + 0.5,
      -POD_HEIGHT / 2 + 0.5,
      POD_WIDTH - 1,
      POD_HEIGHT - 1,
      22,
    );
    c.stroke();
    const tint =
      node.phase === "failed"
        ? "#c5815d"
        : node.phase === "ready"
          ? "#6f9468"
          : blue;
    dot(c, 37, -31, 3.3, tint);
    text(
      c,
      String(node.index + 1).padStart(2, "0"),
      0,
      -3,
      33,
      node.selected ? blue : ink,
      600,
    );
    text(c, `v${node.version}`, 0, 30, 21, muted, 500);
    if (node.phase === "updating" || node.phase === "recovering")
      line(c, -25, 42, 25, 42, blue, 2.3);
    if (node.phase === "failed") {
      line(c, -6, -30, 6, -18, tint, 1.6);
      line(c, -6, -18, 6, -30, tint, 1.6);
    }
    c.restore();
  }
  c.textAlign = "center";
  text(
    c,
    state.status,
    500,
    422,
    23,
    state.actual < state.desired ? "#a37554" : muted,
    500,
  );
  CONTROLS.forEach((button, i) => {
    const body = frame.buttons[i],
      s = squash(body.vx, body.vy, 0.0006, 0.035),
      cx = button.x + button.w / 2,
      cy = button.y + button.h / 2,
      enabled = canAct(model, button.action, time);
    c.save();
    c.translate(cx + body.x, cy + body.y);
    c.rotate(s.angle);
    c.scale(s.x, s.y);
    c.rotate(-s.angle);
    c.translate(-cx, -cy);
    if (i === 0)
      round(
        c,
        button.x,
        button.y,
        button.w,
        button.h,
        enabled ? "#303b4b" : "#7f8998",
        27,
      );
    c.textAlign = "center";
    text(
      c,
      controlLabel(button.action, model, time),
      cx,
      button.y + 35,
      23,
      i === 0 ? "#fff" : enabled ? "#506078" : "#aeb6c2",
      550,
    );
    c.restore();
  });
  const pressed =
    state.automatic && state.action !== null && state.age < 0.45
      ? Math.exp(-state.age * 10)
      : 0;
  drawCode(c, frame, time);
  drawPointer(c, frame.cursor, pressed);
  canvas.dataset.view = state.editor.weight > 0.5 ? "code" : "cloud";
  canvas.dataset.characters = String(state.editor.characters);
  canvas.dataset.mode = state.manual ? "interactive" : "demo";
  canvas.dataset.action = state.action ?? "idle";
  canvas.dataset.revision = String(state.revision);
  canvas.dataset.desired = String(state.desired);
  canvas.dataset.actual = String(state.actual);
  canvas.dataset.busy = String(state.busy);
}
let viewportKey = "",
  dpr = 1;
