import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { CookieSettingsButton } from "@/components/consent-banner";
import { adsenseEnabled } from "@/lib/adsense";

// The text follows the AdSense switch (D-049), so it always describes the live site.
const ads = adsenseEnabled();

export const metadata: Metadata = {
  title: "Cookies",
  description: ads
    ? "BX News sets no cookies of its own for readers. Google's advertising cookies are used only if you agree."
    : "BX News does not use tracking cookies.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <InfoPage
      kicker="Policies"
      title="Cookies"
      updated={ads ? "26 November 2026" : "18 November 2026"}
      draftPolicy
      intro={
        ads
          ? "BX News sets no cookies of its own for readers. Advertising cookies from Google are used only if you say yes."
          : "Readers get no tracking or advertising cookies from BX News, so there is no cookie banner."
      }
    >
      <h2>Readers</h2>
      <ul>
        <li><strong>BX News itself sets no cookies</strong> when you read the site.</li>
        <li>
          Your browser&apos;s local storage remembers a few small settings on your device: whether you collapsed the menu, which
          breaking-news banners you closed{ads && ", and your answer about advertising cookies"}. They stay on your device and you
          can clear them in your browser settings at any time.
        </li>
        <li>If you tap play on a video, YouTube may set its own cookies for that video (privacy-enhanced mode).</li>
      </ul>
      {ads && (
        <>
          <h2>Advertising from Google</h2>
          <p>
            Some ad spaces are filled by Google AdSense. The first time you visit, we ask whether Google may show ads here and use
            cookies to choose and measure them. <strong>Nothing is loaded from Google until you tap Accept.</strong> If you say no,
            you can still read everything, and you will only see ads that BX News hosts itself, which use no cookies.
          </p>
          <ul>
            <li>
              If you accept, Google and its partners may use cookies to show ads based on your visits to this and other websites.
              Read <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses data from sites that use its services</a>.
            </li>
            <li>
              You can turn off personalised ads at any time in{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google&apos;s ad settings</a>.
            </li>
            <li>We ask again after 12 months.</li>
          </ul>
          <p>
            <strong>Change your answer:</strong> <CookieSettingsButton className="font-semibold text-brand underline" /> (also at the
            bottom of every page). Saying no after accepting stops Google&apos;s ads straight away; cookies Google already set stay in
            your browser until they expire or you clear them.
          </p>
        </>
      )}
      <h2>BX News staff</h2>
      <p>Staff who sign in to the newsroom receive essential cookies that keep them signed in, and optionally one that remembers a trusted device for 30 days. These are needed for security and are not used for tracking.</p>
      <h2>If this changes</h2>
      <p>If we add analytics or other services that use cookies, we will ask for your consent first and update this page. See also our <Link href="/privacy">privacy policy</Link>.</p>
    </InfoPage>
  );
}
