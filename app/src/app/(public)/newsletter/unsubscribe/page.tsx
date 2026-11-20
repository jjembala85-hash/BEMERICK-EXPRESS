import type { Metadata } from "next";
import { Suspense } from "react";
import { InfoPage } from "@/components/info-page";
import { LinkAction } from "@/components/newsletter-form";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function Page({ searchParams }: PageProps<"/newsletter/unsubscribe">) {
  return (
    <InfoPage kicker="Newsletter" title="Unsubscribe" intro="Tap the button to stop getting BX News newsletters.">
      <Suspense fallback={null}>
        <Action searchParams={searchParams} />
      </Suspense>
    </InfoPage>
  );
}

async function Action({ searchParams }: { searchParams: PageProps<"/newsletter/unsubscribe">["searchParams"] }) {
  const { id, t } = await searchParams;
  if (typeof id !== "string" || typeof t !== "string") return <p>This link is incomplete. Open it again from your email.</p>;
  return <LinkAction kind="unsubscribe" id={id} token={t} />;
}
