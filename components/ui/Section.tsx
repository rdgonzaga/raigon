type SectionProps = {
  id: string;
  className?: string;
  children: React.ReactNode;
};

export function Section({ id, className = "", children }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-16 px-4 py-24 sm:px-6 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
