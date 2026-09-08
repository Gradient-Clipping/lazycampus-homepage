import { flushSync } from "react-dom";
import { experience, type Action, type RecordedIntent } from "./experience";
import { DURATION, phaseAt } from "./constants";

export type RenderFn = (
  time: number,
  state: ReturnType<typeof experience.sample>,
) => void;
let current = 3.2;
let renderer: RenderFn | null = null;
let driver: number | null = null;
let playing = false;
const subscribers = new Set<() => void>();

function stopDriver() {
  if (driver !== null) cancelAnimationFrame(driver);
  driver = null;
}

/** Sole global time input. Synchronous DOM + Canvas update and stops realtime playback. */
function seek(time: number) {
  if (!Number.isFinite(time))
    throw new TypeError("__seek(t) requires finite seconds.");
  // The preview adapter calls the same seek function while marking its own dispatch.
  const wasPlaying = playing;
  if (!previewDispatch) {
    playing = false;
    stopDriver();
  }
  current = Math.max(0, time);
  if (renderer) renderer(current, experience.sample(current));
  // React only handles play/pause changes. Time labels and controls are written by render.
  if (wasPlaying !== playing)
    flushSync(() => subscribers.forEach((fn) => fn()));
  return current;
}
let previewDispatch = false;

export function initializeTimeline(render: RenderFn) {
  experience.restore(window.__initialRecording ?? []);
  renderer = render;
  window.__seek = seek;
  window.__timeline = Object.freeze({
    duration: DURATION,
    hz: 240,
    get cacheBytes() {
      return experience.bytes;
    },
    version: 7,
    loopPeriod: 288,
    get intentCount() {
      return experience.recording.length;
    },
    seamError: experience.seamError,
    get recording() {
      return experience.recording;
    },
  });
  return () => {
    stopDriver();
    renderer = null;
  };
}

export function performAction(action: Action, target?: number) {
  if (!experience.record(action, current, target)) return;
  window.__seek(current);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    window.__seek(current + 4);
  else play();
}
export function resetDemo() {
  experience.reset();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    window.__seek(3.2);
  else {
    window.__seek(0);
    play();
  }
}

/** A disposable wall-clock adapter only. Absolute time since an epoch, never t += dt.
 * The simulation and renderer do not know that requestAnimationFrame exists.
 * Every preview tick enters through window.__seek(t); external seek cancels the driver.
 */
export function play(until = Infinity) {
  stopDriver();
  const start = current;
  const epoch = performance.now();
  playing = true;
  const tick = (now: number) => {
    previewDispatch = true;
    try {
      const time = Math.min(until, start + (now - epoch) / 1000);
      window.__seek(time);
      if (time >= until) playing = false;
    } finally {
      previewDispatch = false;
    }
    if (playing) driver = requestAnimationFrame(tick);
    else {
      playing = false;
      driver = null;
      subscribers.forEach((fn) => fn());
    }
  };
  driver = requestAnimationFrame(tick);
  subscribers.forEach((fn) => fn());
}

export function pause() {
  playing = false;
  stopDriver();
  subscribers.forEach((fn) => fn());
}
export const getTime = () => phaseAt(current);
export const isPlaying = () => playing;
export function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

declare global {
  interface Window {
    __seek: (t: number) => number;
    __ready: Promise<void>;
    __initialRecording?: readonly RecordedIntent[];
    __renderError?: string;
    __timeline: Readonly<{
      duration: number;
      hz: number;
      cacheBytes: number;
      version: number;
      loopPeriod: number;
      intentCount: number;
      seamError: number;
      recording: readonly RecordedIntent[];
    }>;
    __frame: Readonly<{
      t: number;
      phase: number;
      cursor: { x: number; y: number; vx: number; vy: number };
      productFrame: number;
      speed: number;
      view: "cloud";
      interactive: boolean;
      cloud: {
        revision: number;
        desired: number;
        actual: number;
        busy: boolean;
        selected: number | null;
        action: Action | null;
      };
    }>;
  }
}
