// Contact-label formatter. The framework's `TranscriptAppendedEvent`
// currently only carries the channel-native `sender_id` (e.g.
// `573154645370@s.whatsapp.net`). Until the daemon also forwards the
// peer's display name (push name on WhatsApp — tracked in FOLLOWUPS),
// we coerce the JID into a country-code-aware phone number so the
// header reads "+57 315 464 5370" instead of "5731...@s.whatsapp.net".
//
// We only format when the input *looks* like a JID — anything else
// (UUID session_ids, telegram chat ids, email addresses) is returned
// untouched so we don't mangle non-WhatsApp identifiers.

export function isWhatsappJid(s: string): boolean {
  return s.endsWith("@s.whatsapp.net") || s.endsWith("@g.us");
}

// Country dial codes we group spaces for. Falls through to a single
// "+<digits>" group when the country isn't in the table.
const DIAL_GROUPS: Record<string, number[]> = {
  "57": [3, 3, 4], // Colombia: +57 315 464 5370
  "1": [3, 3, 4], // US/CA
  "52": [3, 3, 4], // Mexico
  "34": [3, 3, 3], // Spain
  "44": [4, 6], // UK (rough)
  "55": [2, 5, 4], // Brazil
  "54": [2, 4, 4], // Argentina
};

function formatDigits(digits: string): string {
  for (const cc of Object.keys(DIAL_GROUPS).sort(
    (a, b) => b.length - a.length,
  )) {
    if (digits.startsWith(cc)) {
      const groups = DIAL_GROUPS[cc];
      const rest = digits.slice(cc.length);
      const parts: string[] = [];
      let i = 0;
      for (const g of groups) {
        if (i >= rest.length) break;
        parts.push(rest.slice(i, i + g));
        i += g;
      }
      if (i < rest.length) parts.push(rest.slice(i));
      return `+${cc} ${parts.join(" ")}`;
    }
  }
  return `+${digits}`;
}

/** Format a WhatsApp JID into a humane phone label. Returns the
 *  raw input when it isn't recognized as a JID. */
export function formatContactLabel(raw: string): string {
  if (!isWhatsappJid(raw)) return raw;
  // group JIDs (`<group_id>@g.us`) don't carry a phone number — keep
  // the raw id for now so operators can still recognize them.
  if (raw.endsWith("@g.us")) return raw.replace("@g.us", " (grupo)");
  const digits = raw.slice(0, raw.indexOf("@")).replace(/\D/g, "");
  if (digits.length === 0) return raw;
  return formatDigits(digits);
}
