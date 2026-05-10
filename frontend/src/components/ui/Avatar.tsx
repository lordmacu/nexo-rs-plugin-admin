// Avatar — circular initials with deterministic color
// halo derived from the seed (sender id, lead id, agent
// id). Replaces the bespoke initial-circle pattern in
// LeadContextPanel + ChatListItem.

const PALETTE = [
  ["bg-indigo-100", "text-indigo-700"],
  ["bg-emerald-100", "text-emerald-700"],
  ["bg-amber-100", "text-amber-700"],
  ["bg-rose-100", "text-rose-700"],
  ["bg-sky-100", "text-sky-700"],
  ["bg-violet-100", "text-violet-700"],
  ["bg-fuchsia-100", "text-fuchsia-700"],
  ["bg-teal-100", "text-teal-700"],
] as const;

/** djb2 hash → palette index. Stable: same seed always
 *  picks the same color. */
function colorForSeed(seed: string): readonly [string, string] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % PALETTE.length;
  return PALETTE[idx];
}

/** Take 1-2 leading letters per word (max 2 letters total)
 *  and uppercase them. Empty / whitespace-only input falls
 *  back to `?`. */
function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
}

export interface AvatarProps {
  /** Display name. Initials extracted from this. */
  name: string;
  /** Stable seed for color hash. Defaults to `name`. Pass
   *  a stable id (lead_id / agent_id) when the same person
   *  may be rendered with different display names. */
  seed?: string;
  /** Pixel size — defaults to `36` (sidebar list rows).
   *  Use `28` for inline mentions, `48` for context panels. */
  size?: number;
}

export default function Avatar({ name, seed, size = 36 }: AvatarProps) {
  const [bg, fg] = colorForSeed(seed ?? name);
  const fontSize = Math.max(10, Math.round(size * 0.4));
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${bg} ${fg}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
