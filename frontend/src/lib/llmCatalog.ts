// Provider catalogue is now sourced from the daemon at runtime via
// `nexo/admin/llm_providers/catalog`. The daemon walks its in-process
// `LlmRegistry` and emits one row per registered factory — only the
// providers the framework can actually instantiate. UIs subscribe via
// `useLlmCatalog` (zustand store) which fetches once + caches.

import { create } from "zustand";
import { adminCall } from "../api/admin";

/** Phase 82.10.u — declarative credential field descriptor.
 *  Mirrors the Rust wire shape in
 *  `nexo_tool_meta::admin::llm_providers::CredentialFieldDescriptor`. */
export interface CredentialFieldDescriptor {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  secret: boolean;
  default?: string;
  help?: string;
  validation?: FieldValidation;
  depends_on?: DependsOn;
}

export type FieldKind =
  | { type: "text" }
  | { type: "password" }
  | { type: "select"; options: { value: string; label: string }[] };

export type FieldValidation =
  | { type: "regex"; pattern: string; hint: string }
  | { type: "length"; min: number; max: number };

export interface DependsOn {
  field: string;
  any_of: string[];
}

/** Phase 82.10.u — wire form. Must match the
 *  `#[serde(rename = "...")]` discriminators in nexo-tool-meta. */
export type AuthMode =
  | "api_key"
  | "setup_token"
  | "oauth_auth_code"
  | "oauth_device_code"
  | "oauth_bundle_import";

export interface LlmCatalogEntry {
  /** Provider id — matches `llm.yaml.providers.<id>` and the
   *  `crates/llm/src/<id>.rs` factory's `name()`. */
  id: string;
  /** Human label for the dropdown. v1 uses the id as-is — daemon
   *  doesn't carry display names yet. */
  name: string;
  /** Default HTTP base URL the factory advertises. May be empty
   *  for factories that haven't declared one. */
  base_url: string;
  /** Conventional env var name holding the API key. May be empty. */
  api_key_env: string;
  /** Curated list of model ids the factory accepts. May be empty
   *  when the factory hasn't declared known models — UIs fall back
   *  to a free-text input in that case. */
  models: string[];
  /** Phase 82.10.u — declarative credential schema. Empty for
   *  factories that haven't migrated; SPA falls back to the legacy
   *  single-api_key UI. */
  credential_schema: CredentialFieldDescriptor[];
  /** Phase 82.10.u — auth modes the factory supports. */
  supported_auth_modes: AuthMode[];
  /** Phase 82.10.u — `true` when `/v1/models` is queryable for live
   *  model enumeration. `false` for Anthropic + Gemini. */
  supports_models_probe: boolean;
}

interface CatalogState {
  entries: LlmCatalogEntry[] | null;
  error: string | null;
  /** Single-flight latch — the first caller's promise is shared by
   *  every concurrent caller until resolution, then cached. */
  inflight: Promise<void> | null;
  load: () => Promise<void>;
}

interface RawEntry {
  id: string;
  default_base_url: string;
  default_env_var: string;
  models: string[];
  /** Phase 82.10.u — schema fields. Optional for back-compat with
   *  pre-82.10.u daemons that omit them. */
  credential_schema?: CredentialFieldDescriptor[];
  supported_auth_modes?: AuthMode[];
  supports_models_probe?: boolean;
}

function humanLabel(id: string): string {
  // Display name fallback — capitalize first letter, leave the rest
  // alone so "minimax" → "Minimax", "openai" → "Openai", etc. The
  // daemon is the source of truth for IDs; if we want fancier names
  // later, add a `display_name` field to the wire shape and have the
  // factory return it.
  if (id.length === 0) return id;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const useLlmCatalog = create<CatalogState>((set, get) => ({
  entries: null,
  error: null,
  inflight: null,
  load: async () => {
    const cur = get();
    if (cur.entries !== null) return;
    if (cur.inflight) return cur.inflight;
    const p = (async () => {
      try {
        const res = await adminCall<{ providers: RawEntry[] }>(
          "nexo/admin/llm_providers/catalog",
          {},
        );
        set({
          entries: res.providers.map((p) => ({
            id: p.id,
            name: humanLabel(p.id),
            base_url: p.default_base_url,
            api_key_env: p.default_env_var,
            models: p.models,
            credential_schema: p.credential_schema ?? [],
            supported_auth_modes: p.supported_auth_modes ?? [],
            supports_models_probe: p.supports_models_probe ?? true,
          })),
          error: null,
          inflight: null,
        });
      } catch (e) {
        set({
          error: e instanceof Error ? e.message : String(e),
          inflight: null,
        });
      }
    })();
    set({ inflight: p });
    return p;
  },
}));

/** Sync helper — assumes the store has been populated already.
 *  Returns `undefined` when the catalogue hasn't loaded or the id
 *  isn't registered. */
export function findCatalogEntry(id: string): LlmCatalogEntry | undefined {
  return useLlmCatalog.getState().entries?.find((c) => c.id === id);
}

/** Sync helper — models for a provider id. Empty array when the
 *  catalogue hasn't loaded, the id isn't registered, or the
 *  factory didn't declare any models. */
export function modelsFor(id: string): string[] {
  return findCatalogEntry(id)?.models ?? [];
}

// ────────────────────────────────────────────────────────────────
// Phase 82.10.t.2 — live models per provider INSTANCE via probe.
// ────────────────────────────────────────────────────────────────

/** TTL for cached probe results before we re-issue against the
 *  provider. 60 s matches the framework-side cache + keeps the
 *  operator's UI snappy without burning rate limits. */
const LIVE_MODELS_TTL_MS = 60_000;

interface LiveModelsEntry {
  /** Models parsed from /v1/models, or `null` when the provider
   *  doesn't expose that shape (Anthropic, Gemini) — UI falls
   *  back to the static `catalog.models` for the factory_type. */
  names: string[] | null;
  /** Probe error string (rate limit, 401, etc). When set, UI
   *  shows the message and falls back to the static catalog. */
  error: string | null;
  /** Cache expiry timestamp. */
  expires_at_ms: number;
}

interface LiveModelsState {
  /** instance_id → entry. Per-instance because two instances of
   *  the same factory (e.g. minimax-cliente-a + minimax-cliente-b)
   *  hit different keys + therefore different model lists. */
  by_instance: Map<string, LiveModelsEntry>;
  /** Concurrent-request dedupe — first caller's promise is shared
   *  with every other in-flight caller for the same instance. */
  inflight: Map<string, Promise<void>>;
  load: (instance_id: string, force?: boolean) => Promise<void>;
  /** Sync getter — returns the entry if present + not expired,
   *  null when the operator must call `load` first. */
  current: (instance_id: string) => LiveModelsEntry | null;
}

interface RawProbeResponse {
  ok: boolean;
  status: number;
  latency_ms: number;
  model_count?: number;
  model_names?: string[];
  error?: string;
}

export const useLiveModels = create<LiveModelsState>((set, get) => ({
  by_instance: new Map(),
  inflight: new Map(),
  current: (instance_id) => {
    const entry = get().by_instance.get(instance_id);
    if (!entry) return null;
    if (entry.expires_at_ms < Date.now()) return null;
    return entry;
  },
  load: async (instance_id, force = false) => {
    const cur = get();
    const cached = cur.by_instance.get(instance_id);
    if (!force && cached && cached.expires_at_ms >= Date.now()) {
      return;
    }
    const inflight_existing = cur.inflight.get(instance_id);
    if (inflight_existing) return inflight_existing;

    const p = (async () => {
      try {
        const resp = await adminCall<RawProbeResponse>(
          "nexo/admin/llm_providers/probe",
          { provider_id: instance_id },
        );
        const entry: LiveModelsEntry = {
          names: resp.model_names ?? null,
          error: resp.error ?? null,
          expires_at_ms: Date.now() + LIVE_MODELS_TTL_MS,
        };
        set((s) => {
          const next = new Map(s.by_instance);
          next.set(instance_id, entry);
          const inflight = new Map(s.inflight);
          inflight.delete(instance_id);
          return { by_instance: next, inflight };
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        set((s) => {
          const next = new Map(s.by_instance);
          next.set(instance_id, {
            names: null,
            error: msg,
            // Cache failures briefly too so UI doesn't hammer
            // the daemon when the provider is down.
            expires_at_ms: Date.now() + LIVE_MODELS_TTL_MS,
          });
          const inflight = new Map(s.inflight);
          inflight.delete(instance_id);
          return { by_instance: next, inflight };
        });
      }
    })();

    set((s) => {
      const inflight = new Map(s.inflight);
      inflight.set(instance_id, p);
      return { inflight };
    });
    return p;
  },
}));
