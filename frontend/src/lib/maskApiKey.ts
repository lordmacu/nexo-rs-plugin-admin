// Phase 90.3.15 — port of `research/src/utils/mask-api-key.ts:1-15`
// (OpenClaw). Tiered masking: tiny keys mask 1+1, medium 2+2,
// long keys 8+8. Used in toast confirmations after rotate so the
// operator gets visual confirmation without exposing the secret.

export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "missing";
  if (trimmed.length <= 6) {
    return `${trimmed.slice(0, 1)}…${trimmed.slice(-1)}`;
  }
  if (trimmed.length <= 16) {
    return `${trimmed.slice(0, 2)}…${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-8)}`;
}
