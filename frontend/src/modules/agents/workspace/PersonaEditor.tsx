// 4-section persona editor. One textarea per markdown
// (IDENTITY/SOUL/USER/AGENTS). Each shows a placeholder template
// so the operator sees a working example before they write their
// own. Save is per-section so a slow PUT on one doesn't block the
// others.

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import {
  getPersona,
  savePersonaFile,
  type PersonaFileKey,
  type PersonaState,
} from "../../../api/workspace";
import { PERSONA_HINTS, PERSONA_PLACEHOLDERS } from "./templates";
import { Button, Code, Spinner } from "../../../components/ui";

interface Props {
  agent_id: string;
}

interface Section {
  key: PersonaFileKey;
  label: string;
  placeholder: string;
  hint: string;
  height: number;
}

const SECTIONS: Section[] = [
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
    height: 360,
  },
  {
    key: "user",
    label: "USER (sobre el cliente)",
    placeholder: PERSONA_PLACEHOLDERS.user,
    hint: PERSONA_HINTS.user,
    height: 280,
  },
  {
    key: "agents",
    label: "AGENTS (peers)",
    placeholder: PERSONA_PLACEHOLDERS.agents,
    hint: PERSONA_HINTS.agents,
    height: 240,
  },
];

export default function PersonaEditor({ agent_id }: Props) {
  const [state, setState] = useState<PersonaState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<PersonaFileKey | null>(null);
  const [savedKey, setSavedKey] = useState<PersonaFileKey | null>(null);
  const [errorByKey, setErrorByKey] = useState<
    Partial<Record<PersonaFileKey, string>>
  >({});

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    getPersona(agent_id)
      .then((s) => {
        if (!cancelled) setState(s);
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

  function update(key: PersonaFileKey, value: string) {
    setState((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSavedKey((k) => (k === key ? null : k));
  }

  async function save(key: PersonaFileKey) {
    if (!state) return;
    setSavingKey(key);
    setErrorByKey((prev) => ({ ...prev, [key]: undefined }));
    try {
      await savePersonaFile(agent_id, key, state[key]);
      setSavedKey(key);
      window.setTimeout(() => {
        setSavedKey((k) => (k === key ? null : k));
      }, 1800);
    } catch (e) {
      setErrorByKey((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      setSavingKey(null);
    }
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        No pude cargar la persona del agente: {loadError}
      </div>
    );
  }
  if (!state) {
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
        <Code>
          {state.workspace}
        </Code>
      </div>
      {SECTIONS.map((s) => {
        const value = state[s.key];
        const isSaving = savingKey === s.key;
        const justSaved = savedKey === s.key;
        const err = errorByKey[s.key];
        return (
          <div key={s.key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="font-mono text-xs uppercase tracking-wide text-text-primary">
                {s.label}
              </label>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void save(s.key)}
                disabled={isSaving}
              >
                {isSaving ? <Spinner size="md" /> : <Save size={12} />}
                {justSaved ? "Guardado" : "Guardar"}
              </Button>
            </div>
            <p className="text-xs text-text-secondary">{s.hint}</p>
            <div
              data-color-mode="light"
              className="border  rounded overflow-hidden"
            >
              <MDEditor
                value={value}
                onChange={(v) => update(s.key, v ?? "")}
                height={s.height}
                preview="live"
                visibleDragbar={false}
                textareaProps={{
                  placeholder: s.placeholder,
                  spellCheck: false,
                }}
              />
            </div>
            {err && <p className="text-xs text-red-700">Error: {err}</p>}
          </div>
        );
      })}
    </div>
  );
}
