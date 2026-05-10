// Phase 90.3.17 — `memory` module main panel.
//
// V1 placeholder: no admin RPC exists yet for `memory_query` /
// `memory_snapshot`. The framework owns memory inspection via
// the SDK's `memory.recall` JSON-RPC inside the agent loop, but
// no operator-facing surface is wired. When the backend exposes
// `nexo/admin/memory/{query,snapshot}` this module switches to a
// real query form + result browser.

import { Database } from "lucide-react";

import { useT } from "../../i18n";

export default function MemoryMain() {
  const t = useT();
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("memory.title")}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <section className="rounded-lg border bg-panel p-6">
          <div className="mb-3 flex items-center gap-2 text-text-primary">
            <Database size={18} />
            <h2 className="text-base font-bold">
              {t("memory.deferred.title")}
            </h2>
          </div>
          <p className="mb-3 text-sm text-text-secondary">
            {t("memory.deferred.body")}
          </p>
          <pre className="rounded bg-panel-alt p-3 font-mono text-xs text-text-primary">
            agent memory snapshot --agent &lt;id&gt;
          </pre>
          <p className="mt-3 text-xs text-text-meta">
            {t("memory.deferred.followup")}
          </p>
        </section>
      </div>
    </div>
  );
}
