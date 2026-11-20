// Email newsletter (D-044): double opt-in, only the email address is kept, and
// every email has a one-click unsubscribe. Sent through Resend's HTTP API
// (free plan: 100 emails a day, 3,000 a month) once the domain is verified.
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl, PUBLISHER_NAME, SITE_NAME } from "@/lib/site";

/** Lower-cased and trimmed; null when it does not look like an email address. */
export function normaliseEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return null;
  if (email.includes("..")) return null;
  return email;
}

type TokenPurpose = "confirm" | "unsubscribe";

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

/** A signature for a link in an email, so only the person who got the email can use it. */
export function linkToken(purpose: TokenPurpose, subscriberId: string, key = secret()) {
  return createHmac("sha256", key).update(`newsletter|${purpose}|${subscriberId}`).digest("base64url").slice(0, 32);
}

export function checkToken(purpose: TokenPurpose, subscriberId: string, token: string, key = secret()) {
  const expected = Buffer.from(linkToken(purpose, subscriberId, key));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function confirmUrl(id: string) {
  return `${siteUrl()}/newsletter/confirm?id=${id}&t=${linkToken("confirm", id)}`;
}

export function unsubscribeUrl(id: string) {
  return `${siteUrl()}/newsletter/unsubscribe?id=${id}&t=${linkToken("unsubscribe", id)}`;
}

/** Ready to send when Resend's key and the sender address are set. */
export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM);
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type EmailStory = { headline: string; standfirst: string | null; section: string; path: string };
export type Email = { subject: string; html: string; text: string };

const shell = (inner: string, footer: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1d2a2c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px">
<tr><td style="background:#0f3d3e;padding:18px 24px;border-radius:8px 8px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px">${escape(SITE_NAME)}</td></tr>
<tr><td style="padding:24px">${inner}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e3e0d8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5b6b6d">${footer}</td></tr>
</table></td></tr></table></body></html>`;

/** The "please confirm" email sent after someone signs up. */
export function confirmEmail(id: string): Email {
  const url = confirmUrl(id);
  return {
    subject: `Confirm your ${PUBLISHER_NAME} newsletter`,
    html: shell(
      `<h1 style="margin:0 0 12px;font-size:24px">One more step</h1>
<p style="font-size:17px;line-height:1.6;margin:0 0 20px">Tap the button to start getting the ${escape(PUBLISHER_NAME)} morning briefing: the stories that matter in Uganda, in a few minutes.</p>
<p style="margin:0 0 20px"><a href="${escape(url)}" style="display:inline-block;background:#0f3d3e;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:bold;padding:12px 22px;border-radius:6px">Confirm my subscription</a></p>
<p style="font-size:14px;line-height:1.5;color:#5b6b6d;margin:0">If you did not sign up, ignore this email: you will not hear from us again.</p>`,
      `${escape(SITE_NAME)} · Kampala, Uganda`,
    ),
    text: `Confirm your ${PUBLISHER_NAME} newsletter\n\nOpen this link to start getting the morning briefing:\n${url}\n\nIf you did not sign up, ignore this email: you will not hear from us again.`,
  };
}

/** One newsletter edition, personalised only by its unsubscribe link. */
export function issueEmail(issue: { subject: string; intro: string | null; stories: EmailStory[] }, subscriberId: string | null): Email {
  const site = siteUrl();
  const unsubscribe = subscriberId ? unsubscribeUrl(subscriberId) : `${site}/newsletter`;
  const intro = issue.intro?.trim() ?? "";
  const storiesHtml = issue.stories
    .map(
      (s, i) => `<tr><td style="padding:${i === 0 ? "0" : "18px"} 0 18px;border-bottom:1px solid #e3e0d8">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#b8862b">${escape(s.section)}</p>
<a href="${escape(site + s.path)}" style="color:#1d2a2c;text-decoration:none;font-size:${i === 0 ? "24px" : "19px"};font-weight:bold;line-height:1.3">${escape(s.headline)}</a>
${s.standfirst ? `<p style="margin:6px 0 0;font-size:16px;line-height:1.5;color:#4a5a5c">${escape(s.standfirst)}</p>` : ""}
</td></tr>`,
    )
    .join("");
  const html = shell(
    `${intro ? `<p style="font-size:17px;line-height:1.6;margin:0 0 20px">${escape(intro).replace(/\n/g, "<br>")}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${storiesHtml}</table>
<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px"><a href="${escape(site)}" style="color:#0f3d3e;font-weight:bold">More on ${escape(PUBLISHER_NAME)} →</a></p>`,
    `You get this because you signed up for the ${escape(PUBLISHER_NAME)} newsletter. <a href="${escape(unsubscribe)}" style="color:#5b6b6d">Unsubscribe</a> in one tap.<br>${escape(SITE_NAME)} · Kampala, Uganda`,
  );
  const text = [
    issue.subject,
    "",
    ...(intro ? [intro, ""] : []),
    ...issue.stories.flatMap((s) => [`${s.section.toUpperCase()}: ${s.headline}`, ...(s.standfirst ? [s.standfirst] : []), site + s.path, ""]),
    `Unsubscribe: ${unsubscribe}`,
  ].join("\n");
  return { subject: issue.subject, html, text };
}

type Outgoing = Email & { to: string; unsubscribe?: string };

/**
 * Sends up to 100 emails per call through Resend's batch API. Returns how many
 * were accepted; throws with Resend's message when a call fails.
 */
export async function sendEmails(emails: Outgoing[]) {
  if (!mailConfigured()) throw new Error("Email sending is not set up yet (RESEND_API_KEY and NEWSLETTER_FROM).");
  let accepted = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((e) => ({
      from: process.env.NEWSLETTER_FROM,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      ...(e.unsubscribe ? { headers: { "List-Unsubscribe": `<${e.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }));
    // RESEND_API_BASE exists only so the browser tests can use a fake email service.
    const res = await fetch(`${process.env.RESEND_API_BASE ?? "https://api.resend.com"}/emails/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw Object.assign(new Error(detail?.message ?? `Email service answered ${res.status}`), { accepted });
    }
    accepted += batch.length;
  }
  return accepted;
}

/** The one-click unsubscribe address for List-Unsubscribe-Post (RFC 8058). */
export function oneClickUrl(id: string) {
  return `${siteUrl()}/api/newsletter/unsubscribe?id=${id}&t=${linkToken("unsubscribe", id)}`;
}
