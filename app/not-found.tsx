import "./site.css";
import type { Metadata } from "next";
import { TimeToggle } from "@/components/scene/TimeToggle";

export const metadata: Metadata = { title: "Not found | Rainer Gonzaga" };

export default function NotFound() {
  return (
    <div className="rg rg-doc">
      <div className="rg-scene is-still" aria-hidden />
      <div className="rg-bar">
        <TimeToggle />
      </div>
      <main>
        <section className="rg-glass rg-panel rg-404">
          <h1>Off the path</h1>
          <p>This page doesn&apos;t exist, or it moved.</p>
          <p className="rg-case-links">
            <a className="rg-dl" href="/" target="_blank" rel="noopener noreferrer">Back to the lake</a>
          </p>
        </section>
      </main>
    </div>
  );
}
