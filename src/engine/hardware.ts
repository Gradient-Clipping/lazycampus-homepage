/** Flatten the SVG deck once, before readiness. Chrome otherwise chooses slightly
 * different small-glyph masks after a sequence of 3D transforms. The editable
 * hardware source stays in KeyboardDeck.tsx; no raster asset is generated on disk.
 */
export async function prepareLaptopShell() {
  const original = document.querySelector<SVGSVGElement>("svg.laptop-deck");
  if (!original) return;
  const svg = original.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const width = 1248,
    height = 620;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg
    .querySelectorAll("[font-family]")
    .forEach((node) => node.setAttribute("font-family", "Arial, sans-serif"));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const source = new Image();
    source.src = url;
    await source.decode();
    const raster = document.createElement("canvas");
    raster.width = width;
    raster.height = height;
    raster.getContext("2d")!.drawImage(source, 0, 0, width, height);
    const cached = new Image();
    cached.src = raster.toDataURL("image/png");
    cached.alt = "";
    cached.className = "laptop-deck";
    cached.width = 624;
    cached.height = 310;
    cached.setAttribute("aria-hidden", "true");
    await cached.decode();
    original.replaceWith(cached);
  } finally {
    URL.revokeObjectURL(url);
  }
}
