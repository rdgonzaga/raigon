import { GLYPHS, LEVELS } from "./field";

export const CELL_W = 10;
export const CELL_H = 16;
export const FONT_PX = 13;

export const atlasX = (glyph: number) => glyph * CELL_W;
export const atlasY = (level: number) => (level - 1) * CELL_H;

export function alphaFor(level: number): number {
  return 0.22 + 0.78 * Math.pow((level - 1) / (LEVELS - 2), 1.4);
}

/** Every glyph at every lit level, rendered once. Rows are levels 1..7, columns are GLYPHS. */
export function buildAtlas(color: string, fontFamily: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPHS.length * CELL_W;
  canvas.height = (LEVELS - 1) * CELL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.font = `${FONT_PX}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  for (let level = 1; level < LEVELS; level++) {
    ctx.globalAlpha = alphaFor(level);
    for (let g = 0; g < GLYPHS.length; g++) {
      ctx.fillText(GLYPHS[g], atlasX(g) + CELL_W / 2, atlasY(level) + CELL_H / 2);
    }
  }
  return canvas;
}
