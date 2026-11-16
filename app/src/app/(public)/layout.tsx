import { Suspense } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { BreakingBanner } from "@/components/breaking-banner";
import { getActiveBreaking } from "@/lib/queries/public";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome
      footer={<SiteFooter />}
      banner={
        <Suspense fallback={null}>
          <Breaking />
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
