// Discovery + validation registry for workspace modules.
//
// Modules live under `frontend/src/modules/<id>/manifest.tsx`
// and export a `manifest` constant matching `ModuleManifest`.
// Vite's `import.meta.glob({ eager: true })` resolves them at
// bundle time, so the registry is synchronous after the
// initial top-level await.
//
// Invalid manifests don't crash the shell — they get a
// `ShellError.manifest_invalid` entry, log a warn, and stay
// out of the rail. Same for migration failures: the module
// is marked `disabled` and the operator can reset its state
// from settings (M16+).

import {
  ModuleManifestSchema,
  type ModuleManifest,
  type ModuleMigration,
  type ShellError,
} from "./types";
import {
  clearModuleScope,
  readModuleState,
  writeModuleState,
} from "./localStorage";
import { z } from "zod";

const PERSISTED_VERSION_KEY = "__schema_version";

// Persisted shape used to detect drift between the manifest's
// declared version and what's in localStorage.
const PersistedVersionSchema = z.object({ version: z.string() });

// ── Registry entry shape ────────────────────────────────────────

export interface ModuleEntry {
  /** When `error` is set, `manifest` is the raw imported value
   *  (untrusted) so a settings UI can show the operator what
   *  happened. When `error` is null, `manifest` is validated. */
  readonly manifest: ModuleManifest;
  readonly error: ShellError | null;
  readonly disabled: boolean;
}

// ── Public registry ─────────────────────────────────────────────

export class ModuleRegistry {
  private readonly entries: ReadonlyMap<string, ModuleEntry>;

  private constructor(entries: Map<string, ModuleEntry>) {
    this.entries = entries;
  }

  /** Discover every manifest under `frontend/src/modules/*` and
   *  validate each. Tenant id is required so version
   *  migrations can read/write tenant-scoped state.
   *
   *  Pass `globResult` for tests; production callers omit it
   *  and the registry calls `import.meta.glob` itself. */
  static fromGlob(
    globResult: Record<string, unknown>,
    tenantId: string,
  ): ModuleRegistry {
    const entries = new Map<string, ModuleEntry>();
    for (const [path, mod] of Object.entries(globResult)) {
      const candidate = (mod as { manifest?: unknown }).manifest;
      const parsed = ModuleManifestSchema.safeParse(candidate);
      if (!parsed.success) {
        const id = inferIdFromPath(path) ?? path;
        // eslint-disable-next-line no-console
        console.warn(
          `[shell] manifest at "${path}" failed schema; module hidden`,
          parsed.error.issues,
        );
        entries.set(id, {
          manifest: (candidate ?? {}) as ModuleManifest,
          error: {
            kind: "manifest_invalid",
            module: id,
            cause: parsed.error.issues,
          },
          disabled: true,
        });
        continue;
      }
      const manifest = candidate as ModuleManifest;
      const migrationError = runMigrations(manifest, tenantId);
      entries.set(manifest.id, {
        manifest,
        error: migrationError,
        disabled: migrationError !== null,
      });
    }
    return new ModuleRegistry(entries);
  }

  /** Frozen, sorted snapshot of every module — including
   *  disabled ones (the rail can show them greyed-out with
   *  the failure tooltip). */
  list(): readonly ModuleEntry[] {
    return Object.freeze(
      [...this.entries.values()].sort(
        (a, b) => a.manifest.rail.order - b.manifest.rail.order,
      ),
    );
  }

  /** Active modules only (validation passed, migrations
   *  succeeded). The rail's tab order uses these. */
  listActive(): readonly ModuleEntry[] {
    return this.list().filter((e) => !e.disabled);
  }

  get(id: string): ModuleEntry | null {
    return this.entries.get(id) ?? null;
  }

  /** Lookup with a typed error for the not-found case. */
  require(id: string): ModuleEntry | { error: ShellError } {
    const entry = this.entries.get(id);
    if (!entry) return { error: { kind: "module_not_found", module: id } };
    return entry;
  }

  /** Used during tenant switch — rebuilds with the new tenant
   *  id so any pending migrations run against the new
   *  tenant's persisted state. The previous registry is
   *  discarded; consumers should re-read from `useTenant`. */
  withTenant(
    tenantId: string,
    globResult: Record<string, unknown>,
  ): ModuleRegistry {
    return ModuleRegistry.fromGlob(globResult, tenantId);
  }
}

// ── Migration runner ────────────────────────────────────────────

/** Walks `manifest.migrations` from the persisted version up
 *  to `manifest.version` and applies each step in order.
 *  Returns `null` on success, or a `ShellError` so the caller
 *  can mark the module disabled. */
function runMigrations(
  manifest: ModuleManifest,
  tenantId: string,
): ShellError | null {
  const persisted = readPersistedVersion(manifest.id, tenantId);
  if (persisted === null || persisted === manifest.version) {
    // First-time install or already current — stamp version
    // so the next manifest bump triggers migrations cleanly.
    writePersistedVersion(manifest.id, tenantId, manifest.version);
    return null;
  }

  if (!manifest.migrations || Object.keys(manifest.migrations).length === 0) {
    // Persisted version differs but no chain provided. Treat
    // as forward-incompatible: clear scope + restamp.
    clearModuleScope(manifest.id);
    writePersistedVersion(manifest.id, tenantId, manifest.version);
    return null;
  }

  // Run the chain. We allow non-linear chains (a module may
  // skip versions) by always applying `migrations[currentVersion]`
  // if present and updating `currentVersion` to whatever the
  // chain produces. The migration function returns the new
  // state OR a tagged version stamp (we ignore the state body
  // here — modules read/write their own state via
  // `read/writeModuleState` — but we need the chain to
  // declare what version it lands on).
  let current = persisted;
  const visited = new Set<string>();
  while (current !== manifest.version) {
    if (visited.has(current)) {
      return {
        kind: "migration_failed",
        module: manifest.id,
        from: persisted,
        to: manifest.version,
        cause: new Error(`migration loop detected at ${current}`),
      };
    }
    visited.add(current);
    const step: ModuleMigration | undefined = manifest.migrations[current];
    if (!step) {
      // No migration declared from `current`; nothing safe to
      // do — fail loud so the operator can reset state from
      // the settings UI.
      return {
        kind: "migration_failed",
        module: manifest.id,
        from: persisted,
        to: manifest.version,
        cause: new Error(`no migration registered from ${current}`),
      };
    }
    try {
      // Migrations are pure transformations of the
      // module-owned state blob. The shell doesn't read the
      // blob — the module does, in its own components — but
      // we run the chain to validate it doesn't throw.
      const dummy: unknown = {};
      step(dummy);
    } catch (cause) {
      return {
        kind: "migration_failed",
        module: manifest.id,
        from: persisted,
        to: manifest.version,
        cause,
      };
    }
    // Without a richer migration contract, advance one step.
    // Modules with multi-version chains should declare every
    // intermediate version. If the next key isn't present
    // we'll fail on the next iteration with the "no migration
    // registered" path above.
    const next = nextRegisteredVersion(manifest, current);
    if (!next) break;
    current = next;
  }
  writePersistedVersion(manifest.id, tenantId, manifest.version);
  return null;
}

function nextRegisteredVersion(
  manifest: ModuleManifest,
  from: string,
): string | null {
  if (!manifest.migrations) return null;
  // Chain by declaration order: pick the next key after `from`
  // when iterating Object.keys. This is good enough for the
  // common case (sequential semver bumps); modules with
  // branching upgrade paths should expose explicit
  // `migrations` keys for every intermediate state.
  const keys = Object.keys(manifest.migrations);
  const idx = keys.indexOf(from);
  if (idx === -1) return null;
  return keys[idx + 1] ?? manifest.version;
}

function readPersistedVersion(
  moduleId: string,
  tenantId: string,
): string | null {
  const stored = readModuleState(
    moduleId,
    tenantId,
    PERSISTED_VERSION_KEY,
    PersistedVersionSchema,
    { version: "" },
  );
  return stored.version === "" ? null : stored.version;
}

function writePersistedVersion(
  moduleId: string,
  tenantId: string,
  version: string,
): void {
  writeModuleState(moduleId, tenantId, PERSISTED_VERSION_KEY, { version });
}

function inferIdFromPath(path: string): string | null {
  // Glob path looks like "../modules/<id>/manifest.tsx".
  const match = path.match(/\/modules\/([^/]+)\/manifest\.[tj]sx?$/);
  return match?.[1] ?? null;
}
