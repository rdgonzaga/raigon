/** The newest race from Parc Fermé's feed (f1-prediction writes latest.json on every site build). */
export type LatestRace = {
  race: string;
  url: string;
  pending: boolean;
  favourite: { code: string; win: number };
  winner: string | null;
  podium_called: number | null;
};

const FEED = "https://f1.raigon.dev/latest.json";

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

export function raceLine(r: LatestRace): string {
  if (r.pending) return `${r.race} GP: ${r.favourite.code} is the favourite at ${Math.round(r.favourite.win)}% to win.`;
  return `${r.race} GP: ${r.podium_called ?? 0} of 3 podium spots called${r.winner ? `, ${r.winner} won` : ""}.`;
}
