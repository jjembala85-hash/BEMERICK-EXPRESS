import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "The standards BX News journalists follow: accuracy, fairness, corrections, labels and independence.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <InfoPage kicker="Policies" title="Editorial policy" updated="18 November 2026" draftPolicy>
      <p>These are the standards every BX News story must meet. They apply to everything we publish: on this site, on our WhatsApp Channel and on social media.</p>
      <h2>Accuracy</h2>
      <ul>
        <li>Facts are checked before publication. Where we cannot confirm something, we say so, or we do not publish it.</li>
        <li>We name our sources wherever possible. We use anonymous sources only when there is no other way to get important information, and an editor must know who they are.</li>
        <li>Every story is reviewed by an editor before readers see it.</li>
      </ul>
      <h2>Fairness and right of reply</h2>
      <p>When a story makes an allegation against a person or organisation, we contact them before publishing and include their response, or say that they did not respond.</p>
      <h2>Protecting people</h2>
      <ul>
        <li>We do not identify children in sensitive stories, or victims of sexual offences.</li>
        <li>We follow court-reporting restrictions.</li>
        <li>We protect our sources. See how on our <Link href="/contact/tip">news tip</Link> page.</li>
        <li>Stories that may raise legal issues are held for legal review before publication.</li>
      </ul>
      <h2>Photos and video</h2>
      <p>Every photo carries a credit, and we only use images we have the right to publish. Live streams and video bulletins are hosted on YouTube.</p>
      <h2>Labels</h2>
      <ul>
        <li><strong>News</strong> reports what happened. <strong>Analysis</strong> explains it. <strong>Opinion</strong> is a writer&apos;s view and is always labelled.</li>
        <li><strong>Sponsored</strong> content is paid for, always labelled, and never written by our newsroom.</li>
      </ul>
      <h2>Corrections</h2>
      <p>When we make a mistake we correct the story, add a dated note under it explaining what changed, and list it on our <Link href="/corrections">Corrections</Link> page. We keep a record of every published version of a story. To report an error, <Link href="/contact">contact us</Link> with the link to the story.</p>
      <h2>Independence</h2>
      <p>Advertisers, sponsors and owners do not decide what we report. Journalists must tell an editor about any personal interest in a story they cover.</p>
      <h2>Bylines</h2>
      <p>Every story carries the name of its writer. Journalists may choose not to have a public author page if being identified could put them at risk.</p>
    </InfoPage>
  );
}
