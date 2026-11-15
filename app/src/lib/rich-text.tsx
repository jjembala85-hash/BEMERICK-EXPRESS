// Story bodies are stored as Tiptap JSON. This renders them to React on the
// server using an allow-list: anything not listed here is dropped, and no raw
// HTML is ever injected.
import type { ReactNode } from "react";

export type RichNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};

const SAFE_LINK = /^(https?:\/\/|mailto:|\/)/i;

/** Accepts the editor's JSON string; returns a document or null if invalid. */
export function parseBody(raw: string): RichNode | null {
  try {
    const doc = JSON.parse(raw) as RichNode;
    if (doc?.type !== "doc" || !Array.isArray(doc.content)) return null;
    if (raw.length > 400_000) return null;
    return doc;
  } catch {
    return null;
  }
}

/** Plain text of a document, for word counts and descriptions. */
export function bodyText(node: RichNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(bodyText).join(node.type === "doc" ? "\n" : "");
}

function renderText(node: RichNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      if (SAFE_LINK.test(href)) {
        const external = /^https?:/i.test(href);
        out = (
          <a
            href={href}
            className="text-lake-ink underline underline-offset-2"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {out}
          </a>
        );
      }
    }
  }
  return <span key={key}>{out}</span>;
}

function renderNode(node: RichNode, key: number): ReactNode {
  const children = (node.content ?? []).map(renderNode);
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key} className="mb-5">{children}</p>;
    case "heading": {
      const level = Number(node.attrs?.level) === 3 ? 3 : 2;
      return level === 2 ? (
        <h2 key={key} className="mb-3 mt-9 font-serif text-2xl font-bold leading-snug">{children}</h2>
      ) : (
        <h3 key={key} className="mb-2 mt-7 font-serif text-xl font-bold leading-snug">{children}</h3>
      );
    }
    case "blockquote":
      return (
        <blockquote key={key} className="my-7 border-l-4 border-crane-gold pl-5 text-[1.15em] italic [&>p:last-child]:mb-0">
          {children}
        </blockquote>
      );
    case "bulletList":
      return <ul key={key} className="mb-5 list-disc pl-6 [&_p]:mb-1">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="mb-5 list-decimal pl-6 [&_p]:mb-1">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} className="my-8 border-mist" />;
    default:
      return null;
  }
}

export function RichText({ doc }: { doc: unknown }) {
  const root = doc as RichNode | null;
  if (!root || root.type !== "doc") return null;
  return <>{(root.content ?? []).map(renderNode)}</>;
}
