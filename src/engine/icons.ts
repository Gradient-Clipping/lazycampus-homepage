/** Keep the supplied SVG files as source assets. Rasterize each once at a fixed
 * resolution so Chromium cannot change SVG edge sampling as a 3D card moves.
 * This is an initialization cache, not a visual or geometry modification.
 */
let vscodeIcon: HTMLCanvasElement | undefined;
export const getVscodeIcon = () => vscodeIcon;

export async function prepareSuppliedIcons() {
  await Promise.all(
    ["kubernetes", "git-branch", "flux", "visual-studio-code"].map(
      async (name) => {
        const source = new Image();
        source.src = `/icons/${name}.svg`;
        await source.decode();
        const height = 256,
          width = Math.round(
            (height * source.naturalWidth) / source.naturalHeight,
          );
        const raster = document.createElement("canvas");
        raster.width = width;
        raster.height = height;
        raster.getContext("2d")!.drawImage(source, 0, 0, width, height);
        if (name === "visual-studio-code") {
          vscodeIcon = raster;
          return;
        }
        const url = raster.toDataURL("image/png");
        await Promise.all(
          [...document.querySelectorAll(`[data-supplied-icon="${name}"]`)].map(
            async (node) => {
              const image = new Image();
              image.alt = "";
              image.width = width;
              image.height = height;
              image.src = url;
              await image.decode();
              node.replaceChildren(image);
            },
          ),
        );
      },
    ),
  );
}
