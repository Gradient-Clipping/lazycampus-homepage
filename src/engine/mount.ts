import { arrival, clamp, squash } from "./math";
import { initializeTimeline, play, repaintTimeline } from "./timeline";
import { DURATION, phaseAt } from "./constants";
import { drawSculpture, drawStudio } from "./sculpture";
import { deliveryPacket, drawWorkspace } from "./workspace";
import { ProductSequence, sequenceFrame, type SequenceManifest } from "./sequence";
import { prepareSuppliedIcons } from "./icons";
import { prepareLaptopShell } from "./hardware";
import suppliedManifest from "../../public/media/product/manifest.json";
import smartShopPoster from "../assets/smart-shop-concept.webp";
import kubernetes from "../../public/icons/kubernetes.svg?raw";
import gitBranch from "../../public/icons/git-branch.svg?raw";
import flux from "../../public/icons/flux.svg?raw";
import vscode from "../../public/icons/visual-studio-code.svg?raw";
import {
  canAct,
  controlLabel,
  POD_WIDTH,
  POD_HEIGHT,
  type Command,
} from "./cloud";

export type Ready = { resolve: () => void; reject: (reason: unknown) => void };
function required<T extends HTMLElement | SVGElement = HTMLElement>(
  id: string,
): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing render element #${id}`);
  return node as unknown as T;
}

export function mountTimeline(ready: Ready) {
  const params = new URLSearchParams(location.search);
  document.documentElement.dataset.capture = String(params.has("render"));
  const canvas = required<HTMLCanvasElement>("world-canvas");
  const productCanvas = required<HTMLCanvasElement>("product-canvas");
  const workspace = required<HTMLCanvasElement>("workspace-canvas");
  const sculpture = required<HTMLCanvasElement>("about-sculpture");
  const cardMotion = required("card-motion"),
    card = required("campus-card");
  const controls = [
    ...document.querySelectorAll<HTMLElement>("[data-control-index]"),
  ];
  const cardBlur = required<SVGElement>("card-blur-node");
  const wires = [
    ...document.querySelectorAll<SVGSVGElement>(".pipeline-connector"),
  ].map((svg) => ({
    svg,
    line: svg.querySelector<SVGPathElement>(".pipeline-line")!,
    dot: svg.querySelector<SVGCircleElement>(".pipeline-packet")!,
    start: 0,
    end: 0,
  }));
  let wireViewport = "";
  const drawDelivery = (t: number) => {
    const viewport = `${innerWidth}:${innerHeight}`;
    if (viewport !== wireViewport) {
      wireViewport = viewport;
      // No viewBox stretching: paths, arrowheads and circular packets use CSS pixels.
      // Read geometry only when layout changes, before making any SVG writes.
      const sizes = wires.map(({ svg }) => ({
        width: svg.clientWidth,
        height: svg.clientHeight,
      }));
      wires.forEach((wire, i) => {
        const { width, height } = sizes[i],
          y = height / 2,
          inset = Math.min(8, width * 0.12),
          head = Math.min(6, (width - inset * 2) * 0.35);
        wire.start = inset;
        wire.end = width - inset;
        wire.line.setAttribute(
          "d",
          `M${wire.start} ${y}H${wire.end}m${-head} ${-head * 0.7} ${head} ${head * 0.7} ${-head} ${head * 0.7}`,
        );
        wire.dot.setAttribute("cy", String(y));
      });
    }
    wires.forEach((wire, i) => {
      const packet = deliveryPacket(t, i);
      wire.dot.setAttribute(
        "cx",
        String(wire.start + packet.progress * (wire.end - wire.start)),
      );
      wire.dot.setAttribute("opacity", String(packet.opacity));
    });
  };
  const introNodes = [
    ...document.querySelectorAll<HTMLElement>("[data-intro]"),
  ];
  const meters = [
    ...document.querySelectorAll<HTMLElement>("[data-playback-progress]"),
  ];
  const clocks = [
    ...document.querySelectorAll<HTMLElement>("[data-playback-time]"),
  ];
  const hudClock = document.querySelector<HTMLElement>("[data-hud-time]");
  const scrubber =
    document.querySelector<HTMLInputElement>("#timeline-scrubber");
  const sequence = new ProductSequence();
  const workspaceActions = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-cloud-action]"),
  ];
  const podControls = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-pod-index]"),
  ];
  const workspaceStatus = required("workspace-status");
  let interfaceSignature = "";
  const reducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !params.has("render");
  const cleanup = initializeTimeline((t, frame) => {
    drawStudio(canvas);
    drawWorkspace(workspace, frame, t);
    drawSculpture(sculpture, reducedMotion ? 0 : t);
    sequence.draw(productCanvas, t);
    const p = frame.cursor;
    const entry = arrival(t, 0.12, 28, 9.5, 1);
    const deform = squash(
      frame.card.vx,
      frame.card.vy + entry.v,
      0.00013,
      0.012,
    );
    const degrees = (deform.angle * 180) / Math.PI;
    cardMotion.style.transform = `translate3d(${frame.card.x}px, ${frame.card.y + entry.x}px, 0) rotate(${degrees}deg)`;
    cardMotion.style.opacity = String(clamp(1 - entry.x / 132));
    // Keep the layer topology stable during random seeks; blur itself is zero at rest.
    cardMotion.style.filter = "url(#card-directional-blur)";
    cardBlur.setAttribute(
      "stdDeviation",
      `${deform.speed > 35 ? Math.min(1.8, deform.speed * 0.004).toFixed(4) : "0"} 0`,
    );
    card.style.transform = `scale(${deform.x}, ${deform.y}) rotate(${-degrees - 2.5}deg) perspective(2400px) rotateX(${-7 - frame.card.y * 0.06}deg) rotateY(${-7 + frame.card.x * 0.06}deg)`;
    controls.forEach((control, i) => {
      const body = frame.buttons[i],
        ms = squash(body.vx, body.vy, 0.0006, 0.035);
      control.style.transform = `translate(${body.x * 0.668}px, ${body.y * 0.668}px) rotate(${ms.angle}rad) scale(${ms.x}, ${ms.y}) rotate(${-ms.angle}rad)`;
    });
    const state = frame.visual;
    podControls.forEach((button, i) => {
      const node = state.nodes[i],
        deform = squash(node.vx, node.vy, 0.0004, 0.025);
      button.style.width = `${POD_WIDTH * 0.668}px`;
      button.style.height = `${POD_HEIGHT * 0.668}px`;
      button.style.transform = `translate(${(node.x - POD_WIDTH / 2) * 0.668}px, ${(node.y - POD_HEIGHT / 2) * 0.668}px) rotate(${deform.angle}rad) scale(${deform.x * node.scale}, ${deform.y * node.scale}) rotate(${-deform.angle}rad)`;
      button.hidden = !node.active || state.editor.weight > 0.1;
      button.disabled = node.alpha < 0.8 || !canAct(state.model, "inspect", t);
      button.setAttribute("aria-pressed", String(node.selected));
    });
    const nextSignature = `${state.status}:${state.busy}:${state.action}:${state.revision}:${state.desired}:${state.editor.weight > 0.5}`;
    if (interfaceSignature !== nextSignature) {
      interfaceSignature = nextSignature;
      workspaceActions.forEach((button) => {
        const action = button.dataset.cloudAction as Command,
          label = controlLabel(action, state.model, t);
        button.disabled = !canAct(state.model, action, t);
        button.hidden = action !== "deploy" && state.editor.weight > 0.5;
        button.setAttribute("aria-label", `云原生：${label}`);
        button.querySelector("span")!.textContent = label;
      });
      workspaceStatus.textContent =
        state.editor.weight > 0.5
          ? "代码工作区：修改 TypeScript 服务，提交后自动构建并部署。"
          : `云原生工作区：版本 v${state.revision}，${state.status}`;
    }
    introNodes.forEach((node, i) => {
      const a = arrival(t, i * 0.05, 14, 10, 1);
      node.style.transform =
        Math.abs(a.x) < 0.001 ? "none" : `translateY(${a.x.toFixed(6)}px)`;
      node.style.opacity =
        Math.abs(a.x) < 0.001 ? "1" : String(clamp(1 - a.x / 18));
    });
    // Only the explanatory diagrams move below the fold. Text and product art stay stable.
    drawDelivery(t);
    const phase = phaseAt(t),
      timeLabel = `${String(Math.floor(phase)).padStart(2, "0")} / ${DURATION}`;
    meters.forEach((el) => {
      el.style.transform = `scaleX(${phase / DURATION})`;
    });
    clocks.forEach((el) => {
      if (el.textContent !== timeLabel) el.textContent = timeLabel;
    });
    if (hudClock) hudClock.textContent = `${phase.toFixed(3)} s`;
    if (scrubber) scrubber.value = String(phase);
    document.documentElement.dataset.time = t.toFixed(6);
    window.__frame = Object.freeze({
      t,
      phase,
      cursor: p,
      productFrame: sequenceFrame(t, sequence.manifest),
      speed: deform.speed,
      view: "cloud",
      interactive: state.manual,
      cloud: {
        revision: state.revision,
        desired: state.desired,
        actual: state.actual,
        busy: state.busy,
        selected: state.model.selected,
        action: state.action,
      },
    });
  });
  let disposed = false;
  const resizeDelivery = () => drawDelivery(window.__frame?.t ?? 0);
  window.addEventListener("resize", resizeDelivery);
  const closeMenu = (event: MouseEvent) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (link)
      link.closest<HTMLDetailsElement>(".mobile-nav")?.removeAttribute("open");
  };
  document.addEventListener("click", closeMenu);
  const capture = params.has("render");
  const autoplay = !params.has("t") && !params.has("paused") && !capture && !reducedMotion;
  const queryTime = params.has("t") ? Number(params.get("t")) : autoplay ? 0 : 3.2;
  const start = () => {
    window.__seek(Number.isFinite(queryTime) ? queryTime : 3.2);
    performance.mark("homepage:hero-ready");
    if (autoplay) play();
  };
  const refresh = () => {
    if (!disposed) repaintTimeline();
  };
  let productReady: Promise<void> | undefined;
  // Bundle release-owned metadata instead of fetching a manifest before the image.
  const manifest = {
    ...suppliedManifest,
    poster: suppliedManifest.poster === "/media/smart-shop-concept.png"
      ? smartShopPoster
      : suppliedManifest.poster,
  } as SequenceManifest;
  const prepareProduct = () => productReady ??= sequence.prepare(manifest).then(() => {
    if (disposed) return;
    required("sequence-label").textContent = sequence.manifest.label;
    refresh();
  });
  const productError = (error: unknown) => {
    if (disposed) return;
    const el = required("sequence-error");
    el.hidden = false;
    el.textContent = "产品画面暂时无法载入，请刷新后重试。";
    console.warn("Product artwork unavailable", error);
  };
  let productObserver: IntersectionObserver | undefined;
  if (!capture) {
    // Render the laptop now. Fonts and below-fold artwork must never gate the hero.
    start();
    productObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        productObserver?.disconnect();
        void prepareProduct().catch(productError);
      }
    }, { rootMargin: "800px" });
    productObserver.observe(productCanvas);
  }
  const enhancements = [
    document.fonts.load('26px "JetBrains Mono"').then(() => document.fonts.ready),
    prepareSuppliedIcons({ kubernetes, "git-branch": gitBranch, flux, "visual-studio-code": vscode }),
    prepareLaptopShell(),
  ].map((task) => task.then(refresh));
  // Exports still have a strict barrier so arbitrary seeks remain deterministic.
  const preparation = capture
    ? Promise.all([...enhancements, prepareProduct(), required<HTMLImageElement>("easy-campus-concept").decode()])
    : Promise.allSettled(enhancements);
  preparation
    .then(() => {
      if (disposed) return;
      if (capture) start();
      ready.resolve();
    })
    .catch((error) => {
      if (disposed) return;
      const message = error instanceof Error ? error.message : String(error);
      window.__renderError = message;
      const el = required("sequence-error");
      el.hidden = false;
      el.textContent = `产品画面载入失败：${message}`;
      window.__seek(3.2);
      ready.reject(error);
    });
  return () => {
    disposed = true;
    productObserver?.disconnect();
    document.removeEventListener("click", closeMenu);
    window.removeEventListener("resize", resizeDelivery);
    cleanup();
  };
}
