// TipTap-based rich text editor used by the email template
// builder for Heading + Paragraph block bodies.
//
// Why TipTap (vs textarea + markdown shortcuts):
//   - True WYSIWYG — bold / italic / link visible while typing
//   - Cursor-precise insertion of variable chips ({{name}})
//   - Headless ProseMirror underneath: TS-friendly, small (~70KB),
//     output is easy to post-process
//
// Output is HTML; the email template renderer runs the
// caller-supplied HTML through its email-safe sanitizer
// (whitelist tags + attrs) before persisting AND again at
// render time defensively.

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Underline as UnderlineIcon, Link2, Tag } from "lucide-react";

import { Button } from "./ui";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Variables the operator can insert via the toolbar. Each
   *  becomes a chip-styled menu item; click inserts
   *  `{{key}}` at the cursor. */
  variables?: ReadonlyArray<{ key: string; label: string }>;
  /** Optional placeholder copy when value is empty. */
  placeholder?: string;
  /** Limit height + show scrollbar above this in px. */
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  variables = DEFAULT_VARIABLES,
  placeholder,
  minHeight = 120,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Drop the heading + bullet + list features — we only
        // want inline formatting inside this editor (block-
        // level structure comes from the surrounding block
        // type).
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        defaultProtocol: "https",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none text-text-primary",
        style: `min-height:${minHeight}px;padding:8px 12px;`,
      },
    },
  });

  // Keep the editor in sync when an external `value` change
  // arrives (e.g. switching between blocks). Compare current
  // doc HTML to incoming string to avoid re-setting on every
  // keystroke.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    // Suppressing onUpdate here is intentional — caller-driven
    // resets shouldn't bounce back to the parent.
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="rounded border bg-panel"
        style={{ minHeight }}
        aria-busy="true"
      />
    );
  }

  function toggleLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (vacío = quitar):", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().unsetLink().run();
    } else {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  function insertVariable(key: string) {
    editor!.chain().focus().insertContent(`{{${key}}}`).run();
  }

  return (
    <div className="overflow-hidden rounded border bg-panel">
      <div className="flex flex-wrap items-center gap-1 border-b bg-panel-alt px-2 py-1">
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Subrayado / tachado"
        >
          <UnderlineIcon size={14} />
        </ToolButton>
        <ToolButton
          active={editor.isActive("link")}
          onClick={toggleLink}
          title="Enlace"
        >
          <Link2 size={14} />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-text-meta/30" />
        {variables.length > 0 && (
          <VariableMenu variables={variables} onPick={insertVariable} />
        )}
      </div>
      <EditorContent editor={editor} />
      {!editor.getText().trim() && placeholder && (
        <div
          className="pointer-events-none -mt-[var(--ph-offset)] px-3 text-xs text-text-meta"
          style={{ ["--ph-offset" as never]: `${minHeight - 16}px` }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}

function ToolButton(props: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.title}
      className={`rounded p-1 transition-colors ${
        props.active
          ? "bg-accent text-white"
          : "text-text-secondary hover:bg-panel-hover hover:text-text-primary"
      }`}
    >
      {props.children}
    </button>
  );
}

function VariableMenu(props: {
  variables: ReadonlyArray<{ key: string; label: string }>;
  onPick: (key: string) => void;
}) {
  return (
    <div className="relative">
      <details className="group">
        <summary
          className="flex cursor-pointer list-none items-center gap-1 rounded p-1 text-xs text-text-secondary hover:bg-panel-hover hover:text-text-primary"
          title="Insertar variable"
        >
          <Tag size={14} />
          <span>Variables</span>
        </summary>
        <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded border bg-panel shadow-lg">
          <ul className="py-1">
            {props.variables.map((v) => (
              <li key={v.key}>
                <Button
                  type="button"
                  variant="unstyled"
                  size="sm"
                  className="block w-full px-3 py-1 text-left text-xs hover:bg-panel-hover"
                  onClick={() => {
                    props.onPick(v.key);
                    // Close the details on click — clicking
                    // outside also closes via native semantics.
                    const det = document.activeElement?.closest("details");
                    if (det && det instanceof HTMLDetailsElement) {
                      det.open = false;
                    }
                  }}
                >
                  <span className="font-mono text-text-secondary">
                    {`{{${v.key}}}`}
                  </span>
                  <span className="ml-2 text-text-meta">{v.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

const DEFAULT_VARIABLES: ReadonlyArray<{ key: string; label: string }> = [
  { key: "recipient.name", label: "Nombre del destinatario" },
  { key: "recipient.email", label: "Email del destinatario" },
  { key: "seller.name", label: "Nombre del seller" },
  { key: "seller.email", label: "Email del seller" },
  { key: "lead.subject", label: "Asunto del lead" },
];
