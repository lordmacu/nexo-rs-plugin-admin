// Phase 90.3.16 — channels module main panel.
//
// Lists (agent_id, server_name) channel approval rows and lets
// the operator revoke any row. Approve flow is deferred — the
// approve admin RPC needs additional UX work (server name picker
// + allowlist editor) that's not v1 scope. Operator approves
// new channels via CLI / yaml today; revoke is the dangerous
// path so we wire it first.

import { useEffect } from "react";
import { RefreshCw, Trash2 } from "lucide-react";

import { useChannels } from "../../store/channels";
import { useT } from "../../i18n";

export default function ChannelsMain() {
  const t = useT();
  const { entries, isLoading, error, reload, revoke } = useChannels();

  useEffect(() => {
    if (entries.length === 0 && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (agent_id: string, server_name: string) => {
    if (
      !window.confirm(
        t("channels.revoke.confirm", { agent_id, server_name }),
      )
    )
      return;
    try {
      await revoke(agent_id, server_name);
    } catch {
      /* error already in state */
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("channels.title")}
        </h1>
        <button
          type="button"
          className="rounded p-1.5 text-text-secondary hover:bg-panel-hover"
          onClick={() => void reload()}
          disabled={isLoading}
          title={t("channels.action.reload")}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </header>
      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-4 text-xs text-text-secondary">
          {t("channels.subtitle")}
        </p>
        <section className="rounded-lg border bg-panel">
          {entries.length === 0 && !isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-text-secondary">
              {t("channels.empty.body")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-text-meta">
                <tr>
                  <th className="px-4 py-2 text-left">
                    {t("channels.col.agent")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("channels.col.server")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("channels.col.allowlist")}
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr
                    key={`${row.agent_id}|${row.server_name}`}
                    className="border-b hover:bg-panel-hover"
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      {row.agent_id}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {row.server_name}
                    </td>
                    <td className="px-4 py-2 text-xs text-text-secondary">
                      {row.allowlist?.length
                        ? row.allowlist.join(", ")
                        : t("channels.allowlist.all")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="rounded p-1.5 text-text-secondary hover:bg-danger-soft hover:text-danger"
                        onClick={() =>
                          void handleRevoke(row.agent_id, row.server_name)
                        }
                        title={t("channels.row.revoke")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <p className="mt-4 text-xs text-text-meta">
          {t("channels.deferred.approve_note")}
        </p>
      </div>
    </div>
  );
}
