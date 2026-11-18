import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data BX News collects (very little), why, how long we keep it and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage kicker="Policies" title="Privacy policy" updated="18 November 2026" draftPolicy intro="We collect as little about you as we can. You can read BX News without an account, and we do not track you.">
      <p>This policy explains what personal data BEMERICK EXPRESS (BX News) handles, why, and your rights under the Uganda Data Protection and Privacy Act, 2019.</p>
      <h2>Reading the site</h2>
      <ul>
        <li>You do not need an account, and we do not ask for your name or email to read stories.</li>
        <li>We do not use advertising or tracking cookies, and we do not sell or share data about readers.</li>
        <li>Your browser remembers a few settings on your own device (for example, whether you closed a breaking-news banner or collapsed the menu). This stays on your device and is not sent to us.</li>
        <li>Like every website, our hosting provider (Vercel) briefly records technical information such as IP addresses to deliver the site and protect it from attacks. We do not use these records to identify readers.</li>
      </ul>
      <h2>Videos</h2>
      <p>Live streams and bulletins are hosted on YouTube. Nothing is loaded from YouTube until you tap play. When you do, the video plays in YouTube&apos;s privacy-enhanced mode, and YouTube&apos;s own privacy policy applies to that video.</p>
      <h2>When you contact us or send a tip</h2>
      <ul>
        <li>We keep what you type in the form: your message, and the name and contact details if you give them. On the news tip form, name and contact are optional.</li>
        <li>We do <strong>not</strong> store your IP address or device details with your message. To stop spam, we keep a scrambled code for up to 24 hours that cannot be turned back into your address.</li>
        <li>Only BX News staff who need to (editors for tips) can read messages. We use your details only to reply to you or, for tips, to check the story.</li>
        <li>We delete messages when we no longer need them, and at the latest after 12 months.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We do not sell personal data. Our technical providers store data on our behalf: Vercel (website hosting), Neon (database, in the EU) and Cloudflare (photo storage). Links to WhatsApp, X and other services take you to those services, whose own policies apply.</p>
      <h2>Your rights</h2>
      <p>You can ask us what personal data we hold about you, ask us to correct it, or ask us to delete it. <Link href="/contact">Contact us</Link> and we will reply within 30 days. If you are not satisfied, you can complain to the Personal Data Protection Office of Uganda.</p>
      <h2>Changes</h2>
      <p>If we start collecting more (for example a newsletter or analytics), we will update this page before we do, and ask for your consent where the law requires it.</p>
    </InfoPage>
  );
}
