// Phase 99.8 — generic renderer for a plugin admin-UI screen.
//
// Fetches the live `ScreenDescriptor` (`nexo/admin/plugin_ui/describe`),
// renders its fields (filtered by client-side `visible_when`), saves
// the form via `config_set` (surfacing per-field validation errors),
// runs declared actions, and polls an optional refresh widget.

import { useCallback, useEffect, useState } from "react";

import { adminCall } from "../../api/admin";
import type {
  ConfigSetResponse,
  ScreenDescriptor,
} from "../../api/types.gen";
import { isVisible } from "../../lib/visibleWhenDsl";
import { ActionBar } from "./ActionBar";
import { FieldInput } from "./FieldInput";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

type Status = "loading" | "ready" | "error";

export interface GenericScreenProps {
  plugin: string;
  screen: string;
}

export function GenericScreen({ plugin, screen }: GenericScreenProps) {
  const [descriptor, setDescriptor] = useState<ScreenDescriptor | null>(null);
  const [values, setValues] = useState<Record<string, JsonValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const d = await adminCall<ScreenDescriptor>(
        "nexo/admin/plugin_ui/describe",
        { plugin, screen },
      );
      const init: Record<string, JsonValue> = {};
      for (const f of d.fields) {
        // Secrets are write-only — never seed a value.
        if (f.field_type !== "secret" && f.value !== undefined && f.value !== null) {
          init[f.key] = f.value as JsonValue;
        }
      }
      setDescriptor(d);
      setValues(init);
      setErrors({});
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [plugin, screen]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const resp = await adminCall<ConfigSetResponse>(
        "nexo/admin/plugin_ui/config_set",
        { plugin, screen, values },
      );
      if (resp.ok) {
        setErrors({});
        await load(); // re-pull (updated secret status, server defaults)
      } else {
        const map: Record<string, string> = {};
        for (const e of resp.errors ?? []) {
          map[e.pointer.replace(/^\//, "")] = e.message;
        }
        setErrors(map);
      }
    } catch {
      setErrors({ _form: "save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") return <p className="plugin-screen__status">Loading…</p>;
  if (status === "error" || !descriptor) {
    return (
      <p className="plugin-screen__status" role="alert">
        Failed to load screen.
      </p>
    );
  }

  const ctx = {
    config: values,
    plugin: { installed: true, enabled: true, healthy: true },
    user: {},
    tenant: {},
  };

  return (
    <section className="plugin-screen" data-plugin={plugin} data-screen={screen}>
      <h2>{descriptor.title}</h2>
      {errors._form ? (
        <p role="alert" className="plugin-screen__error">
          {errors._form}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {descriptor.fields
          .filter((f) => isVisible(f.visible_when, ctx))
          .map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              error={errors[f.key]}
            />
          ))}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      <ActionBar actions={descriptor.actions ?? []} onAfter={load} />
      {descriptor.refresh ? (
        <RefreshWidget
          method={descriptor.refresh.method}
          intervalSeconds={descriptor.refresh.interval_seconds ?? null}
        />
      ) : null}
    </section>
  );
}

function RefreshWidget({
  method,
  intervalSeconds,
}: {
  method: string;
  intervalSeconds: number | null;
}) {
  const [data, setData] = useState<JsonValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pull = useCallback(async () => {
    try {
      setData(await adminCall<JsonValue>(method, {}));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [method]);

  useEffect(() => {
    void pull();
    if (intervalSeconds && intervalSeconds > 0) {
      const h = setInterval(() => void pull(), intervalSeconds * 1000);
      return () => clearInterval(h);
    }
    return undefined;
  }, [pull, intervalSeconds]);

  return (
    <div className="plugin-screen__refresh">
      <button type="button" onClick={() => void pull()}>
        Refresh
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {data !== null ? <pre>{JSON.stringify(data, null, 2)}</pre> : null}
    </div>
  );
}
