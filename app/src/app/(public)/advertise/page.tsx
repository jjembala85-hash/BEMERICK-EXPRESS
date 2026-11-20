import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { ReaderForm } from "@/components/reader-form";
import { AD_SLOTS, type AdSlot } from "@/lib/ads";

export const metadata: Metadata = {
  title: "Advertise",
  description: "Reach readers across Uganda and the diaspora with BX News.",
  alternates: { canonical: "/advertise" },
};

export default function AdvertisePage() {
  return (
    <InfoPage kicker="Advertise" title="Advertise with BX News" intro="Reach readers in Uganda and the diaspora on a fast, trusted news site built for the phone.">
      <h2>What we offer</h2>
      <ul>
        <li><strong>Display advertising</strong> on the homepage, section pages and stories.</li>
        <li><strong>Sponsored content</strong>, written separately from our newsroom and always labelled &ldquo;Sponsored&rdquo;.</li>
        <li><strong>WhatsApp Channel and social partnerships</strong> for launches and campaigns.</li>
      </ul>
      <h2>Banner positions</h2>
      <p>One banner size works everywhere: <strong>1200 × 300 pixels</strong> (JPEG or PNG, under 2 MB). Clear text, large enough to read on a phone.</p>
      <ul>
        {(Object.keys(AD_SLOTS) as AdSlot[]).map((slot) => (
          <li key={slot}>{AD_SLOTS[slot].label}</li>
        ))}
      </ul>
      <p>
        Campaigns run by the day or week, in one place or several. Each advertiser gets a report of views and clicks per day.
        A view is counted when at least half the banner has been on screen for one second; robots are not counted.
        Ask us for current rates using the form below.
      </p>
      <h2>Our rules</h2>
      <p>
        Advertisers never influence our journalism. Sponsored content is clearly labelled and never written by our reporters.
        We do not run advertising that is misleading, illegal in Uganda, or political promotion without a clear label. See our{" "}
        <Link href="/editorial-policy">editorial policy</Link>.
      </p>
      <h2>Get in touch</h2>
      <ReaderForm kind="advertise" />
    </InfoPage>
  );
}
