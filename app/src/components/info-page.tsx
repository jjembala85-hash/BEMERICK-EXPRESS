/**
 * Layout for About, Contact and policy pages: kicker, title, intro and prose.
 * `draftPolicy` shows a notice until a media lawyer has reviewed the text (Blueprint §11).
 */
export function InfoPage({
  kicker,
  title,
  intro,
  updated,
  draftPolicy = false,
  children,
}: {
  kicker: string;
  title: string;
  intro?: string;
  updated?: string;
  draftPolicy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="border-b-2 border-crane-gold pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
          {kicker}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink">{title}</h1>
        {intro && <p className="mt-3 font-serif text-lg italic leading-relaxed text-slate sm:text-xl">{intro}</p>}
        {updated && <p className="mt-3 text-sm text-slate">Last updated {updated}</p>}
      </header>
      {draftPolicy && (
        <p role="note" className="mt-6 rounded-md border-l-4 border-crane-gold bg-surface px-4 py-3 text-sm text-ink">
          <span className="font-semibold">Draft.</span> This policy is being reviewed by a media lawyer before BX News launches. It
          already describes how the site works today.
        </p>
      )}
      <div className="prose-bx mt-6">{children}</div>
    </div>
  );
}
