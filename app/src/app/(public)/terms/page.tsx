import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using the BX News website and its content.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage kicker="Policies" title="Terms of use" updated="18 November 2026" draftPolicy>
      <p>By using the BEMERICK EXPRESS (BX News) website you agree to these terms.</p>
      <h2>Our content</h2>
      <ul>
        <li>Stories, photos, graphics and videos on BX News are protected by copyright and belong to BX News or the people credited.</li>
        <li>You are welcome to <strong>share links</strong> to our stories and to quote short extracts with a clear credit and a link back to the story.</li>
        <li>Do not copy whole stories or photos, or republish them, without our written permission. <Link href="/contact">Contact us</Link> to ask.</li>
      </ul>
      <h2>Accuracy</h2>
      <p>We work hard to be accurate and we correct mistakes openly (see our <Link href="/editorial-policy">editorial policy</Link>). News changes quickly, so stories reflect what was known when they were published or last updated.</p>
      <h2>Opinion and sponsored content</h2>
      <p>Opinion pieces are the views of their writers, not of BX News. Sponsored content is labelled and is the responsibility of the sponsor.</p>
      <h2>Links and embedded video</h2>
      <p>We link to other websites and embed videos from YouTube. We are not responsible for the content or policies of other services.</p>
      <h2>Using the site</h2>
      <p>Do not try to break, overload or gain unauthorised access to the site or the newsroom, and do not send unlawful, abusive or misleading messages through our forms.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of Uganda. We may update them; the date at the top shows the latest version.</p>
    </InfoPage>
  );
}
