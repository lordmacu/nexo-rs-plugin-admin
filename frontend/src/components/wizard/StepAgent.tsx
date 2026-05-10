// Step 3 — agent persona + binding. Submits to
// `/api/onboarding/agent/save` which fans out to `agents/upsert`
// with the right `inbound_bindings` shape on the server.

import { useEffect, useState } from "react";
import { Button, Input, Select, Spinner, Textarea } from "../ui";
import { saveAgent } from "../../api/onboarding";
import { useWizard } from "../../store/wizard";
import {
  defaultTemplateIdFor,
  findTemplateByPrompt,
  getTemplateById,
  templatesForLanguage,
} from "./personaTemplates";
import { useT } from "../../i18n";

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,40}$/;

// Map a free-form display name into a slug that satisfies
// AGENT_ID_RE. Lowercase, ASCII-fold common diacritics, replace
// runs of non-`[a-z0-9_]` with `-`, trim leading/trailing `-`,
// cap at 41 chars, and ensure the leading char is a letter.
function slugFromName(name: string): string {
  const folded = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let slug = folded.replace(/[^a-z0-9_]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > 0 && !/^[a-z]/.test(slug)) slug = `a-${slug}`;
  return slug.slice(0, 41);
}

interface StepAgentProps {
  onContinue: () => void;
  pairedInstance?: string;
}

export default function StepAgent({
  onContinue,
  pairedInstance,
}: StepAgentProps) {
  const t = useT();
  const agent = useWizard((s) => s.agent);
  const update = useWizard((s) => s.updateAgent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function onNameChange(name: string) {
    update({ name, id: slugFromName(name) });
  }

  // M9.c — auto-detect which template the current prompt
  // corresponds to via exact string match. Falls back to the
  // `custom` entry when the operator has typed something that
  // doesn't match any template verbatim.
  const activeTemplate = findTemplateByPrompt(agent.system_prompt);
  // M9.c.b — only show templates whose copy is in the operator-
  // chosen language. `custom` (language: "any") is always there.
  const visibleTemplates = templatesForLanguage(agent.language);

  // M9.c.b — if the active template no longer matches the
  // current language (operator flipped the language dropdown
  // after picking a template), auto-swap to the default for
  // the new language. Skip when the current entry is `custom`
  // (language-neutral) or when the operator has already typed
  // their own prompt (custom path — leave their content alone).
  useEffect(() => {
    if (activeTemplate.language === "any") return;
    if (activeTemplate.language === agent.language) return;
    const fallback = getTemplateById(defaultTemplateIdFor(agent.language));
    if (fallback) update({ system_prompt: fallback.system_prompt });
    // intentionally tracking only `agent.language` — re-running
    // on prompt edits would clobber the operator's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.language]);

  function onSelectTemplate(id: string) {
    const tpl = getTemplateById(id);
    if (!tpl) return;
    // The "Personalizado" entry has empty system_prompt; that's
    // intentional — operator gets a clean slate to type their
    // own. Validation (≥10 chars) blocks submit until they do.
    update({ system_prompt: tpl.system_prompt });
  }

  function validate(): string | null {
    if (!AGENT_ID_RE.test(agent.id)) return t("wizard.agent.error_id");
    if (agent.name.trim().length < 2) return t("wizard.agent.error_name");
    if (agent.system_prompt.trim().length < 10)
      return t("wizard.agent.error_prompt_min");
    if (agent.system_prompt.length > 10000)
      return t("wizard.agent.error_prompt_max");
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Parameters<typeof saveAgent>[0] = {
        id: agent.id,
        model_provider: agent.model_provider,
        model_id: agent.model_id,
        system_prompt: agent.system_prompt,
        language: agent.language,
        channel: "whatsapp",
      };
      if (pairedInstance !== undefined) {
        payload.instance = pairedInstance;
      }
      await saveAgent(payload);
      onContinue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const body = (e as { body?: { message?: string; code?: string } }).body;
      setError(body?.message ?? msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {t("wizard.agent.title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("wizard.agent.subtitle")}
        </p>
      </div>

      <Field label={t("wizard.agent.field_name")}>
        <Input
          value={agent.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("wizard.agent.name_placeholder")}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {agent.id && (
          <span className="block text-xs text-text-meta mt-1 font-mono">
            {t("wizard.agent.id_label", { id: agent.id })}
          </span>
        )}
      </Field>

      <Field label={t("wizard.agent.field_template")}>
        <Select
          value={activeTemplate.id}
          onChange={(e) => onSelectTemplate(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {visibleTemplates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-text-meta mt-1">
          {activeTemplate.description}
        </p>
      </Field>

      <Field label={t("wizard.agent.field_prompt")}>
        <Textarea
          rows={6}
          value={agent.system_prompt}
          onChange={(e) => update({ system_prompt: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
        />
        <span className="block text-xs text-text-meta mt-1">
          {agent.system_prompt.length}/10000
        </span>
      </Field>

      <Field label={t("wizard.agent.field_language")}>
        <Select
          value={agent.language}
          onChange={(e) => update({ language: e.target.value as "es" | "en" })}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="es">{t("wizard.agent.lang_es")}</option>
          <option value="en">{t("wizard.agent.lang_en")}</option>
        </Select>
      </Field>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button variant="primary" size="md" onClick={submit} disabled={busy}>
        {busy ? <Spinner size="md" /> : null}
        {t("wizard.agent.submit")}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
