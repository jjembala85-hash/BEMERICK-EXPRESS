import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-4 w-1 bg-crane-gold" aria-hidden />
          Page not found
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-ink">
          We can&rsquo;t find that page.
        </h1>
        <p className="mt-4 text-slate">
          It may have moved, or it hasn&rsquo;t been built yet.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded bg-brand px-5 py-2.5 font-semibold text-white"
        >
          Back to the homepage
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
