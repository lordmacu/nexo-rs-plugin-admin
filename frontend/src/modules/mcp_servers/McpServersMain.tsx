// Phase 90.3.19 — `mcp_servers` module main panel.
//
// V1 placeholder: the legacy admin-ui used a daemon-hosted
// `/api/mcp/servers` HTTP endpoint, NOT an admin RPC. For the
// plugin admin (which talks to the daemon exclusively via
// admin RPC over the broker) we need a new
// `nexo/admin/mcp/{list,upsert,delete}` family. Until that
// lands, surface the CLI fallback.

import { Plug } from "lucide-react";

import { useT } from "../../i18n";

export default function McpServersMain() {
  const t = useT();
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("mcp_servers.title")}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <section className="rounded-lg border bg-panel p-6">
          <div className="mb-3 flex items-center gap-2 text-text-primary">
            <Plug size={18} />
            <h2 className="text-base font-bold">
              {t("mcp_servers.deferred.title")}
            </h2>
          </div>
          <p className="mb-3 text-sm text-text-secondary">
            {t("mcp_servers.deferred.body")}
          </p>
          <pre className="rounded bg-panel-alt p-3 font-mono text-xs text-text-primary">
            agent mcp list
          </pre>
          <p className="mt-3 text-xs text-text-meta">
            {t("mcp_servers.deferred.followup")}
          </p>
        </section>
      </div>
    </div>
  );
}
