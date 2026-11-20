import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { NewsletterForm } from "@/components/newsletter-form";
import { AlertsButton } from "@/components/alerts-button";
import { readerSignupsEnabled } from "@/lib/site";

export const metadata: Metadata = {
  title: "Newsletter and alerts",
  description: "Get the BX News morning briefing by email, and breaking-news alerts on your phone.",
  alternates: { canonical: "/newsletter" },
};

export default function NewsletterPage() {
  const open = readerSignupsEnabled();
  return (
    <InfoPage kicker="Stay informed" title="Newsletter and alerts" intro="The stories that matter in Uganda, in your inbox and on your phone.">
      <h2>The morning briefing</h2>
      <p>A short email with the most important BX News stories. Free, and you can unsubscribe in one tap from any email.</p>
      {open ? <NewsletterForm /> : <p><strong>Sign-ups open soon.</strong> Follow our WhatsApp Channel in the meantime.</p>}
      <h2>Breaking-news alerts</h2>
      <p>A notification on your phone or computer when big news breaks: a few times a week at most. No app, no account, and we keep no name, email or phone number.</p>
      {open ? <AlertsButton /> : <p><strong>Alerts open soon.</strong></p>}
    </InfoPage>
  );
}
