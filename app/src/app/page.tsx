// Temporary pre-launch page. Replaced by the real homepage in Phase 2.
export default function Home() {
  return (
    <>
      <header className="bg-[#0e3b43] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark.svg" alt="" width={32} height={32} />
          <span className="font-serif text-xl font-bold tracking-wide">
            BEMERICK EXPRESS
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
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
      </main>

      <footer className="bg-[#082a30] text-sm text-[#e4ecea]">
        <div className="mx-auto max-w-6xl px-4 py-6">
          © 2026 BEMERICK EXPRESS
        </div>
      </footer>
    </>
  );
}
