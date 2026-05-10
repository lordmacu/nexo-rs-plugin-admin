// Phase 90.x.mcp — `mcp_servers` module main panel.
// LIVE in Phase 90.x.mcp (was placeholder in 90.3.19).

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

import { useMcpServers } from "../../store/mcp_servers";
import { useT } from "../../i18n";
import McpServerCreateModal from "./McpServerCreateModal";

export default function McpServersMain() {
  const t = useT();
  const { servers, isLoading, error, reload, remove } = useMcpServers();
  const [showCreate, setShowCreate] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);

  useEffect(() => {
    if (servers.length === 0 && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(t("mcp_servers.delete.confirm", { name }))) return;
    setBusyName(name);
    try {
      await remove(name);
    } finally {
      setBusyName(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("mcp_servers.title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded p-1.5 text-text-secondary hover:bg-panel-hover"
            onClick={() => void reload()}
            disabled={isLoading}
            title={t("mcp_servers.action.reload")}
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
            {t("mcp_servers.action.create")}
          </button>
        </div>
      </header>
      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-4 text-xs text-text-secondary">
          {t("mcp_servers.subtitle")}
        </p>
        <section className="rounded-lg border bg-panel">
          {servers.length === 0 && !isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-text-secondary">
              {t("mcp_servers.empty.body")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-text-meta">
                <tr>
                  <th className="px-4 py-2 text-left">
                    {t("mcp_servers.col.name")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("mcp_servers.col.transport")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("mcp_servers.col.log_level")}
                  </th>
                  <th className="px-4 py-2 text-right">
                    {t("mcp_servers.col.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => {
                  const busy = busyName === s.name;
                  return (
                    <tr
                      key={s.name}
                      className="border-b hover:bg-panel-hover"
                    >
                      <td className="px-4 py-2 font-mono text-xs">{s.name}</td>
                      <td className="px-4 py-2">
                        <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
                          {s.transport}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-text-meta">
                        {s.log_level ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="rounded p-1.5 text-text-secondary hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                          onClick={() => void handleDelete(s.name)}
                          disabled={busy}
                          title={t("mcp_servers.action.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {showCreate && (
        <McpServerCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
