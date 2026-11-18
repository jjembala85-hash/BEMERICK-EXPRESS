// Rules for the reader forms (contact, news tip, advertising). Pure: tested in reader-forms.test.ts.

export const MESSAGE_KINDS = ["contact", "tip", "advertise"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MAX_PER_HOUR = 5;
/** Faster than this and it is almost certainly a bot filling the form. */
export const MIN_FILL_MS = 3000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9 ()-]{6,19}$/;

export type MessageInput = {
  kind: MessageKind;
  name: string | null;
  replyTo: string | null;
  subject: string | null;
  body: string;
};

/** Checks a submitted form. Returns the cleaned message or an error to show. */
export function readMessage(form: {
  kind: string;
  name?: string;
  replyTo?: string;
  subject?: string;
  body?: string;
  website?: string; // hidden trap field: people never fill it
  startedAt?: string;
  now?: number;
}): { message: MessageInput } | { error: string; spam?: true } {
  if (!(MESSAGE_KINDS as readonly string[]).includes(form.kind)) return { error: "Unknown form." };
  const kind = form.kind as MessageKind;
  if (form.website) return { error: "Your message could not be sent.", spam: true };
  const started = Number(form.startedAt);
  if (!Number.isFinite(started) || (form.now ?? Date.now()) - started < MIN_FILL_MS) {
    return { error: "Your message could not be sent. Wait a moment and try again.", spam: true };
  }

  const tidy = (v: string | undefined, max: number) => (v ?? "").trim().replace(/[ \t]+/g, " ").slice(0, max + 1);
  const name = tidy(form.name, 80);
  const replyTo = tidy(form.replyTo, 120);
  const subject = tidy(form.subject, 120);
  const body = (form.body ?? "").trim().replace(/\r\n/g, "\n");

  if (name.length > 80) return { error: "The name is too long." };
  if (subject.length > 120) return { error: "The subject is too long." };
  if (body.length < 10) return { error: kind === "tip" ? "Tell us a little more about the story." : "Write your message (at least a sentence)." };
  if (body.length > 5000) return { error: "The message is too long (5,000 characters maximum)." };
  if (replyTo && !EMAIL.test(replyTo) && !PHONE.test(replyTo)) {
    return { error: "Give an email address or a phone number we can reply to." };
  }
  // We cannot answer a question or an advertiser without a way to reply; tips may be anonymous.
  if (!replyTo && kind !== "tip") return { error: "Give an email address or a phone number so we can reply." };

  return {
    message: {
      kind,
      name: name || null,
      replyTo: replyTo || null,
      subject: subject || null,
      body,
    },
  };
}
