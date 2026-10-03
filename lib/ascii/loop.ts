export const FPS_LADDER = [30, 20, 15] as const;

const TOLERANCE_MS = 2;
const OVER_BUDGET = 1.5;
/** A gap this long is a stall or resume (sleep, debugger, long task), not steady-state jank. */
const RESUME_GAP_MS = 250;
/** Consecutive long gaps beyond this count are real slowness and get sampled. */
const MAX_RESUME_STREAK = 2;

export type LoopOptions = {
  draw: (t: number, dt: number) => void;
  onStruggling?: () => void;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (id: number) => void;
  windowSize?: number;
};

export type Loop = { start(): void; stop(): void; fps(): number };

/**
 * rAF loop capped to a target fps that steps down when frames arrive late.
 * Measures delivered frame interval, not draw time: Chrome defers canvas raster
 * to frame commit, so draw() alone under-reports cost under software raster.
 */
export function createLoop({
  draw,
  onStruggling,
  raf = (cb) => requestAnimationFrame(cb),
  caf = (id) => cancelAnimationFrame(id),
  windowSize = 60,
}: LoopOptions): Loop {
  let step = 0;
  let id = 0;
  let running = false;
  let lastDraw = -1;
  let sum = 0;
  let count = 0;
  let struggled = false;
  let longStreak = 0;

  const tick = (ts: number) => {
    if (!running) return;
    id = raf(tick);
    const interval = 1000 / FPS_LADDER[step];
    if (lastDraw >= 0 && ts - lastDraw < interval - TOLERANCE_MS) return;

    let dt = 0;
    if (lastDraw >= 0) {
      const delivered = ts - lastDraw;
      dt = Math.min(delivered / 1000, 0.1);
      if (delivered > RESUME_GAP_MS && longStreak < MAX_RESUME_STREAK) {
        longStreak++;
        sum = 0;
        count = 0;
      } else {
        if (delivered <= RESUME_GAP_MS) longStreak = 0;
        sum += delivered;
        count++;
      }
      if (count >= windowSize) {
        if (sum / count > interval * OVER_BUDGET) {
          if (step < FPS_LADDER.length - 1) step++;
          else if (!struggled) {
            struggled = true;
            onStruggling?.();
          }
        }
        sum = 0;
        count = 0;
      }
    }
    lastDraw = ts;
    draw(ts / 1000, dt);
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastDraw = -1;
      longStreak = 0;
      sum = 0;
      count = 0;
      id = raf(tick);
    },
    stop() {
      running = false;
      caf(id);
    },
    fps: () => FPS_LADDER[step],
  };
}
