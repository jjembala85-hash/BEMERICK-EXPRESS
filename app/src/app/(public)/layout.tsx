import { Suspense } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { BreakingBanner } from "@/components/breaking-banner";
import Link from "next/link";
import { ConsentBanner } from "@/components/consent-banner";
import { adsenseEnabled } from "@/lib/adsense";
import { getActiveBreaking, getLiveState } from "@/lib/queries/public";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome
      footer={
        <>
          <SiteFooter />
          {adsenseEnabled() && <ConsentBanner />}
        </>
      }
      banner={
        <Suspense fallback={null}>
          <Breaking />
        </Suspense>
      }
      livePill={
        <Suspense fallback={null}>
          <LivePill />
        </Suspense>
      }
    >
      {children}
    </SiteChrome>
  );
}

async function Breaking() {
  const alert = await getActiveBreaking();
  return alert ? <BreakingBanner id={alert.id} text={alert.text} href={alert.href} /> : null;
}

async function LivePill() {
  const { onAir } = await getLiveState();
  if (onAir.length === 0) return null;
  const label = onAir.length === 1 ? `Live now: ${onAir[0].title}` : `${onAir.length} streams live now`;
  return (
    <Link
      href="/live"
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-[#c8401f] px-2 py-1 text-xs font-bold tracking-wider text-white hover:opacity-90"
      aria-label={label}
    >
      <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden />
      LIVE
      {onAir.length > 1 && (
        <span aria-hidden className="rounded-sm bg-white px-1 text-[#c8401f]">{onAir.length}</span>
      )}
    </Link>
  );
}
