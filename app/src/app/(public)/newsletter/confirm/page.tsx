import type { Metadata } from "next";
import { Suspense } from "react";
import { InfoPage } from "@/components/info-page";
import { LinkAction } from "@/components/newsletter-form";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false, follow: false } };

export default function Page({ searchParams }: PageProps<"/newsletter/confirm">) {
  return (
    <InfoPage kicker="Newsletter" title="Confirm your subscription" intro="Tap the button to start getting the BX News morning briefing.">
      <Suspense fallback={null}>
        <Action searchParams={searchParams} />
      </Suspense>
    </InfoPage>
  );
}

async function Action({ searchParams }: { searchParams: PageProps<"/newsletter/confirm">["searchParams"] }) {
  const { id, t } = await searchParams;
  if (typeof id !== "string" || typeof t !== "string") return <p>This link is incomplete. Open it again from your email.</p>;
  return <LinkAction kind="confirm" id={id} token={t} />;
}
