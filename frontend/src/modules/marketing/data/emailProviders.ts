// Hardcoded IMAP / SMTP defaults for the most common email
// providers. Lets the wizard / settings auto-fill host + port
// the moment the operator types an address — Gmail, Outlook,
// Yahoo, iCloud, Zoho, Fastmail cover the vast majority of
// operator deployments.
//
// When the address domain isn't in this table, the wizard
// falls back to the backend autoconfig probe
// (`POST /api/marketing/config/email_autoconfig`), which
// queries Mozilla's `autoconfig.thunderbird.net` for any
// published `<domain>` settings. That covers most corporate
// G Suite / Office365 custom domains.
//
// All entries assume implicit-TLS / TLS-on-connect (993 IMAP,
// 465 SMTP) OR STARTTLS (143 / 587). The wizard's checkbox
// flips between the two; defaults below pick the more common
// modern choice per provider.

export interface EmailProviderConfig {
  imap_host: string;
  imap_port: number;
  /** `true` ⇒ port 993 (implicit TLS); `false` ⇒ 143 + STARTTLS. */
  imap_implicit_tls: boolean;
  smtp_host: string;
  smtp_port: number;
  /** `true` ⇒ port 587 (STARTTLS); `false` ⇒ 465 (implicit TLS). */
  smtp_starttls: boolean;
  /** Operator-friendly label rendered next to the auto-fill
   *  affordance ("Detectado: Gmail · usa una App Password"). */
  label: string;
}

/** Domain → provider config. Subdomain matching is greedy:
 *  `mail.acme.com` first checks itself, then `acme.com`, etc.,
 *  before falling back to the autoconfig probe. */
const PROVIDERS: Record<string, EmailProviderConfig> = {
  "gmail.com": {
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Gmail",
  },
  "googlemail.com": {
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Gmail",
  },
  "outlook.com": {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Outlook / Microsoft 365",
  },
  "hotmail.com": {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Outlook / Hotmail",
  },
  "live.com": {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Outlook / Live",
  },
  "office365.com": {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Microsoft 365",
  },
  "yahoo.com": {
    imap_host: "imap.mail.yahoo.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.mail.yahoo.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Yahoo Mail",
  },
  "icloud.com": {
    imap_host: "imap.mail.me.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.mail.me.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "iCloud Mail",
  },
  "me.com": {
    imap_host: "imap.mail.me.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.mail.me.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "iCloud Mail",
  },
  "zoho.com": {
    imap_host: "imap.zoho.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.zoho.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Zoho Mail",
  },
  "fastmail.com": {
    imap_host: "imap.fastmail.com",
    imap_port: 993,
    imap_implicit_tls: true,
    smtp_host: "smtp.fastmail.com",
    smtp_port: 587,
    smtp_starttls: true,
    label: "Fastmail",
  },
  "protonmail.com": {
    // Proton requires Bridge — IMAP listens on 127.0.0.1:1143.
    // The wizard surfaces the hint but stays out of the way:
    // operator has to install Bridge themselves.
    imap_host: "127.0.0.1",
    imap_port: 1143,
    imap_implicit_tls: false,
    smtp_host: "127.0.0.1",
    smtp_port: 1025,
    smtp_starttls: true,
    label: "Proton (requiere Bridge)",
  },
};

/** Best-effort provider lookup keyed on the email's domain.
 *  Returns `null` when the domain isn't in the hardcoded
 *  table — caller falls back to the backend autoconfig probe.
 *
 *  Exported for unit testing the wizard's auto-fill flow. */
export function lookupEmailProvider(
  emailOrDomain: string,
): EmailProviderConfig | null {
  const at = emailOrDomain.lastIndexOf("@");
  const domain = (at >= 0 ? emailOrDomain.slice(at + 1) : emailOrDomain)
    .trim()
    .toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  // Exact match first, then walk up subdomains.
  let candidate = domain;
  for (;;) {
    const hit = PROVIDERS[candidate];
    if (hit) return hit;
    const dot = candidate.indexOf(".");
    if (dot < 0 || dot === candidate.length - 1) return null;
    const next = candidate.slice(dot + 1);
    if (!next.includes(".")) return PROVIDERS[next] ?? null;
    candidate = next;
  }
}
