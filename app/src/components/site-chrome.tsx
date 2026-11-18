"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { sections } from "@/lib/sections";
import { Icon } from "@/components/icons";

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

// Remember the reader's sidebar preference on this device.
const KEY = "bx-sidebar-collapsed";
const EVENT = "bx-sidebar-change";
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function readCollapsed() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode): the toggle still works until reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

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
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand text-white">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          {/* Desktop: collapse/expand sidebar */}
          <button
            type="button"
            onClick={() => writeCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            className="hidden rounded p-2 hover:bg-white/10 lg:block"
          >
            <Icon name="menu" size={22} />
          </button>
          {/* Mobile: open drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="rounded p-2 hover:bg-white/10 lg:hidden"
          >
            <Icon name="menu" size={22} />
          </button>

          <Link href="/" onClick={closeDrawer} className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
            <span className="font-serif text-lg font-bold tracking-wide sm:text-xl">
              BEMERICK EXPRESS
            </span>
          </Link>

          <span className="ml-auto">{livePill}</span>
          <Link
            href="/search"
            aria-label="Search"
            className="rounded p-2 hover:bg-white/10"
          >
            <Icon name="search" />
          </Link>
        </div>

        {/* Mobile swipe strip */}
        <SectionStrip />
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={`sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] border-r border-mist bg-surface transition-[width] duration-200 motion-reduce:transition-none lg:block ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          <SidebarNav collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {banner}
          {/* At least a screen tall, so the footer never starts in view and jumps when streamed content arrives (CLS budget < 0.1). */}
          <main className="min-h-dvh flex-1">{children}</main>
          {footer}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 motion-reduce:transition-none ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between bg-brand px-4 text-white">
            <span className="font-serif text-lg font-bold tracking-wide">BX News</span>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              tabIndex={drawerOpen ? 0 : -1}
              className="rounded p-2 hover:bg-white/10"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="overflow-y-auto">
            <SidebarNav
              collapsed={false}
              onNavigate={closeDrawer}
              focusable={drawerOpen}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarNavView({
  pathname,
  collapsed,
  onNavigate,
  focusable = true,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  focusable?: boolean;
}) {
  return (
    <nav aria-label="Main" className="py-3">
      {navGroups.map((group, i) => (
        <div key={group.title} className={i > 0 ? "mt-2 border-t border-mist pt-2" : ""}>
          {!collapsed && i > 0 && (
            <p className="px-5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
              {group.title}
            </p>
          )}
          <ul>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    tabIndex={focusable ? 0 : -1}
                    title={collapsed ? item.name : undefined}
                    aria-label={collapsed ? item.name : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`relative mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors hover:bg-mist ${
                      active ? "bg-mist text-lake-ink" : "text-ink"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded bg-crane-gold" aria-hidden />
                    )}
                    <Icon name={item.icon} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// usePathname() is only known at request time for story pages, so everything
// that highlights the current page sits behind Suspense: the menu renders
// immediately without a highlight, then the highlight streams in.
type SidebarProps = { collapsed: boolean; onNavigate?: () => void; focusable?: boolean };

function SidebarNav(props: SidebarProps) {
  return (
    <Suspense fallback={<SidebarNavView {...props} pathname="" />}>
      <SidebarNavLive {...props} />
    </Suspense>
  );
}

function SidebarNavLive(props: SidebarProps) {
  return <SidebarNavView {...props} pathname={usePathname()} />;
}

function SectionStrip() {
  return (
    <Suspense fallback={<SectionStripView pathname="" />}>
      <SectionStripLive />
    </Suspense>
  );
}

function SectionStripLive() {
  return <SectionStripView pathname={usePathname()} />;
}

function SectionStripView({ pathname }: { pathname: string }) {
  return (
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
  );
}