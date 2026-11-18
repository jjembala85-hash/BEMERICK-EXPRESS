import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About BX News",
  description: "BEMERICK EXPRESS (BX News) is an independent, mobile-first news site from Uganda: fast, verified and easy to read on any phone.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InfoPage kicker="About BX" title="News. Insight. Impact." intro="BEMERICK EXPRESS (BX News) is an independent, mobile-first news site from Uganda.">
      <p>
        We report what is happening in Uganda and the region, and explain why it matters, in clear English that loads fast on
        any phone, even on a weak connection. Every story is written for the people it affects: in Kampala, in the districts and
        in the diaspora.
      </p>
      <h2>What we promise</h2>
      <ul>
        <li><strong>Verified first.</strong> We would rather be right than first. Facts are checked before a story is published.</li>
        <li><strong>Fair.</strong> When a story accuses someone, we ask them for their side before we publish.</li>
        <li><strong>Clearly labelled.</strong> News, analysis, opinion and any sponsored content are always marked as such.</li>
        <li><strong>Open about mistakes.</strong> When we get something wrong we correct it, say so under the story and list it on our <Link href="/corrections">Corrections</Link> page.</li>
        <li><strong>Light on your data.</strong> No sign-up, no pop-ups. Videos load only when you tap play.</li>
      </ul>
      <h2>How we work</h2>
      <p>
        Every story goes through an editor before readers see it, and every story carries the name of the journalist who wrote
        it. Our <Link href="/editorial-policy">editorial policy</Link> explains our standards in full.
      </p>
      <h2>Who we are</h2>
      <p>
        Meet the people behind BX News on <Link href="/about/team">Our team</Link>.
      </p>
      <h2>Get in touch</h2>
      <ul>
        <li>Seen something we should report? <Link href="/contact/tip">Send us a news tip</Link>. You can stay anonymous.</li>
        <li>Questions or complaints: <Link href="/contact">contact us</Link>.</li>
        <li>Businesses: <Link href="/advertise">advertise with BX News</Link>.</li>
        <li>Get the news on your phone: <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">follow our WhatsApp Channel</a>.</li>
      </ul>
    </InfoPage>
  );
}
