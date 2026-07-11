import { GlitchText } from "./GlitchText";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, trailing }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          {eyebrow}
        </p>
        <GlitchText
          as="h2"
          text={title}
          trigger="inView"
          className="mt-2 block font-mono text-2xl font-semibold tracking-tight text-paper sm:text-3xl"
        />
      </div>
      {trailing ? (
        <div className="hidden font-mono text-xs text-ash-dim sm:block">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
