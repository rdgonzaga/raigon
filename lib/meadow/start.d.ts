export type MeadowApi = {
  /** 0 = golden morning, 1 = sunset; values in between blend the two. */
  setMode(mode: number): void;
  setScroll(progress: number): void;
};

export function startMeadow(
  canvas: HTMLCanvasElement,
  hooks?: {
    onFirstFrame?: () => void;
    onFreeCamera?: (free: boolean) => void;
    onContextLost?: () => void;
    /** the frame rate stayed too low at the lowest resolution; the loop has stopped */
    onSlow?: () => void;
    /** start-up progress, 0..1 */
    onProgress?: (f: number) => void;
  },
): Promise<MeadowApi>;
