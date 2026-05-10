// Form editor for one operator-authored draft template.
// Shape mirrors `nexo_microapp_sdk::templating::Template`:
// id (locked once existing), name, optional description,
// body. Same mustache-lite renderer as the snippet editor.

import { useState } from "react";

import type { ConfigTemplate } from "../../../api/marketing";
import { Button, Input, Textarea } from "../../../components/ui";
import { useT } from "../../../i18n";

interface Props {
  readonly initial: ConfigTemplate;
  readonly idLocked: boolean;
  readonly onSave: (next: ConfigTemplate) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export default function TemplateEditor({
  initial,
  idLocked,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState<ConfigTemplate>({ ...initial });

  const idValid = draft.id.trim().length > 0;
  const nameValid = draft.name.trim().length > 0;
  const bodyValid = draft.body.trim().length > 0;
  const canSave = idValid && nameValid && bodyValid;

  return (
    <div
      data-testid="template-editor"
      className="space-y-3 rounded border border-indigo-200 bg-indigo-50/30 p-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.template_editor.id")}
          <Input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            disabled={idLocked}
            aria-label="template-id"
            className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.template_editor.name")}
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            aria-label="template-name"
            className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
        {t("marketing.template_editor.description")}
        <Input
          value={draft.description ?? ""}
          onChange={(e) =>
            setDraft((d) => {
              const trimmed = e.target.value.trim();
              if (trimmed.length === 0) {
                const { description: _drop, ...rest } = d;
                return rest;
              }
              return { ...d, description: e.target.value };
            })
          }
          placeholder={t("marketing.template_editor.description_placeholder")}
          aria-label="template-description"
          className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
        {t("marketing.template_editor.body", { example: "{{person.name}}" })}
        <Textarea
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          rows={8}
          aria-label="template-body"
          className="rounded border  bg-white p-2 font-mono text-[11px] text-text-primary outline-none focus:border-indigo-400"
        />
      </label>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSave(draft)}
          disabled={!canSave}
        >
          {t("common.save")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>
            {t("marketing.template_editor.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
