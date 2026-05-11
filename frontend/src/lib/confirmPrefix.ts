// Phase 90 audit fix — single source of truth for the "type the
// first N chars of the id to confirm" gate that destructive
// modals (RestartPlugin, RestoreSnapshot, …) use as a final
// safety check.
//
// Previously each modal computed the prefix differently:
//   - RestoreSnapshotModal: `snapshot.id.slice(0, 8)` (assumes
//     UUID always >= 8 chars)
//   - RestartPluginModal:   `pluginId.slice(0, Math.min(8, pluginId.length))`
//     (defensive against short ids)
//
// The helper is defensive by default (won't return more than
// `id.length` chars even when N is larger) so callers can drop
// the manual `Math.min` without losing the safety property.

/**
 * Compute the typed-confirmation prefix for a destructive modal.
 *
 * @param id  Identifier to derive the prefix from. Empty string
 *            is treated as no prefix needed (caller's gate
 *            should disable the typed-confirm requirement
 *            entirely in that pathological case).
 * @param n   Maximum prefix length. Defaults to 8 — long enough
 *            to disambiguate v4 UUIDs in practice without
 *            overburdening the operator. Capped at `id.length`.
 */
export function confirmPrefix(id: string, n = 8): string {
  if (id.length === 0) return "";
  return id.slice(0, Math.min(n, id.length));
}

/**
 * Returns true when the operator's typed text matches the
 * required prefix. Trims the input first so trailing whitespace
 * (common copy-paste artefact) doesn't trip the gate.
 */
export function confirmPrefixMatches(
  typed: string,
  id: string,
  n = 8,
): boolean {
  const expected = confirmPrefix(id, n);
  if (expected.length === 0) return false;
  return typed.trim() === expected;
}
