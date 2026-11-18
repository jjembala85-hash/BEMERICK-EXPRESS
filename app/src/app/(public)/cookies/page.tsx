import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Cookies",
  description: "BX News does not use tracking cookies.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <InfoPage kicker="Policies" title="Cookies" updated="18 November 2026" draftPolicy intro="Readers get no tracking or advertising cookies from BX News, so there is no cookie banner.">
      <h2>Readers</h2>
      <ul>
        <li><strong>No cookies</strong> are set when you read BX News.</li>
        <li>Your browser&apos;s local storage remembers two small settings on your device: whether you collapsed the menu, and which breaking-news banners you closed. You can clear them in your browser settings at any time.</li>
        <li>If you tap play on a video, YouTube may set its own cookies for that video (privacy-enhanced mode).</li>
      </ul>
      <h2>BX News staff</h2>
      <p>Staff who sign in to the newsroom receive essential cookies that keep them signed in, and optionally one that remembers a trusted device for 30 days. These are needed for security and are not used for tracking.</p>
      <h2>If this changes</h2>
      <p>If we add analytics or advertising that uses cookies, we will ask for your consent first and update this page. See also our <Link href="/privacy">privacy policy</Link>.</p>
    </InfoPage>
  );
}
