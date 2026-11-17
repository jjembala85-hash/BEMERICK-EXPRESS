import Link from "next/link";
import { sections, watchLinks, aboutLinks, policyLinks } from "@/lib/sections";
import { followLinks } from "@/lib/site";


export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-deep text-[#e4ecea]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
        <FooterColumn title="Sections">
          {sections.map((s) => (
            <FooterLink key={s.slug} href={`/${s.slug}`}>{s.name}</FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title="Watch & discover">
          {watchLinks.map((l) => (
            <FooterLink key={l.href} href={l.href}>{l.name}</FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title="About BX">
          {[...aboutLinks, ...policyLinks].map((l) => (
            <FooterLink key={l.href} href={l.href}>{l.name}</FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title="Follow">
          {followLinks.map((l) =>
            l.href ? (
              <li key={l.name}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-1 text-sm hover:text-white hover:underline"
                >
                  {l.name}
                </a>
              </li>
            ) : (
              <li key={l.name} className="py-1 text-sm opacity-70">{l.name}</li>
            ),
          )}
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark-reverse.svg" alt="" width={24} height={24} />
          <span>© 2026 BEMERICK EXPRESS · News. Insight. Impact.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="block py-1 text-sm hover:text-white hover:underline">
        {children}
      </Link>
    </li>
  );
}
