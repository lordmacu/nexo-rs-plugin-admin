// Manage the operator's label catalogue: create, rename, recolour,
// delete. Used both standalone (sidebar header →"Etiquetas") and
// from the chat-row label picker via the"Crear nueva"link.

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { LABEL_PALETTE, useLabels, type Label } from "../../store/labels";
import { Button, Input } from "../../components/ui";
import { useT } from "../../i18n";

interface Props {
  open: boolean;
  on_close: () => void;
}

export default function LabelManagerModal({ open, on_close }: Props) {
  const t = useT();
  // Subscribe to the Map directly (stable reference until the
  // store mutates it). Spread inside the render — never inside the
  // selector — otherwise the selector returns a new array on every
  // `getSnapshot()` call and React detects a"change"that drives
  // an infinite re-render loop. Same caveat applies anywhere else
  // we read from a Zustand store with a derived selector.
  const labels_map = useLabels((s) => s.labels);
  const labels = [...labels_map.values()];
  const create_label = useLabels((s) => s.create_label);
  const update_label = useLabels((s) => s.update_label);
  const delete_label = useLabels((s) => s.delete_label);

  const [draft_name, set_draft_name] = useState("");
  const [draft_color, set_draft_color] = useState(LABEL_PALETTE[0]);

  if (!open) return null;

  function commit_create() {
    if (draft_name.trim().length === 0) return;
    create_label(draft_name, draft_color);
    set_draft_name("");
    set_draft_color(LABEL_PALETTE[0]);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-base font-medium text-text-primary">
            {t("chat.labels.title")}
          </h2>
          <Button
            variant="ghost"
            size="md"
            onClick={on_close}
            aria-label={t("chat.labels.close_aria")}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 py-4 border-b space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {t("chat.labels.create_section")}
          </h3>
          <div className="flex items-center gap-2">
            <Input
              value={draft_name}
              onChange={(e) => set_draft_name(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit_create();
              }}
              placeholder={t("chat.labels.name_placeholder")}
              className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="color"
              value={draft_color}
              onChange={(e) => set_draft_color(e.target.value)}
              aria-label={t("chat.labels.color_aria")}
              className="w-10 h-9 border rounded cursor-pointer"
            />
            <Button
              variant="primary"
              size="md"
              onClick={commit_create}
              disabled={draft_name.trim().length === 0}
              aria-label={t("chat.labels.create_aria")}
            >
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {LABEL_PALETTE.map((c) => (
              <Button
                key={c}
                variant="unstyled"
                onClick={() => set_draft_color(c)}
                aria-label={t("chat.labels.swatch_aria", { color: c })}
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                style={{
                  backgroundColor: c,
                  outline: draft_color === c ? "2px solid #111" : "none",
                  outlineOffset: 1,
                }}
              >
                {/* Colour swatch — `style.backgroundColor` is
                    the only visual. The `sr-only` label keeps
                    screen readers happy. */}
                <span className="sr-only">{c}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {labels.length === 0 ? (
            <div className="px-5 py-6 text-sm text-text-secondary text-center">
              {t("chat.labels.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border-DEFAULT">
              {labels.map((l) => (
                <LabelRow
                  key={l.id}
                  label={l}
                  on_update={(patch) => update_label(l.id, patch)}
                  on_delete={() => delete_label(l.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelRow({
  label,
  on_update,
  on_delete,
}: {
  label: Label;
  on_update: (patch: { name?: string; color?: string }) => void;
  on_delete: () => void;
}) {
  const t = useT();
  const [name, set_name] = useState(label.name);
  const [confirm, set_confirm] = useState(false);

  return (
    <li className="px-5 py-3 flex items-center gap-2">
      <input
        type="color"
        value={label.color}
        onChange={(e) => on_update({ color: e.target.value })}
        aria-label={t("chat.labels.color_aria")}
        className="w-7 h-7 border rounded cursor-pointer"
      />
      <Input
        value={name}
        onChange={(e) => set_name(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed.length > 0 && trimmed !== label.name) {
            on_update({ name: trimmed });
          } else {
            set_name(label.name);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            set_name(label.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 border-transparent border rounded px-2 py-1 text-sm hover: focus:border-accent focus:outline-none"
      />
      {confirm ? (
        <div className="flex items-center gap-1">
          <Button variant="primary" size="sm" onClick={on_delete}>
            {t("chat.labels.row_delete_yes")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => set_confirm(false)}>
            {t("chat.labels.row_delete_no")}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onClick={() => set_confirm(true)}
          aria-label={t("chat.labels.row_delete_aria", { name: label.name })}
        >
          <Trash2 size={14} />
        </Button>
      )}
    </li>
  );
}
