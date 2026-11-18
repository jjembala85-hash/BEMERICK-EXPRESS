import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { ReaderForm } from "@/components/reader-form";

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
