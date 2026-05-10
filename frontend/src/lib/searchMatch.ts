// Substring filter for the M7.search.local sidebar. Designed
// for ≤ 200 conversations; no debounce, no fuzzy ranking. AND
// across whitespace tokens, OR across fields, case- and
// diacritic-insensitive.

/** Lowercase + strip combining diacritic marks. `José` → `jose`. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

/**
 * Returns true when every whitespace-separated token in `query`
 * appears as a substring of at least one of `fields` (after
 * diacritic + case normalisation).
 *
 * Empty / whitespace-only `query` is a pass-through (returns
 * `true` for any input). This lets callers chain `.filter` over
 * the result without a separate "is filter active" branch.
 */
export function matchesQuery(
  query: string,
  fields: readonly string[],
): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0) return true;
  const tokens = trimmed
    .split(/\s+/)
    .map(normalize)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  const haystacks = fields.map(normalize);
  return tokens.every((token) => haystacks.some((h) => h.includes(token)));
}
