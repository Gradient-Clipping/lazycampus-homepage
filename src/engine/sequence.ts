import { clamp } from "./math";

export type SequenceManifest = {
  version: 1;
  enabled: boolean;
  fps: number;
  frameCount: number;
  startTime: number;
  startNumber: number;
  pattern: string;
  poster: string;
  label: string;
  source: string;
};
export const fallbackManifest: SequenceManifest = {
  version: 1,
  enabled: false,
  fps: 30,
  frameCount: 0,
  startTime: 0,
  startNumber: 0,
  pattern: "/media/product/frame-{frame}.png",
  poster: "/media/smart-shop-concept.png",
  label: "Smart Shop · AI 概念视觉",
  source: "OpenAI image_gen · conceptual product design",
};

export function sequenceFrame(t: number, manifest: SequenceManifest) {
  return clamp(
    Math.floor(Math.max(0, t - manifest.startTime) * manifest.fps + 1e-7),
    0,
    Math.max(0, manifest.frameCount - 1),
  );
}

export function framePath(frame: number, manifest: SequenceManifest) {
  return manifest.pattern.replace(
    "{frame}",
    String(frame + manifest.startNumber).padStart(6, "0"),
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}

/** Loaded once before __ready. Render never relies on an image decode race. */
export class ProductSequence {
  manifest = fallbackManifest;
  private images: HTMLImageElement[] = [];
  private poster: HTMLImageElement | null = null;
  private lastCanvas: HTMLCanvasElement | null = null;
  private lastImage: HTMLImageElement | null = null;
  error = "";

  async prepare() {
    const response = await fetch("/media/product/manifest.json");
    if (!response.ok)
      throw new Error(`Sequence manifest HTTP ${response.status}`);
    const data: SequenceManifest = await response.json();
    if (
      data.version !== 1 ||
      !Number.isFinite(data.fps) ||
      data.fps <= 0 ||
      !Number.isInteger(data.frameCount) ||
      data.frameCount < 0 ||
      !Number.isFinite(data.startTime) ||
      !Number.isInteger(data.startNumber) ||
      !data.pattern.includes("{frame}")
    ) {
      throw new Error("Invalid product sequence manifest.");
    }
    this.manifest = data;
    if (data.enabled) {
      if (!data.frameCount || data.frameCount > 900)
        throw new Error(
          "Use 1–900 frames; crop recordings to the demonstrated action.",
        );
      // Bounded parallel decoding avoids a request flood and provides a readiness barrier.
      this.images = new Array(data.frameCount);
      let next = 0;
      let decodedBytes = 0;
      await Promise.all(
        Array.from({ length: Math.min(6, data.frameCount) }, async () => {
          while (next < data.frameCount) {
            const i = next++;
            this.images[i] = await loadImage(framePath(i, data));
            decodedBytes +=
              this.images[i].naturalWidth * this.images[i].naturalHeight * 4;
            if (decodedBytes > 512 * 1024 * 1024)
              throw new Error(
                "Sequence exceeds 512 MiB decoded. Reduce duration or resolution.",
              );
          }
        }),
      );
    } else if (data.poster) {
      this.poster = await loadImage(data.poster);
    }
  }

  draw(canvas: HTMLCanvasElement, t: number) {
    const image = this.manifest.enabled
      ? this.images[sequenceFrame(t, this.manifest)]
      : this.poster;
    if (!image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(1000 * dpr),
      height = Math.round((2000 / 3) * dpr);
    // A static concept needs one draw. Sequence frames still update exactly on frame changes.
    if (
      this.lastCanvas === canvas &&
      this.lastImage === image &&
      canvas.width === width &&
      canvas.height === height
    )
      return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f1efe8";
    ctx.fillRect(0, 0, 1000, 2000 / 3);
    const scale = Math.min(
      1000 / image.naturalWidth,
      2000 / 3 / image.naturalHeight,
    );
    const w = image.naturalWidth * scale,
      h = image.naturalHeight * scale;
    ctx.drawImage(image, (1000 - w) / 2, (2000 / 3 - h) / 2, w, h);
    this.lastCanvas = canvas;
    this.lastImage = image;
  }
}
