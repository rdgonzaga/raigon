/** The newest race from Parc Fermé's feed (f1-prediction writes latest.json on every site build). */
type Pair = { model: number; grid: number };

export type LiveRecord = { races: number; since: string; podium: Pair; spearman: Pair; winner: Pair };

export type LatestRace = {
  race: string;
  url: string;
  pending: boolean;
  favourite: { code: string; win: number };
  winner: string | null;
  podium_called: number | null;
  live?: LiveRecord | null;
};

const FEED = "https://f1.raigon.dev/latest.json";

// last known record, used when the feed is down
export const LIVE_FALLBACK: LiveRecord = {
  races: 6, since: "Azerbaijan",
  podium: { model: 78, grid: 56 }, spearman: { model: 0.78, grid: 0.63 }, winner: { model: 67, grid: 83 },
};

export async function latestRace(): Promise<LatestRace | null> {
  try {
    const res = await fetch(FEED, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as LatestRace;
    return typeof data?.race === "string" && typeof data.favourite?.code === "string" ? data : null;
  } catch {
    return null; // the card just shows without the live line
  }
}

const isPair = (p: unknown): p is Pair =>
  typeof (p as Pair)?.model === "number" && typeof (p as Pair)?.grid === "number";

export function liveRecord(r: LatestRace | null | undefined): LiveRecord {
  const l = r?.live;
  return l && typeof l.races === "number" && typeof l.since === "string" && isPair(l.podium) && isPair(l.spearman) && isPair(l.winner)
    ? l
    : LIVE_FALLBACK;
}

export function podiumLine(l: LiveRecord): string {
  return `Since going live it has called ${l.podium.model}% of podium finishers, against ${l.podium.grid}% from the starting grid.`;
}

export function raceLine(r: LatestRace): string {
  if (r.pending) return `${r.race} GP: ${r.favourite.code} is the favourite at ${Math.round(r.favourite.win)}% to win.`;
  return `${r.race} GP: ${r.podium_called ?? 0} of 3 podium spots called${r.winner ? `, ${r.winner} won` : ""}.`;
}
