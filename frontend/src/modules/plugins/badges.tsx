// Phase 98.13 — small badge components for the Available catalogue.
//
// Three orthogonal axes:
//   - Source: where the daemon found the plugin (crates.io / GitHub
//     topic / curated index). When multiple sources contribute we
//     stamp one badge per source variant.
//   - Trust tier: derived from owner allowlist + curated-index
//     membership at the merge step in `nexo-plugin-discovery`. Never
//     enforced by the UI; it's an operator signal.
//   - Compat: result of `min_nexo_version` vs the daemon's
//     running version. Drives the install button's enabled state
//     in `<PluginCard>`.
//
// Tailwind classes follow the existing tone palette (`success` /
// `warning` / `danger` / panel-alt) so the badges blend with the
// rest of the admin UI without inventing new colors.

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Package,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import type {
  CompatStatus,
  PluginSource,
  TrustTier,
} from "../../api/plugin_discovery";
import { useT } from "../../i18n";

// ── Source badge ─────────────────────────────────────────────────

/** Render one badge per source-kind. Discriminator on
 *  `PluginSource.kind` — variant payload (`repo`) goes into the
 *  tooltip for GithubTopic. */
export function SourceBadge({ source }: { source: PluginSource }) {
  const t = useT();
  switch (source.kind) {
    case "crates_io":
      return (
        <Pill tone="orange" icon={<Package size={12} />}>
          {t("plugins.badge.source.crates_io")}
        </Pill>
      );
    case "github_topic":
      return (
        <Pill
          tone="default"
          icon={<Package size={12} />}
          title={source.repo}
        >
          {t("plugins.badge.source.github_topic")}
        </Pill>
      );
    case "curated_index":
      return (
        <Pill tone="blue" icon={<Package size={12} />}>
          {t("plugins.badge.source.curated_index")}
        </Pill>
      );
  }
}

// ── Trust tier badge ─────────────────────────────────────────────

export function TrustBadge({ tier }: { tier: TrustTier }) {
  const t = useT();
  switch (tier) {
    case "official":
      return (
        <Pill
          tone="success"
          icon={<ShieldCheck size={12} />}
          title={t("plugins.badge.trust.official_tooltip")}
        >
          {t("plugins.badge.trust.official")}
        </Pill>
      );
    case "community_indexed":
      return (
        <Pill
          tone="blue"
          icon={<Shield size={12} />}
          title={t("plugins.badge.trust.community_tooltip")}
        >
          {t("plugins.badge.trust.community")}
        </Pill>
      );
    case "unverified":
      return (
        <Pill
          tone="default"
          icon={<ShieldAlert size={12} />}
          title={t("plugins.badge.trust.unverified_tooltip")}
        >
          {t("plugins.badge.trust.unverified")}
        </Pill>
      );
  }
}

// ── Compat badge ─────────────────────────────────────────────────

export function CompatBadge({ status }: { status: CompatStatus }) {
  const t = useT();
  switch (status.kind) {
    case "compatible":
      return (
        <Pill tone="success" icon={<CheckCircle2 size={12} />}>
          {t("plugins.badge.compat.ok")}
        </Pill>
      );
    case "needs_upgrade":
      return (
        <Pill
          tone="warning"
          icon={<AlertTriangle size={12} />}
          title={t("plugins.badge.compat.needs_upgrade_tooltip", {
            required: status.required,
            current: status.current,
          })}
        >
          {t("plugins.badge.compat.needs_upgrade")}
        </Pill>
      );
    case "incompatible":
      return (
        <Pill
          tone="danger"
          icon={<XCircle size={12} />}
          title={status.reason}
        >
          {t("plugins.badge.compat.incompatible")}
        </Pill>
      );
    case "unknown":
      return (
        <Pill
          tone="default"
          icon={<HelpCircle size={12} />}
          title={t("plugins.badge.compat.unknown_tooltip")}
        >
          {t("plugins.badge.compat.unknown")}
        </Pill>
      );
  }
}

// ── shared pill primitive ────────────────────────────────────────

type PillTone = "success" | "warning" | "danger" | "blue" | "orange" | "default";

function Pill({
  tone,
  icon,
  children,
  title,
}: {
  tone: PillTone;
  icon?: ReactNode;
  children: ReactNode;
  title?: string | undefined;
}) {
  // Match palette tokens already used elsewhere in the admin UI so
  // the badges align visually with existing success/warning/danger
  // chips (e.g. install modal trust banner, scan result banner).
  const cls = (() => {
    switch (tone) {
      case "success":
        return "bg-success-soft text-success";
      case "warning":
        return "bg-warning-soft text-warning";
      case "danger":
        return "bg-danger-soft text-danger";
      case "blue":
        return "bg-blue-100 text-blue-700";
      case "orange":
        return "bg-orange-100 text-orange-700";
      case "default":
      default:
        return "bg-panel-alt text-text-secondary";
    }
  })();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}
      title={title}
    >
      {icon}
      {children}
    </span>
  );
}
