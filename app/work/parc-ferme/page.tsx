import "../../site.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TimeToggle } from "@/components/scene/TimeToggle";
import { latestRace, liveRecord } from "@/lib/parcferme";

export const metadata: Metadata = {
  title: "Parc Fermé case study | Rainer Gonzaga",
  description: "How Parc Fermé predicts F1 races after qualifying, what broke along the way, and how it has scored live.",
  alternates: { canonical: "/work/parc-ferme" },
};

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

function Bars({ model, grid, unit }: { model: number; grid: number; unit: string }) {
  const max = unit === "%" ? 100 : 1;
  const fmt = (v: number) => (unit === "%" ? `${v}%` : v.toFixed(2));
  return (
    <div className="rg-bars">
      {[["Model", model], ["Starting grid", grid]].map(([name, v]) => (
        <div key={name as string} className="rg-barrow">
          <span>{name}</span>
          <span className="rg-bartrack"><span className={name === "Model" ? "is-model" : undefined} style={{ width: `${((v as number) / max) * 100}%` }} /></span>
          <b>{fmt(v as number)}</b>
        </div>
      ))}
    </div>
  );
}

export default async function ParcFerme() {
  const live = liveRecord(await latestRace());
  const results = [
    { label: "Podium finishers called", ...live.podium, unit: "%" },
    { label: "Finishing order (Spearman)", ...live.spearman, unit: "" },
    { label: "Race winner called", ...live.winner, unit: "%" },
  ];
  const podiums = live.podium.model > live.podium.grid ? "It calls podiums better than the grid" : "It doesn't call podiums better than the grid yet";
  const winners = live.winner.model < live.winner.grid ? "but picks the winner less often" : "and picks the winner at least as often";
  return (
    <div className="rg rg-doc">
      <div className="rg-scene is-still" aria-hidden />
      <div className="rg-bar">
        <TimeToggle />
      </div>
      <main>
        <article className="rg-case">
          <header className="rg-glass rg-panel">
          <p className="rg-back"><Link href="/#work" {...ext}>All projects</Link></p>
          <h1>Parc Fermé</h1>
          <p className="rg-case-lead">
            An F1 model that sets every driver&apos;s chance to win, reach the podium, score points or retire once qualifying is done,
            and publishes it every race weekend.
          </p>
          <p className="rg-case-links">
            <a className="rg-dl" href="https://f1.raigon.dev" {...ext}>Live site <ArrowUpRight aria-hidden /></a>
            <a href="https://github.com/rdgonzaga/f1-prediction" {...ext}>Source</a>
          </p>
          </header>

          <section className="rg-glass rg-panel">
          <h2>The problem</h2>
          <p>
            The starting grid is a hard baseline to beat: most drivers finish close to where they start. The question was whether a model
            could beat it, and, more usefully, put honest numbers on the outcome. The grid says who starts first. It can&apos;t say he&apos;s
            31% to win, or that another driver has a one-in-three chance of not finishing.
          </p>
          </section>

          <section className="rg-glass rg-panel">
          <h2>How it works</h2>
          <ul>
            <li>Session results from 2022 to 2026 through FastF1, without car telemetry, which the race order doesn&apos;t need.</li>
            <li>Only features that carry across rule changes: grid, qualifying and teammate gaps, long-run practice pace, form and how hard the track is to pass on. 2026 races weigh three times as much.</li>
            <li>An XGBoost ranker grouped by race, checked walk-forward so it never trains on a race it is scored on.</li>
            <li>Win, podium and points odds from a Plackett-Luce simulation, plus a separate retirement model.</li>
            <li>It runs itself: after qualifying it fetches the official grid (penalties never show up in the timing data), predicts, rebuilds the site and scores the race afterwards, from a scheduled task or GitHub Actions when my PC is off.</li>
          </ul>
          </section>

          <section className="rg-glass rg-panel">
          <h2>What broke</h2>
          <ul>
            <li><strong>The first download was 992 MB for six sessions,</strong> almost all telemetry. Dropping it brought ten sessions to under 1 MB and made a full 2022–2026 pull practical.</li>
            <li><strong>More features made it worse.</strong> With about 30 training races the full feature set overfit; grid plus qualifying beat it. The rest now has to earn its place in a backtest.</li>
            <li><strong>Penalties were invisible.</strong> A 12-place grid drop at Monza wasn&apos;t in any timing message, so the model now reads the official starting grid from formula1.com, with OpenF1 as backup.</li>
            <li><strong>The order doesn&apos;t beat the grid.</strong> Across 48 races of 2024 and 2025 the predicted order landed within the margin of error of the grid. So the product became the percentages, which the grid can&apos;t give.</li>
          </ul>
          </section>

          <section className="rg-glass rg-panel">
          <h2>How it has done live</h2>
          <p>Predictions made after qualifying and scored after each race, from the {live.since} GP on ({live.races} races so far).</p>
          {results.map((r) => (
            <div key={r.label} className="rg-result">
              <h3>{r.label}</h3>
              <Bars model={r.model} grid={r.grid} unit={r.unit} />
            </div>
          ))}
          <p>
            {podiums} {winners}, and Polymarket&apos;s pre-race odds still score better on the winner. {live.races} races is a small sample, so
            the next step is a rerun on the full data set to prune features.
          </p>
          </section>
        </article>
      </main>
    </div>
  );
}
