// M7.cmdk.fuzzy — tiny fzf-flavoured ranker for the command
// palette. No external deps; ~80 LOC. Designed for ≤ 1k entries
// (every-action-rows); not optimised for huge corpora.
//
// Score interpretation (higher = better; null = no match):
//   1.00  exact (after normalisation)
//   0.95  starts with the query
//   0.85  contiguous substring anywhere
//   0.10–0.50  subsequence — characters appear in order, density-
//              weighted. Tighter clusters win.
//
// Tie-break is shorter labels first so "Logout" beats "Logout
// from this account" on a "log" query.

import { normalize } from "./searchMatch";

export interface RankedItem<T> {
  item: T;
  score: number;
}

/** Score a single label against `query`. Returns `null` when no
 *  subsequence match exists. Pre-normalises both inputs. */
export function fuzzyScore(query: string, label: string): number | null {
  const q = normalize(query.trim());
  if (q.length === 0) return 0.5; // empty query → neutral
  const l = normalize(label);
  if (q === l) return 1;
  if (l.startsWith(q)) return 0.95;
  if (l.includes(q)) return 0.85;
  // Subsequence match: every char of q appears in l in order.
  let li = 0;
  let first_match = -1;
  let last_match = -1;
  for (const ch of q) {
    li = l.indexOf(ch, li);
    if (li < 0) return null;
    if (first_match < 0) first_match = li;
    last_match = li;
    li++;
  }
  // Density: shorter span between first and last match → tighter
  // (and more likely a meaningful hit). `span` ≥ q.length always.
  const span = last_match - first_match + 1;
  const density = q.length / span; // 1 = perfect contiguous, → 0 = scattered
  // Map density into the 0.1–0.5 band so subsequence is always
  // weaker than substring.
  return 0.1 + density * 0.4;
}

/** Filter + sort `items` by `fuzzyScore(query, label_of(item))`.
 *  Items scoring `null` are dropped. Sort is descending by
 *  score, tie-broken by label length (shorter first). */
export function fuzzyRank<T>(
  items: readonly T[],
  query: string,
  label_of: (item: T) => string,
): T[] {
  if (query.trim().length === 0) return [...items];
  const ranked: Array<{ item: T; score: number; len: number }> = [];
  for (const item of items) {
    const label = label_of(item);
    const score = fuzzyScore(query, label);
    if (score === null) continue;
    ranked.push({ item, score, len: label.length });
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.len - b.len;
  });
  return ranked.map((r) => r.item);
}
