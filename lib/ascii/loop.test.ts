import { describe, expect, it, vi } from "vitest";
import { createLoop } from "./loop";

function fakeRaf() {
  let cb: FrameRequestCallback | null = null;
  let id = 0;
  return {
    raf: (c: FrameRequestCallback) => { cb = c; return ++id; },
    caf: () => { cb = null; },
    fire: (ts: number) => { const c = cb; cb = null; c?.(ts); },
  };
}

describe("createLoop", () => {
  it("draws at ~30fps on a healthy 60Hz display and stays at 30", () => {
    const r = fakeRaf();
    const draw = vi.fn();
    const loop = createLoop({ draw, raf: r.raf, caf: r.caf });
    loop.start();
    for (let i = 0; i <= 300; i++) r.fire(i * (1000 / 60));
    expect(draw.mock.calls.length).toBeGreaterThanOrEqual(149);
    expect(draw.mock.calls.length).toBeLessThanOrEqual(151);
    expect(loop.fps()).toBe(30);
  });

  it("steps down 30 -> 20 -> 15, then reports struggling once", () => {
    const r = fakeRaf();
    const onStruggling = vi.fn();
    const loop = createLoop({ draw: () => {}, onStruggling, raf: r.raf, caf: r.caf, windowSize: 10 });
    loop.start();
    let ts = 0;
    const run = (frames: number) => { for (let i = 0; i < frames; i++) r.fire((ts += 120)); };
    run(11);
    expect(loop.fps()).toBe(20);
    run(10);
    expect(loop.fps()).toBe(15);
    expect(onStruggling).not.toHaveBeenCalled();
    run(10);
    expect(onStruggling).toHaveBeenCalledTimes(1);
    run(50);
    expect(onStruggling).toHaveBeenCalledTimes(1);
    expect(loop.fps()).toBe(15);
  });

  it("ignores the gap across stop/start (hidden tab)", () => {
    const r = fakeRaf();
    const draw = vi.fn();
    const loop = createLoop({ draw, raf: r.raf, caf: r.caf, windowSize: 3 });
    loop.start();
    r.fire(0); r.fire(33.4); r.fire(66.8);
    loop.stop();
    r.fire(1000);
    expect(draw).toHaveBeenCalledTimes(3);
    loop.start();
    r.fire(300000); r.fire(300033.4); r.fire(300066.8); r.fire(300100.2);
    expect(loop.fps()).toBe(30);
    expect(draw.mock.calls[3][1]).toBe(0);
  });

  it("treats a single long stall as a resume, not as jank", () => {
    const r = fakeRaf();
    const onStruggling = vi.fn();
    const loop = createLoop({ draw: () => {}, onStruggling, raf: r.raf, caf: r.caf, windowSize: 10 });
    loop.start();
    let ts = 0;
    for (let i = 0; i < 5; i++) r.fire((ts += 33.4));
    r.fire((ts += 2000));
    for (let i = 0; i < 30; i++) r.fire((ts += 33.4));
    expect(loop.fps()).toBe(30);
    expect(onStruggling).not.toHaveBeenCalled();
  });

  it("still detects a machine where every frame is a long gap", () => {
    const r = fakeRaf();
    const onStruggling = vi.fn();
    const loop = createLoop({ draw: () => {}, onStruggling, raf: r.raf, caf: r.caf, windowSize: 10 });
    loop.start();
    let ts = 0;
    for (let i = 0; i < 60; i++) r.fire((ts += 400));
    expect(loop.fps()).toBe(15);
    expect(onStruggling).toHaveBeenCalledTimes(1);
  });

  it("caps dt at 0.1s", () => {
    const r = fakeRaf();
    const draw = vi.fn();
    const loop = createLoop({ draw, raf: r.raf, caf: r.caf });
    loop.start();
    r.fire(0); r.fire(500);
    expect(draw.mock.calls[1][1]).toBe(0.1);
  });
});
