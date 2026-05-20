// Phase 99.8 — action buttons for a plugin admin-UI screen.
//
// Each action dispatches its declared admin RPC method (under the
// plugin's `[plugin.admin]` prefix) with optional inline prompt
// fields, an optional confirm gate, and renders the result per
// `on_success` (toast / inline_json / table / redirect / refresh).

import { useState } from "react";

import { adminCall } from "../../api/admin";
import type { ActionView } from "../../api/types.gen";
import { FieldInput } from "./FieldInput";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export interface ActionBarProps {
  actions: ActionView[];
  /** Called after a `refresh` action so the screen reloads. */
  onAfter?: () => void;
}

export function ActionBar({ actions, onAfter }: ActionBarProps) {
  if (actions.length === 0) return null;
  return (
    <div className="plugin-actions">
      {actions.map((a) => (
        <ActionButton key={a.id} action={a} onAfter={onAfter} />
      ))}
    </div>
  );
}

function ActionButton({
  action,
  onAfter,
}: {
  action: ActionView;
  onAfter: (() => void) | undefined;
}) {
  const [prompt, setPrompt] = useState<Record<string, JsonValue>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JsonValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminCall<JsonValue>(action.method, prompt);
      switch (action.on_success) {
        case "refresh":
          onAfter?.();
          break;
        case "redirect":
          if (res && typeof res === "object" && "url" in res) {
            const url = (res as { url?: unknown }).url;
            if (typeof url === "string") window.location.assign(url);
          }
          break;
        case "inline_json":
        case "table":
          setResult(res);
          break;
        default:
          // toast: minimal acknowledgement.
          setResult({ ok: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="plugin-action" data-action={action.id}>
      {(action.prompt_fields ?? []).map((f) => (
        <FieldInput
          key={f.key}
          field={f}
          value={prompt[f.key]}
          onChange={(v) => setPrompt((p) => ({ ...p, [f.key]: v }))}
        />
      ))}
      <button type="button" onClick={run} disabled={busy}>
        {busy ? "…" : action.label}
      </button>
      {error ? (
        <p className="plugin-action__error" role="alert">
          {error}
        </p>
      ) : null}
      {result !== null ? (
        <pre className="plugin-action__result">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
