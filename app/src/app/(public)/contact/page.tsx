import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { ReaderForm } from "@/components/reader-form";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact BX News: questions, complaints, corrections and partnerships.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InfoPage kicker="Contact" title="Contact BX News" intro="Questions, complaints, requests for a correction, or ideas: write to us here.">
      <ul>
        <li>Have a story for us? Use the <Link href="/contact/tip">news tip form</Link> instead. It lets you stay anonymous.</li>
        <li>Want to advertise? See <Link href="/advertise">Advertise with BX News</Link>.</li>
        <li>Spotted a mistake in a story? Tell us below and include the story&apos;s link. We publish every correction on our <Link href="/corrections">Corrections</Link> page.</li>
      </ul>
      <h2>Send a message</h2>
      <ReaderForm kind="contact" />
      <p className="text-sm text-slate">
        We use your details only to reply to you. See our <Link href="/privacy">privacy policy</Link>. For news updates, follow our{" "}
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>.
      </p>
    </InfoPage>
  );
}
