// M7.search.fts — server-side FTS search over the SQLite firehose.
//
// Bridges to `nexo/admin/agent_events/search` (Phase 82.11
// shipped framework-side). The sidebar's local in-memory filter
// (M7.search.local) only sees the 200 newest conversations;
// older chats are invisible until the operator opens this modal
// and types a query that hits the daemon's FTS5 index.
//
// Flow:
// 1. Modal opens → fetch agents.list (cached per session via
// Zustand or just on every open — agents.list is cheap).
// 2. Operator picks an agent (dropdown skipped for 1-agent
// deployments).
// 3. Types query → debounced (250 ms) → POST search.
// 4. Hits render with snippet highlighting (`[match]` →
// <mark>) and a"Ir al chat"link that navigates via
// pushState + popstate (same trick CmdK uses).

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminCall } from "../../api/admin";
import { Button, Input, Select } from "../../components/ui";
import { useT } from "../../i18n";

interface AgentSummary {
  id: string;
  name?: string;
  active: boolean;
}

interface AgentsListResponse {
  agents: AgentSummary[];
}

interface SearchHit {
  session_id: string;
  timestamp_ms: number;
  role: "user" | "assistant" | "tool";
  source_plugin: string;
  snippet: string;
}

interface SearchResponse {
  hits: SearchHit[];
}

const DEBOUNCE_MS = 250;
const RESULT_LIMIT = 50;

export interface SearchHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchHistoryModal({
  open,
  onClose,
}: SearchHistoryModalProps) {
  const t = useT();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [agent_id, setAgentId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load agents once when the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setHits(null);
    setQuery("");
    if (agents !== null) return;
    void (async () => {
      try {
        const res = await adminCall<AgentsListResponse>(
          "nexo/admin/agents/list",
          { active_only: false },
        );
        setAgents(res.agents);
        if (res.agents.length === 1) setAgentId(res.agents[0]!.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [open, agents]);

  // Focus the search input on open.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced server search.
  useEffect(() => {
    if (!open) return;
    if (!agent_id || query.trim().length < 2) {
      setHits(null);
      return;
    }
    const t = window.setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await adminCall<SearchResponse>(
          "nexo/admin/agent_events/search",
          {
            agent_id,
            query,
            kind: "transcript_appended",
            limit: RESULT_LIMIT,
          },
        );
        setHits(res.hits);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [agent_id, query, open]);

  if (!open) return null;

  function navigate_to_session(hit: SearchHit) {
    // The sidebar's conversation key is `${agent_id}::${channel}::${contact_id}`
    // for live chats. The session_id from FTS is a transcript
    // session uuid — for v1 we navigate to the session-keyed
    // route the firehose store understands. Sidebar will surface
    // the live conversation if the SQLite firehose still holds
    // it; otherwise the chat panel renders the historical
    // session via its own backfill.
    const target = `/chat/${encodeURIComponent(`session::${hit.session_id}`)}`;
    navigate(target);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label={t("chat.search_history.dialog_aria")}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] bg-white rounded-lg shadow-xl border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search size={16} className="text-text-secondary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chat.search_history.placeholder")}
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            aria-label={t("chat.search_history.close_aria")}
          >
            <X size={16} />
          </Button>
        </div>

        {agents && agents.length > 1 && (
          <div className="px-4 py-2 border-b bg-panel-alt/50">
            <label className="text-xs text-text-secondary mr-2">
              {t("chat.search_history.agent_label")}
            </label>
            <Select
              value={agent_id}
              onChange={(e) => setAgentId(e.target.value)}
              className="bg-white border rounded px-2 py-1 text-sm"
            >
              <option value="">{t("chat.search_history.agent_choose")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.id}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50">
              {error}
            </div>
          )}
          {!error && agents === null && (
            <div className="px-4 py-6 text-sm text-text-meta text-center">
              {t("chat.search_history.loading_agents")}
            </div>
          )}
          {!error && agents !== null && !agent_id && (
            <div className="px-4 py-6 text-sm text-text-meta text-center">
              {t("chat.search_history.pick_agent")}
            </div>
          )}
          {!error && agent_id && query.trim().length < 2 && (
            <div className="px-4 py-6 text-sm text-text-meta text-center">
              {t("chat.search_history.min_chars")}
            </div>
          )}
          {!error && busy && (
            <div className="px-4 py-6 text-sm text-text-meta text-center">
              {t("chat.search_history.searching")}
            </div>
          )}
          {!error && hits !== null && !busy && hits.length === 0 && (
            <div className="px-4 py-6 text-sm text-text-meta text-center">
              {t("chat.search_history.no_results", { query })}
            </div>
          )}
          {!error && hits !== null && hits.length > 0 && (
            <ul role="listbox">
              {hits.map((hit, idx) => (
                <SearchHitRow
                  key={`${hit.session_id}-${hit.timestamp_ms}-${idx}`}
                  hit={hit}
                  onClick={() => navigate_to_session(hit)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchHitRow({
  hit,
  onClick,
}: {
  hit: SearchHit;
  onClick: () => void;
}) {
  const t = useT();
  const date = useMemo(() => {
    const d = new Date(hit.timestamp_ms);
    return d.toLocaleString();
  }, [hit.timestamp_ms]);
  return (
    <li
      role="option"
      onClick={onClick}
      className="px-4 py-3 border-b /60 cursor-pointer hover:bg-panel-alt"
    >
      <div className="flex items-center justify-between text-xs text-text-meta mb-1">
        <span>
          {t("chat.search_history.hit_via", {
            role: hit.role,
            plugin: hit.source_plugin,
          })}
        </span>
        <span>{date}</span>
      </div>
      <div
        className="text-sm text-text-primary"
        // Server emits `[match]` brackets for highlights; render
        // as <mark> tags. Body is already redacted server-side
        // (FTS index runs over the redacted body), so injection
        // surface is the snippet text we trust.
        dangerouslySetInnerHTML={{
          __html: highlight_snippet(hit.snippet),
        }}
      />
    </li>
  );
}

/** Convert `[token]` highlight markers to `<mark>token</mark>`.
 * Escapes other HTML special chars first to neutralise any
 * bracket-adjacent markup that could close the mark. */
function highlight_snippet(raw: string): string {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // The brackets we just escaped become &lt;…&gt; — but the
  // server's `[match]` brackets stay as literal `[` / `]` after
  // escaping (they're not HTML brackets). Match them now.
  return escaped.replace(/\[([^\[\]]+)\]/g, "<mark>$1</mark>");
}
