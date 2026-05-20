// Phase 97.1 — install plugin from admin UI.
//
// Form fields:
//   - crate_name (required) — slug `[a-z0-9_-]+`
//   - version (optional) — semver-ish `[0-9A-Za-z.+-]+`; required
//     for Release source (we don't auto-resolve "latest" on the
//     GitHub API path).
//   - repo (optional) — `org/name`. Defaults to
//     `lordmacu/<crate_name>` server-side.
//   - source — `release` (default, zero-toolchain prebuilt binary
//     download) or `cargo` (compiles via `cargo install` —
//     requires rustc on the daemon host).
//
// On success: the daemon writes the plugin binary under
// `plugins.discovery.search_paths[0]` (Release) or
// `~/.cargo/bin/` (Cargo). Phase 97.1.α leaves activation as a
// daemon restart — banner explains. Phase 97.1.β will integrate
// the scan + hot-spawn loop so this modal closes with the new
// plugin already live.
//
// All inputs are validated client-side AND server-side; server
// rejects anything that doesn't match the char class with a
// -32602 InvalidParams the modal renders inline.

import { useState } from "react";
import { AlertTriangle, Download, X } from "lucide-react";

import { adminCall } from "../../api/admin";
import { useT } from "../../i18n";

type Source = "release" | "cargo";

/** Phase 98.13 — pre-fill payload from a catalogue click. Each
 *  field is optional; unset fields fall back to the empty form.
 *  `exactOptionalPropertyTypes` is on so `| undefined` is explicit. */
export interface InstallModalInitialValues {
  crate_name?: string | undefined;
  version?: string | undefined;
  repo?: string | undefined;
  source?: Source | undefined;
  force?: boolean | undefined;
}

interface Props {
  onClose: () => void;
  onInstalled: () => void;
  /** Phase 98.13 — when present, the modal opens with these fields
   *  pre-populated. Operator can still adjust before submitting. */
  initialValues?: InstallModalInitialValues | undefined;
}

interface InstallResponse {
  crate_name: string;
  installed_version: string | null;
  spawned: string[];
  cargo_stdout: string;
  cargo_stderr: string;
}

const CRATE_NAME_RX = /^[a-z0-9_-]+$/;
const VERSION_RX = /^[0-9A-Za-z.+-]+$/;
const REPO_RX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export default function InstallPluginModal({
  onClose,
  onInstalled,
  initialValues,
}: Props) {
  const t = useT();
  const [crateName, setCrateName] = useState(initialValues?.crate_name ?? "");
  const [version, setVersion] = useState(initialValues?.version ?? "");
  const [repo, setRepo] = useState(initialValues?.repo ?? "");
  const [source, setSource] = useState<Source>(initialValues?.source ?? "release");
  const [force, setForce] = useState(initialValues?.force ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstallResponse | null>(null);

  const crateNameOk = CRATE_NAME_RX.test(crateName);
  const versionOk = version === "" || VERSION_RX.test(version);
  const repoOk = repo === "" || REPO_RX.test(repo);
  // Release source needs an explicit version — the daemon doesn't
  // query GitHub's "latest release" endpoint to stay hermetic.
  const releaseVersionRequired = source === "release" && version.trim() === "";
  const canSubmit =
    crateNameOk &&
    versionOk &&
    repoOk &&
    !releaseVersionRequired &&
    !busy &&
    crateName.length > 0;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const params: Record<string, unknown> = {
        crate_name: crateName,
        source,
        force,
      };
      if (version.trim() !== "") params.version = version.trim();
      if (repo.trim() !== "") params.repo = repo.trim();
      const res = await adminCall<InstallResponse>(
        "nexo/admin/plugins/install",
        params,
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <Download size={18} />
            {t("plugins.install.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover"
            onClick={onClose}
            aria-label="close"
          >
            <X size={16} />
          </button>
        </header>

        {result === null ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t("plugins.install.subtitle")}
            </p>

            {/* Source picker. Release default. */}
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium uppercase text-text-meta">
                {t("plugins.install.source_label")}
              </legend>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  value="release"
                  checked={source === "release"}
                  onChange={() => setSource("release")}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium text-text-primary">
                    {t("plugins.install.source_release")}
                  </span>
                  <span className="block text-xs text-text-meta">
                    {t("plugins.install.source_release_hint")}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  value="cargo"
                  checked={source === "cargo"}
                  onChange={() => setSource("cargo")}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium text-text-primary">
                    {t("plugins.install.source_cargo")}
                  </span>
                  <span className="block text-xs text-text-meta">
                    {t("plugins.install.source_cargo_hint")}
                  </span>
                </span>
              </label>
            </fieldset>

            <label className="block">
              <span className="block text-xs font-medium text-text-secondary mb-1">
                {t("plugins.install.crate_name")} *
              </span>
              <input
                type="text"
                value={crateName}
                onChange={(e) =>
                  setCrateName(e.target.value.toLowerCase().trim())
                }
                placeholder="nexo-plugin-telegram"
                className="w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-mono"
              />
              {!crateNameOk && crateName !== "" && (
                <span className="block mt-1 text-xs text-danger">
                  {t("plugins.install.crate_name_invalid")}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-text-secondary mb-1">
                {t("plugins.install.version")}
                {source === "release" ? " *" : ""}
              </span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value.trim())}
                placeholder="v0.3.0"
                className="w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-mono"
              />
              {!versionOk && (
                <span className="block mt-1 text-xs text-danger">
                  {t("plugins.install.version_invalid")}
                </span>
              )}
              {releaseVersionRequired && (
                <span className="block mt-1 text-xs text-amber-700">
                  {t("plugins.install.version_required_release")}
                </span>
              )}
            </label>

            {source === "release" && (
              <label className="block">
                <span className="block text-xs font-medium text-text-secondary mb-1">
                  {t("plugins.install.repo")}
                </span>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value.trim())}
                  placeholder={`lordmacu/${
                    crateName.length > 0 ? crateName : "nexo-rs-plugin-X"
                  }`}
                  className="w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-mono"
                />
                {!repoOk && (
                  <span className="block mt-1 text-xs text-danger">
                    {t("plugins.install.repo_invalid")}
                  </span>
                )}
                <span className="block mt-1 text-xs text-text-meta">
                  {t("plugins.install.repo_hint")}
                </span>
              </label>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              <span>
                {t("plugins.install.force")} —{" "}
                <span className="text-xs text-text-meta">
                  {source === "cargo"
                    ? t("plugins.install.force_cargo_hint")
                    : t("plugins.install.force_release_hint")}
                </span>
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded border border-danger-soft bg-danger-soft p-3 text-sm text-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm hover:bg-panel-hover"
                onClick={onClose}
                disabled={busy}
              >
                {t("plugins.install.cancel")}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                onClick={() => void submit()}
                disabled={!canSubmit}
              >
                <Download size={14} />
                {busy
                  ? t("plugins.install.installing")
                  : t("plugins.install.submit")}
              </button>
            </div>
          </div>
        ) : (
          // Success view.
          <div className="space-y-4">
            <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              <p className="font-medium">
                {t("plugins.install.success_heading", {
                  crate: result.crate_name,
                  version: result.installed_version ?? "(?)",
                })}
              </p>
              <p className="mt-1 text-xs text-green-800">
                {t("plugins.install.success_restart_required")}
              </p>
              {result.spawned.length > 0 && (
                <p className="mt-1 text-xs text-green-800">
                  {t("plugins.install.success_spawned", {
                    ids: result.spawned.join(", "),
                  })}
                </p>
              )}
            </div>

            {result.cargo_stdout && (
              <details className="text-xs">
                <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
                  {t("plugins.install.cargo_stdout")}
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-panel-alt p-2 font-mono">
                  {result.cargo_stdout}
                </pre>
              </details>
            )}
            {result.cargo_stderr && (
              <details className="text-xs">
                <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
                  {t("plugins.install.cargo_stderr")}
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-panel-alt p-2 font-mono">
                  {result.cargo_stderr}
                </pre>
              </details>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                onClick={onInstalled}
              >
                {t("plugins.install.done")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
