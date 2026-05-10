// Namespaced localStorage helpers for the shell + modules.
//
// Two keyspaces:
//   shell:<key>                             ← shell-wide state (sidebar
//                                             width, last active module)
//   module:<id>:tenant:<tid>:<key>           ← module + tenant scoped
//
// Every read goes through Zod so a corrupt blob (operator
// imported a stale localStorage, browser extension wrote
// garbage, etc.) cannot crash the shell — we log + reset to
// the schema's default and continue.

import type { z } from "zod";

const SHELL_PREFIX = "shell:";
const MODULE_PREFIX = "module:";

// Keys that exist in localStorage but predate the namespaced
// scheme. Listed here so the migration runner can cherry-pick
// them when the shell first boots; never deleted automatically.
const LEGACY_KEYS = ["auth.token", "cmdk.lastQuery", "wa.theme"];

// ── Public API ──────────────────────────────────────────────────

/** Read a shell-scoped value validated through `schema`.
 *  On parse failure, logs a warning, removes the corrupt
 *  key, and returns `fallback`. */
export function readShellState<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  return readNamespaced(SHELL_PREFIX + key, schema, fallback);
}

/** Write a shell-scoped value (JSON-serialised). */
export function writeShellState<T>(key: string, value: T): void {
  writeNamespaced(SHELL_PREFIX + key, value);
}

/** Read a module + tenant scoped value. */
export function readModuleState<T>(
  moduleId: string,
  tenantId: string,
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  return readNamespaced(moduleKey(moduleId, tenantId, key), schema, fallback);
}

/** Write a module + tenant scoped value. */
export function writeModuleState<T>(
  moduleId: string,
  tenantId: string,
  key: string,
  value: T,
): void {
  writeNamespaced(moduleKey(moduleId, tenantId, key), value);
}

/** Delete every `module:*:tenant:<tenantId>:*` key. Used on
 *  tenant switch so empresa A's UI state doesn't leak into
 *  empresa B's session. */
export function clearTenantScope(tenantId: string): void {
  const suffix = `:tenant:${tenantId}:`;
  const purged: string[] = [];
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(MODULE_PREFIX) && k.includes(suffix)) {
      localStorage.removeItem(k);
      purged.push(k);
    }
  }
  if (purged.length > 0) {
    // eslint-disable-next-line no-console
    console.info(
      `[shell] cleared ${purged.length} module state keys for tenant ${tenantId}`,
    );
  }
}

/** Delete every key under a single module's namespace
 *  across every tenant. Called when a module's manifest
 *  bumps `version` past what migrations can handle. */
export function clearModuleScope(moduleId: string): void {
  const prefix = `${MODULE_PREFIX}${moduleId}:`;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

/** Returns the legacy keys present in localStorage from
 *  before the namespaced scheme. The shell preserves them
 *  through M16; a future cleanup phase can drop them. */
export function readLegacyKeys(): readonly string[] {
  return LEGACY_KEYS.filter((k) => localStorage.getItem(k) !== null);
}

// ── Internals ───────────────────────────────────────────────────

function moduleKey(moduleId: string, tenantId: string, key: string): string {
  return `${MODULE_PREFIX}${moduleId}:tenant:${tenantId}:${key}`;
}

function readNamespaced<T>(
  fullKey: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  const raw = readRaw(fullKey);
  if (raw === null) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.warn(
      `[shell] localStorage key "${fullKey}" is not JSON; resetting`,
      cause,
    );
    localStorage.removeItem(fullKey);
    return fallback;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.warn(
      `[shell] localStorage key "${fullKey}" failed schema; resetting`,
      result.error.issues,
    );
    localStorage.removeItem(fullKey);
    return fallback;
  }
  return result.data;
}

function writeNamespaced<T>(fullKey: string, value: T): void {
  try {
    localStorage.setItem(fullKey, JSON.stringify(value));
  } catch (cause) {
    // QuotaExceededError, private-mode, etc. — fail soft so
    // the shell doesn't crash. Operators can clear storage
    // manually; we surface a single warning per session.
    // eslint-disable-next-line no-console
    console.warn(`[shell] localStorage write failed for "${fullKey}"`, cause);
  }
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Same private-mode / sandboxed-iframe fail-soft.
    return null;
  }
}
