// Phase 81.31 follow-up #1 — multi-locale persona editor.
//
// Reads `persona_locales` from `agents/get` and exposes a locale
// dropdown at the top + 5 textareas (system_prompt + IDENTITY +
// SOUL + USER + AGENTS) per locale. Save goes through the new
// `persona/save_localized` RPC which writes the 4 workspace files
// + patches `agents.d/<id>.yaml::locale_prompts[<locale>]` in one
// shot.
//
// Switching locale repopulates the form; the operator is warned
// about unsaved edits via a dirty banner.

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { getAgent } from "../../../api/agents";
import type { AgentDetail } from "../../../api/agents";
import { savePersonaLocalized } from "../../../api/persona";
import type {
  PersonaLocales,
  PersonaSnapshot,
} from "../../../api/types.gen";
import { PERSONA_HINTS, PERSONA_PLACEHOLDERS } from "./templates";
import { Button, Code, Select, Spinner } from "../../../components/ui";

interface Props {
  agent_id: string;
}

type SectionKey = "system_prompt" | "identity" | "soul" | "user" | "agents";

interface Section {
  key: SectionKey;
  label: string;
  placeholder: string;
  hint: string;
  height: number;
}

const SECTIONS: Section[] = [
  {
    key: "system_prompt",
    label: "System prompt",
    placeholder: "Define el rol y las reglas duras del agente.",
    hint:
      "Texto que viaja como `system` en cada turno. Lo que escribas aquí pisa el system_prompt top-level cuando el agente usa este locale.",
    height: 320,
  },
  {
    key: "identity",
    label: "IDENTITY",
    placeholder: PERSONA_PLACEHOLDERS.identity,
    hint: PERSONA_HINTS.identity,
    height: 200,
  },
  {
    key: "soul",
    label: "SOUL (alma / personalidad)",
    placeholder: PERSONA_PLACEHOLDERS.soul,
    hint: PERSONA_HINTS.soul,
    height: 320,
  },
  {
    key: "user",
    label: "USER (sobre el cliente)",
    placeholder: PERSONA_PLACEHOLDERS.user,
    hint: PERSONA_HINTS.user,
    height: 240,
  },
  {
    key: "agents",
    label: "AGENTS (peers)",
    placeholder: PERSONA_PLACEHOLDERS.agents,
    hint: PERSONA_HINTS.agents,
    height: 200,
  },
];

const EMPTY_SNAPSHOT: PersonaSnapshot = {
  system_prompt: "",
  identity: "",
  soul: "",
  user: "",
  agents: "",
  present_files: [],
};

export default function PersonaEditor({ agent_id }: Props) {
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [snapshot, setSnapshot] = useState<PersonaSnapshot>(EMPTY_SNAPSHOT);
  const [originalSnapshot, setOriginalSnapshot] =
    useState<PersonaSnapshot>(EMPTY_SNAPSHOT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Load detail + initial locale on mount + when agent_id changes.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setDetail(null);
    getAgent(agent_id)
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setLoadError(`agent ${agent_id} not found`);
          return;
        }
        setDetail(d);
        const locales = d.persona_locales as PersonaLocales | null | undefined;
        if (locales && locales.available.length > 0) {
          const first = locales.available[0];
          setActiveLocale(first);
          const snap =
            locales.snapshots.find((e) => e.locale === first)?.snapshot ??
            EMPTY_SNAPSHOT;
          setSnapshot(snap);
          setOriginalSnapshot(snap);
        } else {
          // Legacy agent — synthesize a single-locale view from
          // the agent's top-level `system_prompt`. Workspace files
          // are empty because the daemon doesn't have a reader
          // wired (very old install).
          const synth: PersonaSnapshot = {
            system_prompt: d.system_prompt,
            identity: "",
            soul: "",
            user: "",
            agents: "",
            present_files: ["system_prompt"],
          };
          setActiveLocale(d.language ?? "en");
          setSnapshot(synth);
          setOriginalSnapshot(synth);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agent_id]);

  const dirty = useMemo(
    () => JSON.stringify(snapshot) !== JSON.stringify(originalSnapshot),
    [snapshot, originalSnapshot],
  );

  const availableLocales: string[] =
    detail?.persona_locales?.available ??
    (detail ? [detail.language ?? "en"] : []);

  function onLocaleChange(locale: string) {
    if (locale === activeLocale) return;
    if (
      dirty &&
      !window.confirm(
        "Hay ediciones sin guardar en este idioma. ¿Descartar y cambiar?",
      )
    ) {
      return;
    }
    setActiveLocale(locale);
    const locales = detail?.persona_locales as
      | PersonaLocales
      | null
      | undefined;
    const next =
      locales?.snapshots.find((e) => e.locale === locale)?.snapshot ??
      EMPTY_SNAPSHOT;
    setSnapshot(next);
    setOriginalSnapshot(next);
    setSaveError(null);
  }

  function updateField(key: SectionKey, value: string) {
    setSnapshot((s) => ({ ...s, [key]: value }));
    setSavedAt(null);
  }

  async function save() {
    if (!detail) return;
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await savePersonaLocalized({
        agent_id,
        locale: activeLocale,
        system_prompt: snapshot.system_prompt,
        identity: snapshot.identity,
        soul: snapshot.soul,
        user: snapshot.user,
        agents: snapshot.agents,
        patch_yaml: true,
      });
      setOriginalSnapshot(snapshot);
      setSavedAt(Date.now());
      // Refresh `persona_locales` in case `available` gained a
      // new locale (saving `pt-BR` for the first time, for
      // example).
      const refreshed = await getAgent(agent_id);
      if (refreshed) setDetail(refreshed);
      // Suppress the unused-var warning — `resp` is read for the
      // type contract but we don't surface its `written_paths` in
      // the editor UI (it's available for audit logs).
      void resp;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        No pude cargar la persona del agente: {loadError}
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="p-4 text-sm text-text-secondary flex items-center gap-2">
        <Spinner size="md" /> Cargando persona…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-text-secondary">
        Workspace en disco:{" "}
        <Code>{detail.workspace ?? "(sin workspace)"}</Code>
      </div>

      {/* Locale dropdown — promoted to top */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-text-secondary">
          Idioma de la persona
        </label>
        <Select
          value={activeLocale}
          onChange={(e) => onLocaleChange(e.target.value)}
          disabled={availableLocales.length <= 1}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {availableLocales.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </Select>
        {/* Phase 81.31 follow-up #2 — voice picker hint. Read-only
            for now: shows which Microsoft Edge neural voice the
            voice-mode tool will pick for this locale. Operator
            still overrides per-conversation via the voice mode
            tool; this hint just makes the default discoverable. */}
        {(() => {
          const entry = detail.persona_locales?.snapshots.find(
            (e) => e.locale === activeLocale,
          );
          const voice = entry?.recommended_voice;
          if (!voice) return null;
          return (
            <p className="text-xs text-text-meta">
              Voz recomendada: <Code>{voice}</Code>
            </p>
          );
        })()}
        {availableLocales.length === 1 && (
          <p className="text-xs text-text-meta">
            Para añadir otro idioma, guardá una variante nueva escribiendo
            en otro locale y volverá a aparecer en este menú.
          </p>
        )}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-xs text-text-secondary">
          {dirty ? (
            <span className="text-amber-700">
              Hay ediciones sin guardar en <Code>{activeLocale}</Code>.
            </span>
          ) : savedAt ? (
            <span className="text-emerald-700">Guardado.</span>
          ) : (
            <span>Edita el texto y presioná Guardar.</span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => void save()}
          disabled={saving || !dirty}
        >
          {saving ? <Spinner size="md" /> : <Save size={14} />}
          Guardar {activeLocale}
        </Button>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error guardando: {saveError}
        </div>
      )}

      {SECTIONS.map((s) => {
        const value = snapshot[s.key];
        const present = (snapshot.present_files ?? []).includes(s.key);
        return (
          <div key={s.key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="font-mono text-xs uppercase tracking-wide text-text-primary">
                {s.label}
              </label>
              {!present && (
                <span className="text-xs text-text-meta">
                  (sin variante {activeLocale} — mostrando default)
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">{s.hint}</p>
            <div
              data-color-mode="light"
              className="border rounded overflow-hidden"
            >
              <MDEditor
                value={value}
                onChange={(v) => updateField(s.key, v ?? "")}
                height={s.height}
                preview="live"
                visibleDragbar={false}
                textareaProps={{
                  placeholder: s.placeholder,
                  spellCheck: false,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
