// Cross-component date / number formatters. Pure
// helpers; no side effects, no live data dependency.

/** Human-readable relative timestamp ("3m" / "2h" /
 *  "5d" / "2sem"). Returns "ahora" when the ms is
 *  within the past minute. */
export function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}
