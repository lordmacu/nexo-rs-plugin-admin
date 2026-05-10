// Adapters that turn live API rows into the shape the
// existing UI components consume (initials / color /
// display name). Keeps the components agnostic of whether
// they're rendering mock fixtures or live API data.

import type { ConfigSeller, Person } from "../../../api/marketing";

const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#ef4444", // rose
  "#14b8a6", // teal
  "#84cc16", // lime
  "#f97316", // orange
];

/** Stable color per id — deterministic hash so the same
 *  seller always renders with the same avatar background.
 *  djb2 hash is good enough for ~10 buckets. */
export function colorForId(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33) ^ id.charCodeAt(i);
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx]!;
}

/** Two-letter initials from a person's name. Falls back
 *  to "?" when the name is empty (placeholder leads). */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase() || "?";
}

/** Live `ConfigSeller` rows are permissive — fields like
 *  `name` / `primary_email` are typed as required at the
 *  wire layer but the YAML may carry stale rows. Fall back
 *  to id when name is missing. */
export function sellerDisplayName(seller: ConfigSeller | null): string {
  if (!seller) return "(seller no encontrado)";
  return String(seller.name ?? seller.id);
}

export function sellerEmail(seller: ConfigSeller | null): string {
  if (!seller) return "";
  return String(seller.primary_email ?? "");
}

/** Live `Person` rows from `getPerson` use `primary_name`
 *  (the SDK identity store's column name). */
export function personDisplayName(person: Person | null | undefined): string {
  if (!person) return "(persona no resuelta)";
  return person.primary_name || person.primary_email || person.id;
}
