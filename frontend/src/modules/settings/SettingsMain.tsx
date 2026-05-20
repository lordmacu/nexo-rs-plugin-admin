// Phase 90.3.20 — settings module main panel. V1 surface:
//   - Auth rotate button (Phase 82.10.o capability)
//   - Read-only "deferred features" notes for broker config /
//     system info — those land when the matching admin RPCs do.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Key, ShieldAlert, Puzzle, ChevronRight } from "lucide-react";

import { rotateAuthToken } from "../../api/settings";
import { useT } from "../../i18n";

export default function SettingsMain() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; hash: string }
    | { kind: "err"; message: string }
    | null
  >(null);

  const handleRotate = async () => {
    if (!window.confirm(t("settings.auth.rotate_confirm"))) return;
    setBusy(true);
    setFeedback(null);
    try {
      const ack = await rotateAuthToken();
      setFeedback({ kind: "ok", hash: ack.new_token_hash ?? "—" });
    } catch (e) {
      setFeedback({
        kind: "err",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("settings.title")}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {/* Phase 99 — Plugins sub-link */}
        <Link
          to="plugins"
          className="mb-6 flex items-center gap-2 rounded-lg border bg-panel p-4 hover:border-accent"
        >
          <Puzzle size={16} className="text-text-secondary" />
          <div className="flex-1">
            <h2 className="text-sm font-bold text-text-primary">
              {t("settings.plugins.nav")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("settings.plugins.subtitle")}
            </p>
          </div>
          <ChevronRight size={16} className="text-text-secondary" />
        </Link>

        {/* Auth rotate panel */}
        <section className="mb-6 rounded-lg border bg-panel p-4">
          <div className="mb-2 flex items-center gap-2 text-text-primary">
            <Key size={16} />
            <h2 className="text-sm font-bold">
              {t("settings.auth.title")}
            </h2>
          </div>
          <p className="mb-3 text-xs text-text-secondary">
            {t("settings.auth.subtitle")}
          </p>
          <button
            type="button"
            className="rounded bg-warning px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => void handleRotate()}
            disabled={busy}
          >
            {busy
              ? t("settings.auth.rotating")
              : t("settings.auth.action.rotate")}
          </button>
          {feedback?.kind === "ok" && (
            <div className="mt-3 rounded bg-success-soft px-3 py-2 text-xs text-success">
              {t("settings.auth.rotated", { hash: feedback.hash })}
            </div>
          )}
          {feedback?.kind === "err" && (
            <div className="mt-3 flex items-start gap-2 rounded bg-danger-soft px-3 py-2 text-xs text-danger">
              <ShieldAlert size={14} className="mt-0.5" />
              <span>{feedback.message}</span>
            </div>
          )}
        </section>

        {/* Deferred features placeholder */}
        <section className="rounded-lg border bg-panel p-4">
          <h2 className="mb-2 text-sm font-bold text-text-primary">
            {t("settings.system.title")}
          </h2>
          <p className="text-xs text-text-secondary">
            {t("settings.system.deferred_note")}
          </p>
        </section>
      </div>
    </div>
  );
}
