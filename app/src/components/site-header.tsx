"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  sections,
  primarySections,
  moreSections,
  watchLinks,
  aboutLinks,
} from "@/lib/sections";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeAll = () => {
    setMenuOpen(false);
    setMoreOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-brand text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" onClick={closeAll} className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
          <span className="font-serif text-lg font-bold tracking-wide sm:text-xl">
            BEMERICK EXPRESS
          </span>
        </Link>

        {/* Desktop menu */}
        <nav aria-label="Sections" className="hidden flex-1 items-center gap-1 lg:flex">
          {primarySections.map((s) => {
            const active = isActive(pathname, `/${s.slug}`);
            return (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                onClick={closeAll}
                aria-current={active ? "page" : undefined}
                className={`rounded px-2.5 py-1.5 text-[15px] font-semibold hover:bg-white/10 ${
                  active ? "text-accent" : ""
                }`}
              >
                {s.name}
              </Link>
            );
          })}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[15px] font-semibold hover:bg-white/10"
            >
              More
              <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden>
                <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full mt-2 w-52 rounded-md bg-brand-deep p-2 shadow-lg ring-1 ring-white/10">
                {[...moreSections.map((s) => ({ href: `/${s.slug}`, name: s.name })), ...watchLinks.filter((l) => l.href !== "/live")].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={closeAll}
                    className="block rounded px-3 py-2 text-[15px] hover:bg-white/10"
                  >
                    {l.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/search"
            onClick={closeAll}
            aria-label="Search"
            className="rounded p-2 hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded p-2 hover:bg-white/10 lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              {menuOpen ? (
                <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile swipe strip */}
      <nav
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => {
          const active = isActive(pathname, `/${s.slug}`);
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              onClick={closeAll}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-2.5 py-2.5 text-sm font-semibold ${
                active ? "border-accent text-accent" : "border-transparent"
              }`}
            >
              {s.name}
            </Link>
          );
        })}
      </nav>

      {/* Mobile full menu */}
      {menuOpen && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-brand-deep px-4 pb-8 pt-4 lg:hidden">
          <MenuGroup title="Sections" links={sections.map((s) => ({ href: `/${s.slug}`, name: s.name }))} onNavigate={closeAll} />
          <MenuGroup title="Watch & discover" links={watchLinks} onNavigate={closeAll} />
          <MenuGroup title="About BX" links={aboutLinks} onNavigate={closeAll} />
        </div>
      )}
    </header>
  );
}

function MenuGroup({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: { href: string; name: string }[];
  onNavigate: () => void;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">{title}</p>
      <div className="grid grid-cols-2 gap-x-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className="border-b border-white/10 py-3 text-base font-semibold"
          >
            {l.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
