import { afterEach, describe, expect, it, vi } from "vitest";
import { LIVE_FALLBACK, latestRace, liveRecord, podiumLine, raceLine, type LatestRace } from "./parcferme";

const race: LatestRace = {
  race: "Abu Dhabi", url: "https://f1.raigon.dev/2026/round-24/", pending: true,
  favourite: { code: "NOR", win: 34.4 }, winner: null, podium_called: null,
};

describe("parcferme", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("words a pending and a scored race", () => {
    expect(raceLine(race)).toBe("Abu Dhabi GP: NOR is the favourite at 34% to win.");
    expect(raceLine({ ...race, pending: false, winner: "VER", podium_called: 2 })).toBe("Abu Dhabi GP: 2 of 3 podium spots called, VER won.");
  });

  // the page must still render when the feed is down or malformed
  it("returns null instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await latestRace()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    expect(await latestRace()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 404 })));
    expect(await latestRace()).toBeNull();
  });
});

describe("liveRecord", () => {
  it("uses the feed's record and falls back when it is missing or malformed", () => {
    const live = { races: 7, since: "Azerbaijan", podium: { model: 80, grid: 55 }, spearman: { model: 0.8, grid: 0.6 }, winner: { model: 70, grid: 80 } };
    expect(liveRecord({ ...race, live })).toBe(live);
    expect(liveRecord(null)).toBe(LIVE_FALLBACK);
    expect(liveRecord({ ...race, live: { ...live, podium: { model: "80" } } as never })).toBe(LIVE_FALLBACK);
    expect(podiumLine(live)).toBe("Since going live it has called 80% of podium finishers, against 55% from the starting grid.");
  });
});
