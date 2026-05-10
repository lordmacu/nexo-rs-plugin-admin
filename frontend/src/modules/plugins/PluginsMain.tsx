// Phase 90.3.18 — `plugins` module main panel.
//
// V1 is a placeholder — there is no admin RPC for plugin doctor
// output yet (the existing `agent doctor plugins` CLI walks the
// daemon's local discovery + spawn paths and prints to stdout).
// When the backend exposes `nexo/admin/plugins/list` +
// `nexo/admin/plugins/doctor`, this panel switches to a real
// table.

import { Terminal } from "lucide-react";

import { useT } from "../../i18n";

export default function PluginsMain() {
  const t = useT();
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("plugins.title")}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <section className="rounded-lg border bg-panel p-6">
          <div className="mb-3 flex items-center gap-2 text-text-primary">
            <Terminal size={18} />
            <h2 className="text-base font-bold">
              {t("plugins.deferred.title")}
            </h2>
          </div>
          <p className="mb-3 text-sm text-text-secondary">
            {t("plugins.deferred.body")}
          </p>
          <pre className="rounded bg-panel-alt p-3 font-mono text-xs text-text-primary">
            agent doctor plugins
          </pre>
          <p className="mt-3 text-xs text-text-meta">
            {t("plugins.deferred.followup")}
          </p>
        </section>
      </div>
    </div>
  );
}
