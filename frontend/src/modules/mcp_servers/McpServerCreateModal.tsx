// Phase 90.x.mcp — minimal create modal for MCP server.
// Operator picks transport (stdio / streamable_http / sse / auto)
// + provides command (stdio) or URL (http/sse/auto).

import { useState } from "react";
import { X } from "lucide-react";

import { type McpServerDetail } from "../../api/mcp_servers";
import { useMcpServers } from "../../store/mcp_servers";
import { useT } from "../../i18n";

const TRANSPORTS: McpServerDetail["transport"][] = [
  "stdio",
  "streamable_http",
  "sse",
  "auto",
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function McpServerCreateModal({ onClose, onCreated }: Props) {
  const t = useT();
  const upsert = useMcpServers((s) => s.upsert);
  const [name, setName] = useState("");
  const [transport, setTransport] =
    useState<McpServerDetail["transport"]>("stdio");
  const [command, setCommand] = useState("");
  const [argsRaw, setArgsRaw] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStdio = transport === "stdio";
  const fieldsValid =
    name.trim().length > 0 &&
    (isStdio ? command.trim().length > 0 : url.trim().length > 0);

  const handleSubmit = async () => {
    if (!fieldsValid) return;
    setBusy(true);
    setError(null);
    try {
      const detail: McpServerDetail = {
        name: name.trim(),
        transport,
        ...(isStdio
          ? {
              command: command.trim(),
              args: argsRaw
                .split(/\s+/)
                .filter((s) => s.length > 0),
            }
          : { url: url.trim() }),
      };
      await upsert(detail);
      onCreated();
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
            {t("mcp_servers.create.title")}
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
            {t("mcp_servers.create.name_label")}
          </span>
          <input
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-mcp-server"
            autoFocus
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("mcp_servers.create.transport_label")}
          </span>
          <select
            className="w-full rounded border bg-surface px-2 py-1.5 text-sm text-text-primary"
            value={transport}
            onChange={(e) =>
              setTransport(e.target.value as McpServerDetail["transport"])
            }
          >
            {TRANSPORTS.map((tr) => (
              <option key={tr} value={tr}>
                {tr}
              </option>
            ))}
          </select>
        </label>

        {isStdio ? (
          <>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
                {t("mcp_servers.create.command_label")}
              </span>
              <input
                type="text"
                className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/usr/local/bin/my-server"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
                {t("mcp_servers.create.args_label")}
              </span>
              <input
                type="text"
                className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
                value={argsRaw}
                onChange={(e) => setArgsRaw(e.target.value)}
                placeholder="--flag value --other"
              />
            </label>
          </>
        ) : (
          <label className="mb-4 block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
              {t("mcp_servers.create.url_label")}
            </span>
            <input
              type="text"
              className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/mcp"
            />
          </label>
        )}

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
            {t("mcp_servers.create.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={!fieldsValid || busy}
          >
            {busy
              ? t("mcp_servers.create.saving")
              : t("mcp_servers.create.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
