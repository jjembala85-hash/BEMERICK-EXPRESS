// Temporary pre-launch homepage. Replaced by the real homepage in Phase 2.
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
        <span className="inline-block h-4 w-1 bg-crane-gold" aria-hidden />
        Coming soon
      </p>
      <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
        Uganda&rsquo;s fast, verified, mobile-first newsroom.
      </h1>
      <p className="mt-5 font-serif text-xl italic leading-relaxed text-slate">
        News. Insight. Impact.
      </p>
      <div className="mt-10 h-0.5 w-24 bg-crane-gold" aria-hidden />
      <p className="mt-6 max-w-xl text-base leading-relaxed text-slate">
        BX News is being built. Clear reporting on what happened, what it
        means, and what happens next.
      </p>
    </div>
  );
}
