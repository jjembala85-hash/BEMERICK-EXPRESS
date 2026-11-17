import { Suspense } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { BreakingBanner } from "@/components/breaking-banner";
import Link from "next/link";
import { getActiveBreaking, getLiveState } from "@/lib/queries/public";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome
      footer={<SiteFooter />}
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
  if (!onAir) return null;
  return (
    <Link
      href="/live"
      className="flex items-center gap-1.5 rounded bg-[#c8401f] px-2 py-1 text-xs font-bold tracking-wider text-white hover:opacity-90"
      aria-label={`Live now: ${onAir.title}`}
    >
      <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden />
      LIVE
    </Link>
  );
}
