"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({ name, initial }: { name: string; initial: unknown }) {
  const start: JSONContent =
    initial && typeof initial === "object" && "type" in initial ? (initial as JSONContent) : EMPTY_DOC;
  const [json, setJson] = useState(() => JSON.stringify(start));
  const [words, setWords] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
    ],
    content: start,
    editorProps: {
      attributes: {
        class:
          "bx-editor min-h-[22rem] px-4 py-3 font-serif text-lg leading-relaxed text-ink outline-none",
      },
    },
    onCreate: ({ editor }) => setWords(countWords(editor.getText())),
    onUpdate: ({ editor }) => {
      setJson(JSON.stringify(editor.getJSON()));
      setWords(countWords(editor.getText()));
    },
  });

  return (
    <div className="rounded-md border border-mist bg-surface focus-within:border-lake-ink">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="border-t border-mist px-4 py-1.5 text-right text-xs text-slate">{words} words</div>
      <input type="hidden" name={name} value={json} />
    </div>
  );
}

function countWords(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-11 border-b border-mist" />;

  const setLink = () => {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link address (leave empty to remove the link)", previous || "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }
  };

  const buttons: { label: string; title: string; active?: boolean; run: () => void; className?: string }[] = [
    { label: "B", title: "Bold", className: "font-bold", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "I", title: "Italic", className: "italic", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "H2", title: "Heading", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Sub-heading", active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "❝", title: "Quote", active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "• List", title: "Bullet list", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1. List", title: "Numbered list", active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Link", title: "Add or remove a link", active: editor.isActive("link"), run: setLink },
    { label: "↶", title: "Undo", run: () => editor.chain().focus().undo().run() },
    { label: "↷", title: "Redo", run: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-mist px-2 py-1.5">
      {buttons.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.active}
          onClick={b.run}
          className={`min-w-9 rounded px-2 py-1.5 text-sm font-semibold hover:bg-mist ${b.className ?? ""} ${
            b.active ? "bg-mist text-lake-ink" : "text-ink"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
