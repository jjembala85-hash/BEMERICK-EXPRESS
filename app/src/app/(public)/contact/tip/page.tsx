import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { ReaderForm } from "@/components/reader-form";

export const metadata: Metadata = {
  title: "Send a news tip",
  description: "Tell BX News about a story. You can stay anonymous.",
  alternates: { canonical: "/contact/tip" },
};

export default function TipPage() {
  return (
    <InfoPage kicker="Contact" title="Send a news tip" intro="Seen something that people should know about? Tell our editors. You can stay anonymous.">
      <h2>How we protect you</h2>
      <ul>
        <li>Your name and contact are <strong>optional</strong>. Leave them blank to stay anonymous.</li>
        <li>We do <strong>not</strong> record your IP address or device with your tip.</li>
        <li>Only BX News editors can read tips. We never share them or name a source without their agreement.</li>
        <li>We check every tip before publishing anything. A tip alone is never a story.</li>
      </ul>
      <p className="text-sm text-slate">
        For the most sensitive information, use a phone or computer that is not your work device, and do not include details
        that only you could know unless you are comfortable with that.
      </p>
      <h2>Your tip</h2>
      <ReaderForm kind="tip" />
      <p className="text-sm text-slate">
        Read how we handle the information you send in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </InfoPage>
  );
}
