import { clamp, springStep } from "./math";
import { DURATION } from "./constants";
import { codeCharacters, CODE_LENGTH } from "./code";

export type Action = "deploy" | "scale" | "fault" | "rollback" | "inspect";
export type Command = Exclude<Action, "inspect">;
export type RecordedIntent = Readonly<{
  time: number;
  action: Action;
  target?: number;
}>;
export const CONTROLS = [
  {
    action: "deploy" as const,
    x: 105,
    y: 470,
    w: 205,
    h: 54,
    label: "部署更新",
  },
  {
    action: "scale" as const,
    x: 339,
    y: 470,
    w: 180,
    h: 54,
    label: "扩容至 5",
  },
  {
    action: "fault" as const,
    x: 548,
    y: 470,
    w: 174,
    h: 54,
    label: "模拟故障",
  },
  {
    action: "rollback" as const,
    x: 751,
    y: 470,
    w: 143,
    h: 54,
    label: "回滚版本",
  },
];
export const POD_WIDTH = 112,
  POD_HEIGHT = 100,
  POD_Y = 290;
export const BASE_MODEL: CloudModel = {
  desired: 3,
  revision: 1,
  previous: null,
  selected: null,
  operation: null,
  editorStart: 0,
  editorEnteredAt: null,
};
export type Operation = {
  action: Command;
  start: number;
  duration: number;
  fromDesired: number;
  fromRevision: number;
  target: number;
  fromEditor: number | null;
};
export type CloudModel = {
  desired: number;
  revision: number;
  previous: number | null;
  selected: number | null;
  operation: Operation | null;
  editorStart: number | null;
  editorEnteredAt: number | null;
};
export const enabledSlots = (count: number) =>
  count === 5 ? [0, 1, 2, 3, 4] : [1, 2, 3];
export const podX = (i: number, count: number) =>
  500 + (i - 2) * (count === 5 ? 157 : 184);
const settled = (age: number, omega = 11) =>
  age >= 1.5
    ? 1
    : clamp(1 - springStep({ x: 1, v: 0 }, 0, Math.max(0, age), omega, 1).x);
export function isBusy(model: CloudModel, time: number) {
  return (
    !!model.operation && time < model.operation.start + model.operation.duration
  );
}
export function canAct(model: CloudModel, action: Action, time: number) {
  if (model.editorStart !== null && action !== "deploy") return false;
  if (action === "inspect") return true;
  return (
    !isBusy(model, time) && (action !== "rollback" || model.previous !== null)
  );
}
export function controlLabel(action: Command, model: CloudModel, time: number) {
  if (action === "deploy" && model.editorStart !== null) return "提交并部署";
  if (isBusy(model, time) && model.operation?.action === action)
    return {
      deploy: "部署中…",
      scale: "协调中…",
      fault: "自愈中…",
      rollback: "回滚中…",
    }[action];
  return action === "scale"
    ? model.desired === 3
      ? "扩容至 5"
      : "缩容至 3"
    : CONTROLS.find((c) => c.action === action)!.label;
}
export function applyIntent(
  model: CloudModel,
  event: RecordedIntent,
): CloudModel {
  if (event.action === "inspect") {
    if (!canAct(model, event.action, event.time)) return model;
    if (!enabledSlots(model.desired).includes(event.target ?? -1)) return model;
    return {
      ...model,
      selected: model.selected === event.target ? null : event.target!,
    };
  }
  if (!canAct(model, event.action, event.time)) return model;
  const next = { ...model };
  if (event.action === "deploy") {
    next.previous = model.revision;
    next.revision++;
    next.editorStart = null;
    next.editorEnteredAt = null;
  }
  if (event.action === "rollback") {
    next.revision = model.previous!;
    next.previous = null;
  }
  if (event.action === "scale") {
    next.desired = model.desired === 3 ? 5 : 3;
    if (
      next.selected !== null &&
      !enabledSlots(next.desired).includes(next.selected)
    )
      next.selected = null;
  }
  next.operation = {
    action: event.action,
    start: event.time,
    duration:
      event.action === "deploy"
        ? 3.8
        : event.action === "rollback"
          ? 2.6
          : event.action === "fault"
            ? 2.8
            : 2.2,
    fromDesired: model.desired,
    fromRevision: model.revision,
    fromEditor: model.editorStart,
    target: enabledSlots(model.desired).includes(event.target ?? -1)
      ? event.target!
      : (model.selected ?? enabledSlots(model.desired)[0]),
  };
  return next;
}
export const AUTO_EVENTS: readonly RecordedIntent[] = [
  { time: 6.4, action: "deploy" },
  { time: 12, action: "scale" },
  { time: 16, action: "fault", target: 1 },
  { time: 20, action: "scale" },
  { time: 24, action: "rollback" },
];
export function demoModelAt(time: number) {
  const cycle = Math.floor(time / DURATION) * DURATION,
    phase = time - cycle;
  let model: CloudModel = { ...BASE_MODEL, editorStart: cycle };
  for (const event of AUTO_EVENTS)
    if (phase >= event.time)
      model = applyIntent(model, { ...event, time: cycle + event.time });
  if (phase >= 30)
    model = {
      ...model,
      editorStart: cycle + DURATION,
      editorEnteredAt: cycle + 30,
    };
  return model;
}
export function cloudAt(model: CloudModel, time: number) {
  const op = model.operation,
    age = op ? Math.max(0, time - op.start) : 0,
    busy = isBusy(model, time),
    slots = enabledSlots(model.desired);
  const before = enabledSlots(op?.fromDesired ?? model.desired);
  const progress = busy ? clamp(age / op!.duration) : 1;
  const editorWeight =
    model.editorStart !== null
      ? model.editorEnteredAt === null
        ? 1
        : settled(time - model.editorEnteredAt)
      : op?.fromEditor !== null && op?.fromEditor !== undefined
        ? 1 - settled(age - 0.65)
        : 0;
  const typedAtCommit =
    op?.fromEditor !== null && op?.fromEditor !== undefined
      ? codeCharacters(op.start, op.fromEditor)
      : CODE_LENGTH;
  const characters =
    model.editorStart !== null
      ? codeCharacters(time, model.editorStart)
      : Math.floor(
          typedAtCommit + (CODE_LENGTH - typedAtCommit) * settled(age, 18),
        );
  const nodes = Array.from({ length: 5 }, (_, i) => {
    const active = slots.includes(i),
      existed = before.includes(i),
      rank = Math.max(0, slots.indexOf(i));
    const destination = podX(i, model.desired);
    const x =
      op?.action === "scale"
        ? springStep(
            { x: podX(i, op.fromDesired), v: 0 },
            destination,
            age,
            11,
            0.88,
          )
        : { x: destination, v: 0 };
    let alpha = active ? 1 : 0,
      y = 0,
      vy = 0,
      version = model.revision,
      phase: "ready" | "updating" | "failed" | "recovering" = "ready",
      ready = active,
      scale = 1;
    if (op?.action === "scale") {
      alpha =
        (existed ? 1 : 0) +
        ((active ? 1 : 0) - (existed ? 1 : 0)) * settled(age - 0.12);
      if (active && !existed) {
        const entry = springStep(
          { x: 20, v: 0 },
          0,
          Math.max(0, age - 0.12),
          11,
          0.9,
        );
        y = entry.x;
        vy = entry.v;
        ready = age > 1.2 + (i === 4 ? 0.3 : 0);
        phase = ready ? "ready" : "recovering";
      }
    }
    if (op?.action === "deploy" || op?.action === "rollback") {
      const begin = op.action === "deploy" ? 0.8 : 0.2,
        local = age - begin - rank * 0.43;
      const lift = springStep({ x: 0, v: 0 }, -12, Math.max(0, local), 14, 1);
      const returnStep = springStep(
        { x: 0, v: 0 },
        12,
        Math.max(0, local - 0.32),
        14,
        1,
      );
      y = lift.x + returnStep.x;
      vy = lift.v + returnStep.v;
      version = local < 0.42 ? op.fromRevision : model.revision;
      phase = local > 0 && local < 0.92 ? "updating" : "ready";
      scale = 1 - 0.025 * (settled(local, 16) - settled(local - 0.4, 16));
    }
    if (op?.action === "fault" && i === op.target && age < 2.8) {
      phase = age < 0.65 ? "failed" : age < 2.3 ? "recovering" : "ready";
      ready = age >= 2.3;
      const down = springStep({ x: 0, v: 0 }, 16, age, 12, 0.9),
        up = springStep({ x: 0, v: 0 }, -16, Math.max(0, age - 1), 12, 0.9);
      y = down.x + up.x;
      vy = down.v + up.v;
      alpha = 1 - 0.82 * (settled(age - 0.25, 13) - settled(age - 1, 13));
      scale = 1 - 0.06 * (settled(age, 14) - settled(age - 1, 14));
    }
    return {
      index: i,
      x: x.x,
      vx: x.v,
      y: POD_Y + y,
      vy,
      alpha,
      scale,
      version,
      phase,
      ready,
      active,
      selected: model.selected === i,
    };
  });
  const actual = nodes.filter((n) => n.active && n.ready).length;
  let status = `${actual} / ${model.desired} 副本就绪`;
  if (busy)
    status += ` · ${{ deploy: age < 0.8 ? "构建镜像" : "滚动更新", scale: "协调副本", fault: age < 0.65 ? "检测到失联" : "自动恢复", rollback: "恢复上一版本" }[op!.action]}`;
  else if (model.selected !== null) {
    const node = nodes[model.selected];
    status = `实例 ${String(node.index + 1).padStart(2, "0")} · v${node.version} · ${node.ready ? "运行正常" : "等待就绪"}`;
  }
  return {
    model,
    nodes,
    age,
    busy,
    progress,
    actual,
    status,
    revision: model.revision,
    desired: model.desired,
    action: op?.action ?? null,
    editor: {
      weight: editorWeight,
      characters,
      committing: model.editorStart === null && editorWeight > 0,
      complete: characters === CODE_LENGTH,
    },
  };
}
