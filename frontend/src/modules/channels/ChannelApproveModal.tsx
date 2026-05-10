// Phase 90.x.channels-approve — approve flow modal.
//
// Operator picks:
//   - agent_id   — dropdown of registered agents (listAgents)
//   - server_name — dropdown of registered MCP servers
//                   (listMcpServers); also accepts free-text for
//                   plugin-shipped channels (e.g. plugin:telegram:tg)
//                   that don't appear in mcp.yaml
//   - allowlist  — optional comma-separated binding indices
//                  (e.g. "0, 2, 5"); empty = all bindings allowed

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { listAgents, type AgentSummary } from "../../api/agents";
import { listMcpServers, type McpServerSummary } from "../../api/mcp_servers";
import { useChannels } from "../../store/channels";
import { useT } from "../../i18n";

interface Props {
  onClose: () => void;
  onApproved: () => void;
}

export default function ChannelApproveModal({ onClose, onApproved }: Props) {
  const t = useT();
  const approve = useChannels((s) => s.approve);
  const [agents, setAgents] = useState<readonly AgentSummary[]>([]);
  const [servers, setServers] = useState<McpServerSummary[]>([]);
  const [agentId, setAgentId] = useState("");
  const [serverName, setServerName] = useState("");
  const [allowlistRaw, setAllowlistRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [a, s] = await Promise.allSettled([
        listAgents(),
        listMcpServers(),
      ]);
      if (a.status === "fulfilled") setAgents(a.value);
      if (s.status === "fulfilled") setServers(s.value.servers ?? []);
    })();
  }, []);

  const parseAllowlist = (): number[] | null => {
    const trimmed = allowlistRaw.trim();
    if (trimmed.length === 0) return null;
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    const out: number[] = [];
    for (const p of parts) {
      const n = Number.parseInt(p, 10);
      if (Number.isNaN(n) || n < 0) return null;
      out.push(n);
    }
    return out;
  };

  const allowlistValid = allowlistRaw.trim().length === 0 || parseAllowlist() !== null;
  const canSubmit =
    agentId.trim().length > 0 &&
    serverName.trim().length > 0 &&
    allowlistValid &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const allowlist = parseAllowlist();
      await approve({
        agent_id: agentId.trim(),
        server_name: serverName.trim(),
        ...(allowlist === null ? {} : { allowlist }),
      });
      onApproved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {t("channels.approve.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("channels.approve.agent_label")}
          </span>
          {agents.length > 0 ? (
            <select
              className="w-full rounded border bg-surface px-2 py-1.5 text-sm text-text-primary"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              autoFocus
            >
              <option value="">
                {t("channels.approve.agent_placeholder")}
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="ana"
              autoFocus
            />
          )}
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("channels.approve.server_label")}
          </span>
          <input
            list="mcp-servers"
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder={t("channels.approve.server_placeholder")}
          />
          <datalist id="mcp-servers">
            {servers.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-text-meta">
            {t("channels.approve.server_hint")}
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("channels.approve.allowlist_label")}
          </span>
          <input
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
            value={allowlistRaw}
            onChange={(e) => setAllowlistRaw(e.target.value)}
            placeholder="0, 2, 5"
          />
          <span className="mt-1 block text-xs text-text-meta">
            {t("channels.approve.allowlist_hint")}
          </span>
          {!allowlistValid && (
            <span className="mt-1 block text-xs text-danger">
              {t("channels.approve.allowlist_invalid")}
            </span>
          )}
        </label>

        {error && (
          <div className="mb-4 rounded bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm text-text-secondary hover:bg-panel-hover"
            onClick={onClose}
            disabled={busy}
          >
            {t("channels.approve.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {busy
              ? t("channels.approve.saving")
              : t("channels.approve.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
