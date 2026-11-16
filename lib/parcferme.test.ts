import { afterEach, describe, expect, it, vi } from "vitest";
import { latestRace, raceLine, type LatestRace } from "./parcferme";

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
