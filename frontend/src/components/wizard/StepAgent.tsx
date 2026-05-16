// Step 3 — agent persona + binding. Submits to
// `/api/onboarding/agent/save` which fans out to `agents/upsert`
// with the right `inbound_bindings` shape on the server.
//
// Phase 81.31 — "existing" mode promotes a locale dropdown above
// the prompt + exposes the 4 persona workspace files (IDENTITY,
// SOUL, USER, AGENTS) for editing per locale. Switching locale
// repopulates the snapshot from the source agent.

import { useEffect, useState } from "react";
import { Button, Input, Select, Spinner, Textarea } from "../ui";
import { saveAgent } from "../../api/onboarding";
import { listAgents, getAgent } from "../../api/agents";
import type { AgentSummary, AgentDetail } from "../../api/agents";
import { savePersonaLocalized } from "../../api/persona";
import type {
  PersonaLocales,
  PersonaSnapshot,
} from "../../api/types.gen";
import { useWizard } from "../../store/wizard";
import {
  defaultTemplateIdFor,
  findTemplateByPrompt,
  getTemplateById,
  templatesForLanguage,
} from "./personaTemplates";
import { useT } from "../../i18n";

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,40}$/;

function slugFromName(name: string): string {
  const folded = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let slug = folded.replace(/[^a-z0-9_]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > 0 && !/^[a-z]/.test(slug)) slug = `a-${slug}`;
  return slug.slice(0, 41);
}

type PersonaMode = "template" | "existing";

const EMPTY_SNAPSHOT: PersonaSnapshot = {
  system_prompt: "",
  identity: "",
  soul: "",
  user: "",
  agents: "",
  present_files: [],
};

interface StepAgentProps {
  onContinue: () => void;
  pairedInstance?: string;
  /** Channel chosen in the pairing step. Defaults to "whatsapp". */
  selectedChannel?: string;
}

export default function StepAgent({
  onContinue,
  pairedInstance,
  selectedChannel = "whatsapp",
}: StepAgentProps) {
  const t = useT();
  const agent = useWizard((s) => s.agent);
  const update = useWizard((s) => s.updateAgent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Persona mode ──────────────────────────────────────────
  const [personaMode, setPersonaMode] = useState<PersonaMode>("template");
  const [existingAgents, setExistingAgents] = useState<
    readonly AgentSummary[] | null
  >(null);
  const [existingLoading, setExistingLoading] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");

  // Phase 81.31 — full source agent detail (with persona_locales)
  // + currently-displayed locale + editable snapshot.
  const [sourceDetail, setSourceDetail] = useState<AgentDetail | null>(null);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [snapshot, setSnapshot] = useState<PersonaSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (personaMode !== "existing" || existingAgents !== null) return;
    setExistingLoading(true);
    listAgents()
      .then((agents) => setExistingAgents(agents))
      .catch(() => setExistingAgents([]))
      .finally(() => setExistingLoading(false));
  }, [personaMode, existingAgents]);

  async function onSelectExisting(id: string) {
    setSelectedExistingId(id);
    setSourceDetail(null);
    setSnapshot(EMPTY_SNAPSHOT);
    if (!id) return;
    const detail = await getAgent(id);
    if (!detail) return;
    setSourceDetail(detail);
    const locales = detail.persona_locales as PersonaLocales | null | undefined;
    if (locales && locales.available.length > 0) {
      const first = locales.available[0];
      setActiveLocale(first);
      const found = locales.snapshots.find((e) => e.locale === first);
      const snap = found?.snapshot ?? legacySnapshot(detail);
      setSnapshot(snap);
      applySnapshotToWizard(snap, first);
    } else {
      // Legacy agent — single locale, snapshot derived from
      // top-level system_prompt only.
      setActiveLocale(detail.language ?? "en");
      const snap = legacySnapshot(detail);
      setSnapshot(snap);
      applySnapshotToWizard(snap, detail.language ?? "en");
    }
  }

  function applySnapshotToWizard(snap: PersonaSnapshot, locale: string) {
    update({
      system_prompt: snap.system_prompt,
      language: locale === "es" ? "es" : "en",
    });
  }

  function legacySnapshot(detail: AgentDetail): PersonaSnapshot {
    return {
      system_prompt: detail.system_prompt,
      identity: "",
      soul: "",
      user: "",
      agents: "",
      present_files: ["system_prompt"],
    };
  }

  function onLocaleChange(locale: string) {
    if (!sourceDetail) return;
    const locales = sourceDetail.persona_locales as
      | PersonaLocales
      | null
      | undefined;
    const found = locales?.snapshots.find((e) => e.locale === locale);
    const snap = found?.snapshot ?? EMPTY_SNAPSHOT;
    setActiveLocale(locale);
    setSnapshot(snap);
    applySnapshotToWizard(snap, locale);
  }

  function updateSnapshotField(
    key: keyof Pick<
      PersonaSnapshot,
      "system_prompt" | "identity" | "soul" | "user" | "agents"
    >,
    value: string,
  ) {
    setSnapshot((s) => ({ ...s, [key]: value }));
    if (key === "system_prompt") {
      update({ system_prompt: value });
    }
  }

  // ── Template mode ─────────────────────────────────────────
  function onNameChange(name: string) {
    update({ name, id: slugFromName(name) });
  }

  const activeTemplate = findTemplateByPrompt(agent.system_prompt);
  const visibleTemplates = templatesForLanguage(agent.language);

  useEffect(() => {
    if (personaMode !== "template") return;
    if (activeTemplate.language === "any") return;
    if (activeTemplate.language === agent.language) return;
    const fallback = getTemplateById(defaultTemplateIdFor(agent.language));
    if (fallback) update({ system_prompt: fallback.system_prompt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.language, personaMode]);

  function onSelectTemplate(id: string) {
    const tpl = getTemplateById(id);
    if (!tpl) return;
    update({ system_prompt: tpl.system_prompt });
  }

  // ── Validation + submit ───────────────────────────────────
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
        channel: selectedChannel,
      };
      if (pairedInstance !== undefined) {
        payload.instance = pairedInstance;
      }
      await saveAgent(payload);
      // Phase 81.31 — when copying from existing in a non-default
      // locale, also persist the 4 workspace files + patch
      // locale_prompts so the new agent inherits the localised
      // content.
      if (
        personaMode === "existing" &&
        sourceDetail &&
        (snapshot.identity || snapshot.soul || snapshot.user || snapshot.agents)
      ) {
        try {
          await savePersonaLocalized({
            agent_id: agent.id,
            locale: activeLocale,
            system_prompt: snapshot.system_prompt || agent.system_prompt,
            identity: snapshot.identity,
            soul: snapshot.soul,
            user: snapshot.user,
            agents: snapshot.agents,
            patch_yaml: true,
          });
        } catch (e) {
          // Best-effort — the agent already exists, so we surface
          // the failure inline without rolling it back. Operator
          // can retry from the PersonaEditor after the wizard.
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setBusy(false);
          return;
        }
      }
      onContinue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const body = (e as { body?: { message?: string; code?: string } }).body;
      setError(body?.message ?? msg);
    } finally {
      setBusy(false);
    }
  }

  const availableLocales =
    sourceDetail?.persona_locales?.available ??
    (sourceDetail ? [sourceDetail.language ?? "en"] : []);

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

      {/* Persona source toggle */}
      <div>
        <span className="block text-xs font-medium text-text-secondary mb-2">
          {t("wizard.agent.persona_source_label")}
        </span>
        <div className="flex gap-2">
          <Button
            variant={personaMode === "template" ? "primary" : "secondary"}
            size="md"
            onClick={() => setPersonaMode("template")}
          >
            {t("wizard.agent.persona_new")}
          </Button>
          <Button
            variant={personaMode === "existing" ? "primary" : "secondary"}
            size="md"
            onClick={() => setPersonaMode("existing")}
          >
            {t("wizard.agent.persona_existing")}
          </Button>
        </div>
      </div>

      {/* Template mode */}
      {personaMode === "template" && (
        <>
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
              onChange={(e) =>
                update({ language: e.target.value as "es" | "en" })
              }
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="es">{t("wizard.agent.lang_es")}</option>
              <option value="en">{t("wizard.agent.lang_en")}</option>
            </Select>
          </Field>
        </>
      )}

      {/* Existing agent mode */}
      {personaMode === "existing" && (
        <>
          <Field label={t("wizard.agent.existing_agent_label")}>
            {existingLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="md" />
                {t("wizard.agent.existing_loading")}
              </div>
            ) : (
              <Select
                value={selectedExistingId}
                onChange={(e) => void onSelectExisting(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">{t("wizard.agent.existing_placeholder")}</option>
                {(existingAgents ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {sourceDetail && (
            <Field label={t("wizard.persona.locale_label")}>
              <Select
                value={activeLocale}
                onChange={(e) => onLocaleChange(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm bg-white"
                disabled={availableLocales.length <= 1}
              >
                {availableLocales.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>
              {/* Phase 81.31 follow-up #2 — voice picker hint. */}
              {(() => {
                const entry = sourceDetail?.persona_locales?.snapshots.find(
                  (e) => e.locale === activeLocale,
                );
                const voice = entry?.recommended_voice;
                if (!voice) return null;
                return (
                  <span className="block text-xs text-text-meta mt-1">
                    {t("wizard.persona.voice_hint", { voice })}
                  </span>
                );
              })()}
            </Field>
          )}

          {sourceDetail && (
            <>
              <Field label={t("wizard.persona.field_system_prompt")}>
                <Textarea
                  rows={6}
                  value={snapshot.system_prompt}
                  onChange={(e) =>
                    updateSnapshotField("system_prompt", e.target.value)
                  }
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
                />
                <FallbackHint
                  present={snapshot.present_files}
                  field="system_prompt"
                  locale={activeLocale}
                />
              </Field>

              <Field label={t("wizard.persona.field_identity")}>
                <Textarea
                  rows={4}
                  value={snapshot.identity}
                  onChange={(e) => updateSnapshotField("identity", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
                />
                <FallbackHint
                  present={snapshot.present_files}
                  field="identity"
                  locale={activeLocale}
                />
              </Field>

              <Field label={t("wizard.persona.field_soul")}>
                <Textarea
                  rows={4}
                  value={snapshot.soul}
                  onChange={(e) => updateSnapshotField("soul", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
                />
                <FallbackHint
                  present={snapshot.present_files}
                  field="soul"
                  locale={activeLocale}
                />
              </Field>

              <Field label={t("wizard.persona.field_user")}>
                <Textarea
                  rows={4}
                  value={snapshot.user}
                  onChange={(e) => updateSnapshotField("user", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
                />
                <FallbackHint
                  present={snapshot.present_files}
                  field="user"
                  locale={activeLocale}
                />
              </Field>

              <Field label={t("wizard.persona.field_agents")}>
                <Textarea
                  rows={4}
                  value={snapshot.agents}
                  onChange={(e) => updateSnapshotField("agents", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed"
                />
                <FallbackHint
                  present={snapshot.present_files}
                  field="agents"
                  locale={activeLocale}
                />
              </Field>
            </>
          )}
        </>
      )}

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

function FallbackHint({
  present,
  field,
  locale,
}: {
  present: string[] | undefined;
  field: string;
  locale: string;
}) {
  const t = useT();
  if ((present ?? []).includes(field)) return null;
  return (
    <span className="block text-xs text-text-meta mt-1">
      {t("wizard.persona.fallback_hint", { locale })}
    </span>
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
