import { site } from "@/lib/content";

export function Footer() {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-line bg-void px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Contact</p>
        <h2 className="mt-2 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
          Open to backend, security, and applied ML roles.
        </h2>

        <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm">
          <a
            href={`mailto:${site.email}`}
            className="text-ash transition-colors hover:text-signal"
          >
            {site.email}
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="text-ash transition-colors hover:text-signal"
          >
            github
          </a>
          <a
            href={site.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-ash transition-colors hover:text-signal"
          >
            linkedin
          </a>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-line pt-6 font-mono text-xs text-ash-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            connection closed · {new Date().getFullYear()} {site.name}
          </p>
          <p>EOF</p>
        </div>
      </div>
    </footer>
  );
}
