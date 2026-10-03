"use client";

import { useEffect, useRef } from "react";
import { CELL_H, CELL_W, atlasX, atlasY, buildAtlas } from "@/lib/ascii/atlas";
import {
  HEX_COUNT, decayHeat, depositHeat, flickerAt, glyphFor, levelAt, rerollGlyphs, stepTears,
  type FieldParams, type TearState,
} from "@/lib/ascii/field";
import { createLoop } from "@/lib/ascii/loop";

const SEED = 1337;
const RESIZE_DEBOUNCE_MS = 150;
/** Max cells between heat stamps when the pointer moves fast, so the trail has no gaps. */
const TRAIL_STEP = 4;
/** Heat above this scrambles glyphs, the "decrypting under the cursor" shimmer. */
const SCRAMBLE_HEAT = 0.35;

type Props = {
  color: string;
  animate: boolean;
  pointerEnabled: boolean;
  onStruggling?: () => void;
};

export function AsciiBackground({ color, animate, pointerEnabled, onStruggling }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const struggleRef = useRef(onStruggling);

  useEffect(() => {
    struggleRef.current = onStruggling;
  }, [onStruggling]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let cancelled = false;
    let atlas: HTMLCanvasElement | null = null;
    let cols = 0;
    let rows = 0;
    let glyphs = new Uint8Array(0);
    let heat = new Float32Array(0);
    const tearState: TearState = { tears: [], nextAt: 2 };
    const params: FieldParams = { seed: SEED, rows: 0, sweep: animate, tears: tearState.tears };
    // Pointer in cell units; `last*` is where the trail was stamped last frame. NaN = no pointer.
    let pointerCol = NaN;
    let pointerRow = NaN;
    let lastCol = NaN;
    let lastRow = NaN;

    const resize = () => {
      // clientWidth excludes the scrollbar; innerWidth would make the browser rescale the bitmap every composite.
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      cols = Math.ceil(canvas.width / CELL_W);
      rows = Math.ceil(canvas.height / CELL_H);
      params.rows = rows;
      glyphs = new Uint8Array(cols * rows);
      heat = new Float32Array(cols * rows);
      for (let i = 0; i < glyphs.length; i++) glyphs[i] = Math.floor(Math.random() * HEX_COUNT);
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!atlas) return;
      if (animate) {
        stepTears(tearState, t, rows, Math.random);
        rerollGlyphs(glyphs, dt, Math.random);
        decayHeat(heat, dt);
        stampTrail();
      }
      const flicker = animate ? flickerAt(t) : 0;
      for (let r = 0; r < rows; r++) {
        const y = r * CELL_H;
        const base = r * cols;
        for (let c = 0; c < cols; c++) {
          const i = base + c;
          const h = heat[i];
          if (h > SCRAMBLE_HEAT && Math.random() < h * 0.25) glyphs[i] = Math.floor(Math.random() * HEX_COUNT);
          const level = levelAt(c, r, t, params, flicker, h);
          if (level === 0) continue;
          const g = glyphFor(level, glyphs[i]);
          ctx.drawImage(atlas, atlasX(g), atlasY(level), CELL_W, CELL_H, c * CELL_W, y, CELL_W, CELL_H);
        }
      }
    };

    // Stamp heat along the segment since last frame, so fast flicks leave a continuous trail.
    const stampTrail = () => {
      if (Number.isNaN(pointerCol)) return;
      const fromCol = Number.isNaN(lastCol) ? pointerCol : lastCol;
      const fromRow = Number.isNaN(lastRow) ? pointerRow : lastRow;
      const dist = Math.hypot(pointerCol - fromCol, pointerRow - fromRow);
      const steps = Math.max(1, Math.ceil(dist / TRAIL_STEP));
      for (let s = 1; s <= steps; s++) {
        const k = s / steps;
        depositHeat(heat, cols, rows, fromCol + (pointerCol - fromCol) * k, fromRow + (pointerRow - fromRow) * k);
      }
      lastCol = pointerCol;
      lastRow = pointerRow;
    };

    const loop = animate ? createLoop({ draw, onStruggling: () => struggleRef.current?.() }) : null;
    const drawStatic = () => draw(0, 0);

    resize();
    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    document.fonts.ready.then(() => {
      if (cancelled) return;
      atlas = buildAtlas(color, `${fontFamily}, monospace`);
      if (loop) {
        if (!document.hidden) loop.start();
      } else {
        drawStatic();
      }
    });

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (!loop) drawStatic();
      }, RESIZE_DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (!loop || !atlas) return;
      if (document.hidden) loop.stop();
      else loop.start();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerCol = e.clientX / CELL_W;
      pointerRow = e.clientY / CELL_H;
    };
    const onPointerLeave = () => {
      pointerCol = pointerRow = lastCol = lastRow = NaN;
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    const trackPointer = animate && pointerEnabled;
    if (trackPointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelled = true;
      loop?.stop();
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (trackPointer) {
        window.removeEventListener("pointermove", onPointerMove);
        document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [color, animate, pointerEnabled]);

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />;
}
