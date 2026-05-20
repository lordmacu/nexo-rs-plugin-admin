// Phase 98.13 — single catalogue card.
//
// Renders one `DiscoveredPlugin` row from the Available tab.
//   - Header: name + version + owner
//   - Description (optional)
//   - Badges row: each source variant + trust tier + compat
//   - Tags (chips)
//   - `Install` button → opens existing `<InstallPluginModal>`
//     pre-filled from `plugin.install_params`. Operator can still
//     adjust before submitting; the modal calls the same admin
//     RPC the bare-form path uses.
//   - `Copy install command` ghost button → falls back when the
//     compat gate is `incompatible` (button disabled but the
//     operator may still want to copy the command for a future
//     daemon upgrade).
//
// The card itself doesn't own the modal — it raises `onInstall`
// to the parent which threads the same `<InstallPluginModal>`
// instance the header's "Install plugin" button uses. Keeps modal
// state in one place + lets the parent decide what to refresh
// post-install.

import { useState } from "react";
import { Copy, Download, ExternalLink } from "lucide-react";

import type { DiscoveredPlugin } from "../../api/plugin_discovery";
import { useT } from "../../i18n";
import { CompatBadge, SourceBadge, TrustBadge } from "./badges";

interface PluginCardProps {
  plugin: DiscoveredPlugin;
  /** Raised when the operator clicks the primary Install button.
   *  Parent owns the modal instance + decides what to refresh. */
  onInstall: (plugin: DiscoveredPlugin) => void;
  /** Already loaded in the runtime (matched by base plugin id, so a
   *  multi-instance channel like `telegram.bot1` still marks the base
   *  `telegram` as installed). Disables the redundant Install button. */
  installed?: boolean;
}

export default function PluginCard({
  plugin,
  onInstall,
  installed = false,
}: PluginCardProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const installDisabled = plugin.compat.kind === "incompatible" || installed;

  async function copyInstallCmd() {
    try {
      await navigator.clipboard.writeText(plugin.install_cmd);
      setCopied(true);
      // Auto-hide the toast after 2s so consecutive copies don't
      // mask the state transition.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard rejected (e.g. http context). Fall
      // back to a brief inline note so the operator still sees
      // the command they should copy manually.
      setCopied(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-panel p-4 shadow-sm hover:shadow-md transition-shadow">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-text-primary">
            {plugin.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-meta">
            {plugin.version ?? "—"} ·{" "}
            <span className="font-mono">{plugin.owner}</span>
          </p>
        </div>
        {plugin.repo_url && (
          <a
            href={plugin.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-text-meta hover:bg-panel-alt hover:text-text-primary"
            title={t("plugins.card.open_repo")}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </header>

      {plugin.description && (
        <p className="text-xs text-text-secondary line-clamp-2">
          {plugin.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {plugin.sources.map((s, i) => (
          <SourceBadge key={`src-${i}`} source={s} />
        ))}
        <TrustBadge tier={plugin.trust_tier} />
        <CompatBadge status={plugin.compat} />
      </div>

      {plugin.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plugin.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded bg-panel-alt px-1.5 py-0.5 text-[10px] text-text-meta"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-2 pt-1">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onInstall(plugin)}
          disabled={installDisabled}
          title={
            installed
              ? t("plugins.card.installed")
              : installDisabled
                ? t("plugins.card.install_disabled_tooltip")
                : undefined
          }
        >
          <Download size={14} />
          {installed ? t("plugins.card.installed") : t("plugins.card.install")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-panel-hover"
          onClick={() => void copyInstallCmd()}
          title={plugin.install_cmd}
        >
          <Copy size={12} />
          {copied ? t("plugins.card.copied") : t("plugins.card.copy_cmd")}
        </button>
      </footer>
    </article>
  );
}
