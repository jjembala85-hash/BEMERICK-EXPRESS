"use client";

// Site header and menu (D-048): logo bar, a heavy gold divider, and the section
// row on every screen size. On computers, pointing at a section opens a panel of
// its headlines (pinned, latest, most read), loaded only when first opened. On
// phones the header slides away while reading down and returns on the slightest
// scroll up. The ☰ button opens the full menu on every screen size.
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { sections } from "@/lib/sections";
import { Icon } from "@/components/icons";
import { notePath } from "@/lib/nav-history";
import type { SectionMenu } from "@/lib/queries/public";

type NavItem = { href: string; name: string; icon: string };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Top",
    items: [
      { href: "/", name: "Home", icon: "home" },
      { href: "/latest", name: "Latest", icon: "latest" },
      { href: "/live", name: "Live", icon: "live" },
      { href: "/bulletins", name: "Bulletins", icon: "bulletins" },
    ],
  },
  {
    title: "Sections",
    items: sections.map((s) => ({ href: `/${s.slug}`, name: s.name, icon: s.slug })),
  },
  {
    title: "BX News",
    items: [
      { href: "/about", name: "About BX", icon: "about" },
      { href: "/contact", name: "Contact", icon: "contact" },
      { href: "/advertise", name: "Advertise", icon: "advertise" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// Section headlines, fetched once per section per visit.

const menuCache = new Map<string, Promise<SectionMenu | null>>();
function loadMenu(slug: string) {
  let p = menuCache.get(slug);
  if (!p) {
    p = fetch(`/api/nav/${slug}`)
      .then((r) => (r.ok ? (r.json() as Promise<SectionMenu>) : null))
      .catch(() => null);
    // A failed load is retried next time.
    p.then((m) => {
      if (!m) menuCache.delete(slug);
    });
    menuCache.set(slug, p);
  }
  return p;
}

function useMenu(slug: string | null) {
  const [menus, setMenus] = useState<Record<string, SectionMenu | null>>({});
  useEffect(() => {
    if (!slug || slug in menus) return;
    let cancelled = false;
    loadMenu(slug).then((m) => {
      if (!cancelled) setMenus((all) => ({ ...all, [slug]: m }));
    });
    return () => {
      cancelled = true;
    };
  }, [slug, menus]);
  return slug ? menus[slug] : undefined;
}

// ---------------------------------------------------------------------------
// Header behaviour while scrolling.

function useScrollHeader(locked: boolean) {
  const [state, setState] = useState({ hidden: false, scrolled: false });
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const phone = window.matchMedia("(max-width: 1023px)");
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const scrolled = y > 8;
        let hidden = false;
        // Phones only: hide while reading down, show again on any scroll up.
        if (phone.matches && !locked && y > 160) hidden = y > lastY;
        lastY = y;
        setState((s) => (s.hidden === hidden && s.scrolled === scrolled ? s : { hidden, scrolled }));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [locked]);
  return locked ? { ...state, hidden: false } : state;
}

// ---------------------------------------------------------------------------

export function SiteChrome({
  children,
  footer,
  banner,
  livePill,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Breaking-news strip, shown above the page content when active. */
  banner?: React.ReactNode;
  /** "● LIVE" link in the header, shown only while a stream is on air. */
  livePill?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { hidden, scrolled } = useScrollHeader(drawerOpen || openSection !== null);
  const closeDrawer = () => setDrawerOpen(false);

  // Escape closes whatever is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      setOpenSection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={`sticky top-0 z-40 bg-brand text-white transition-[transform,box-shadow] duration-200 motion-reduce:transition-none ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "shadow-[0_6px_18px_rgba(0,0,0,0.28)]" : ""}`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="site-menu"
            className="rounded p-2 hover:bg-white/10 active:bg-white/20"
          >
            <Icon name="menu" size={22} />
          </button>

          <Link href="/" onClick={closeDrawer} className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
            <span className="truncate font-serif text-lg font-bold tracking-wide sm:text-xl">BEMERICK EXPRESS</span>
          </Link>

          <span className="ml-auto">{livePill}</span>
          <Link href="/search" aria-label="Search" className="rounded p-2 hover:bg-white/10 active:bg-white/20">
            <Icon name="search" />
          </Link>
        </div>

        {/* The heavy divider in BX gold, full width on every page. */}
        <div className="h-[3px] bg-accent" aria-hidden />

        <SectionRow openSection={openSection} setOpenSection={setOpenSection} />
      </header>

      <PathTracker />

      <div className="flex min-w-0 flex-1 flex-col">
        {banner}
        {/* At least a screen tall, so the footer never starts in view and jumps when streamed content arrives (CLS budget < 0.1). */}
        <main className="min-h-dvh flex-1">{children}</main>
        {footer}
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}

/** Tells the Back button which pages this visit has been through. */
function PathTracker() {
  return (
    <Suspense fallback={null}>
      <PathTrackerLive />
    </Suspense>
  );
}
function PathTrackerLive() {
  const pathname = usePathname();
  useEffect(() => notePath(pathname), [pathname]);
  return null;
}

// ---------------------------------------------------------------------------
// Section row and its headline panels.

type RowProps = { openSection: string | null; setOpenSection: (slug: string | null) => void };

// usePathname() is only known at request time for story pages, so the part that
// highlights the current section sits behind Suspense.
function SectionRow(props: RowProps) {
  return (
    <Suspense fallback={<SectionRowView {...props} pathname="" />}>
      <SectionRowLive {...props} />
    </Suspense>
  );
}
function SectionRowLive(props: RowProps) {
  return <SectionRowView {...props} pathname={usePathname()} />;
}

/** Instant feedback while a tapped section loads. */
function PendingMark() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`absolute inset-0 -z-10 rounded-t ${pending ? "bg-white/20" : ""}`} />;
}

function SectionRowView({ pathname, openSection, setOpenSection }: RowProps & { pathname: string }) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The tab tapped on this page: highlighted at once, forgotten when the page changes.
  const [tapped, setTapped] = useState<{ slug: string; on: string } | null>(null);
  const menu = useMenu(openSection);

  const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const openSoon = useCallback(
    (slug: string) => {
      if (!canHover()) return;
      clearTimeout(closeTimer.current);
      clearTimeout(openTimer.current);
      // Load the headlines straight away; open after a short pause so passing the mouse over does not flash panels.
      loadMenu(slug);
      openTimer.current = setTimeout(() => setOpenSection(slug), openSection ? 0 : 160);
    },
    [openSection, setOpenSection],
  );
  const closeSoon = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSection(null), 220);
  };

  const current = sections.find((s) => s.slug === openSection);

  return (
    <div
      onMouseLeave={closeSoon}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      // Following any link in the row or panel closes the panel.
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) setOpenSection(null);
      }}
      className="relative"
    >
      <nav aria-label="Sections" className="mx-auto max-w-6xl">
        <ul className="relative flex overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => {
            const href = `/${s.slug}`;
            const active = isActive(pathname, href) || (tapped?.slug === s.slug && tapped.on === pathname);
            const open = openSection === s.slug;
            return (
              <li key={s.slug} className="flex shrink-0 items-stretch" onMouseEnter={() => openSoon(s.slug)}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  onClick={() => setTapped({ slug: s.slug, on: pathname })}
                  className={`relative isolate border-b-[3px] px-3 py-2.5 text-sm font-semibold transition-colors active:bg-white/20 ${
                    active ? "border-accent bg-white/10 text-accent" : open ? "border-white/40 text-white" : "border-transparent text-white/90 hover:text-white"
                  }`}
                >
                  {s.name}
                  <PendingMark />
                </Link>
                {/* Keyboard and screen-reader access to the headlines (computers only). */}
                <button
                  type="button"
                  onClick={() => {
                    loadMenu(s.slug);
                    setOpenSection(open ? null : s.slug);
                  }}
                  aria-expanded={open}
                  aria-controls="section-panel"
                  aria-label={`${s.name} headlines`}
                  className="sr-only text-white focus-visible:not-sr-only focus-visible:flex focus-visible:w-5 focus-visible:items-center focus-visible:justify-center"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden className={open ? "rotate-180" : ""}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {current && (
        <div id="section-panel" role="region" aria-label={`${current.name} headlines`} className="absolute inset-x-0 top-full border-t-[3px] border-accent bg-surface text-ink shadow-xl">
          <SectionPanel name={current.name} slug={current.slug} menu={menu} />
        </div>
      )}
    </div>
  );
}

function SectionPanel({ name, slug, menu }: { name: string; slug: string; menu: SectionMenu | null | undefined }) {
  if (menu === undefined) {
    return <p className="mx-auto max-w-6xl px-6 py-8 text-slate">Loading {name} headlines…</p>;
  }
  if (menu === null || (!menu.lead && menu.latest.length === 0)) {
    return (
      <p className="mx-auto max-w-6xl px-6 py-8 text-slate">
        No {name} stories yet. <Link href={`/${slug}`} className="font-semibold text-lake-ink underline">Open {name}</Link>
      </p>
    );
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-5 md:grid-cols-[1.3fr_1fr_1fr]">
      {menu.lead && (
        <Link href={menu.lead.path} className="group block">
          {menu.lead.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={menu.lead.photo.src} alt={menu.lead.photo.alt} loading="lazy" className="mb-2 aspect-video w-full rounded object-cover" />
          )}
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lake-ink">{menu.lead.pinned ? "Editor's pick" : "Latest"}</p>
          <p className="mt-1 font-serif text-lg font-bold leading-snug group-hover:underline">{menu.lead.headline}</p>
        </Link>
      )}
      <PanelList title="Latest" items={menu.latest} />
      <div>
        <PanelList title="Most read" items={menu.mostRead} />
        <Link href={`/${slug}`} className="mt-3 inline-block text-sm font-semibold text-lake-ink hover:underline">
          All {name} →
        </Link>
      </div>
    </div>
  );
}

function PanelList({ title, items }: { title: string; items: { headline: string; path: string }[] }) {
  if (items.length === 0) return <div />;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate">{title}</p>
      <ul className="mt-1 divide-y divide-mist">
        {items.map((i) => (
          <li key={i.path}>
            <Link href={i.path} className="block py-2 font-serif font-semibold leading-snug hover:underline">
              {i.headline}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The ☰ menu: every page of the site; sections expand to show their top stories.

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [open]);
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        id="site-menu"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col bg-surface shadow-xl transition-transform duration-200 motion-reduce:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 bg-brand text-white">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="font-serif text-lg font-bold tracking-wide">BX News</span>
            <button type="button" onClick={onClose} aria-label="Close menu" tabIndex={open ? 0 : -1} className="rounded p-2 hover:bg-white/10">
              <Icon name="close" />
            </button>
          </div>
          <div className="h-[3px] bg-accent" aria-hidden />
        </div>
        <div className="overflow-y-auto">
          <Suspense fallback={<DrawerNav pathname="" onNavigate={onClose} focusable={open} />}>
            <DrawerNavLive onNavigate={onClose} focusable={open} />
          </Suspense>
        </div>
      </aside>
    </div>
  );
}

function DrawerNavLive(props: { onNavigate: () => void; focusable: boolean }) {
  return <DrawerNav {...props} pathname={usePathname()} />;
}

function DrawerNav({ pathname, onNavigate, focusable }: { pathname: string; onNavigate: () => void; focusable: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const menu = useMenu(expanded);
  const tab = focusable ? 0 : -1;
  return (
    <nav aria-label="Main" className="py-3">
      {navGroups.map((group, i) => (
        <div key={group.title} className={i > 0 ? "mt-2 border-t border-mist pt-2" : ""}>
          {i > 0 && <p className="px-5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">{group.title}</p>}
          <ul>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const slug = group.title === "Sections" ? item.href.slice(1) : null;
              const isOpen = slug !== null && expanded === slug;
              return (
                <li key={item.href}>
                  <div className="mx-2 flex items-center">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      tabIndex={tab}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors hover:bg-mist active:bg-accent/30 ${
                        active ? "bg-mist text-lake-ink" : "text-ink"
                      }`}
                    >
                      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded bg-accent" aria-hidden />}
                      <Icon name={item.icon} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                    {slug && (
                      <button
                        type="button"
                        tabIndex={tab}
                        onClick={() => setExpanded(isOpen ? null : slug)}
                        aria-expanded={isOpen}
                        aria-label={`${item.name} top stories`}
                        className="rounded-md p-2 text-slate hover:bg-mist hover:text-ink"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={isOpen ? "rotate-180" : ""}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mx-4 mb-2 border-l-[3px] border-accent pl-3">
                      {menu === undefined ? (
                        <p className="py-2 text-sm text-slate">Loading…</p>
                      ) : (
                        <ul>
                          {[...(menu?.lead ? [menu.lead] : []), ...(menu?.latest ?? []).slice(0, 2), ...(menu?.mostRead ?? []).slice(0, 1)].map((s) => (
                            <li key={s.path}>
                              <Link href={s.path} onClick={onNavigate} tabIndex={tab} className="block py-1.5 font-serif text-[15px] font-semibold leading-snug text-ink hover:underline">
                                {s.headline}
                              </Link>
                            </li>
                          ))}
                          {!menu?.lead && <li className="py-1.5 text-sm text-slate">No stories yet.</li>}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
