// Floating bubble UI for chatting manually with the AI bots
// WhatsApp has assigned to a paired account.
//
// Three-step flow:
// 1. Agent picker — only shown when no chat is active. When a
// chat IS selected we auto-derive the agent from its key
// (`<agent_id>:session:<uuid>`).
// 2. Bot picker — list bots assigned to the selected agent's
// paired WhatsApp instance.
// 3. Chat — manual send/receive with one bot.
//
// `agent_id` → `instance` resolution lives in
// `resolveInstance`: we call `nexo/admin/agents/get` once per
// agent and read its first `whatsapp` binding's instance label.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BotInfo,
  BotMessageRow,
  botHistory,
  listBots,
  sendToBot,
} from "../../api/bots";
import { useFirehose } from "../../store/firehose";
import { useConversations } from "../../store/conversations";
import { adminCall } from "../../api/admin";
import { Button, Textarea } from "../../components/ui";
import { useT } from "../../i18n";

interface AgentSummary {
  id: string;
  active: boolean;
  model_provider: string;
  bindings_count: number;
}

interface BindingSummary {
  plugin: string;
  instance?: string;
}

interface AgentDetail {
  id: string;
  inbound_bindings: BindingSummary[];
}

interface ChunkRow {
  key: string;
  role: "user" | "bot";
  text: string;
  at_ms: number;
}

function rowsToChunks(rows: BotMessageRow[]): ChunkRow[] {
  // Bot rows share `target_id`; keep only the latest snapshot.
  const byTarget = new Map<string, BotMessageRow>();
  for (const r of rows) {
    const k = r.target_id ?? r.msg_id;
    const prev = byTarget.get(k);
    if (!prev || r.at_ms >= prev.at_ms) byTarget.set(k, r);
  }
  return Array.from(byTarget.values())
    .sort((a, b) => a.at_ms - b.at_ms)
    .map((r) => ({
      key: r.target_id ?? r.msg_id,
      role: r.role,
      text: r.text,
      at_ms: r.at_ms,
    }));
}

/** Pull the agent id out of an active conversation key
 * (`<agent_id>:session:<uuid>` or `<agent_id>:<channel>:<contact>`). */
function agentIdFromKey(key: string | null): string | null {
  if (!key) return null;
  const colon = key.indexOf(":");
  return colon > 0 ? key.slice(0, colon) : null;
}

/** Resolve an agent id → its first WhatsApp binding's instance
 * label. Returns `null` when the agent has no whatsapp binding. */
async function resolveInstance(agent_id: string): Promise<string | null> {
  try {
    const detail = await adminCall<AgentDetail>("nexo/admin/agents/get", {
      agent_id,
    });
    const wa = detail.inbound_bindings?.find((b) => b.plugin === "whatsapp");
    return wa?.instance ?? "default";
  } catch {
    return null;
  }
}

export default function BotChatBubble() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const active_key = useConversations((s) => s.active_key);
  const presetAgent = agentIdFromKey(active_key);

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentId, setAgentId] = useState<string | null>(presetAgent);
  const [instance, setInstance] = useState<string | null>(null);
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [activeBot, setActiveBot] = useState<BotInfo | null>(null);
  const [rows, setRows] = useState<BotMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Re-derive when active chat changes (operator picks a chat
  // while the bubble is open).
  useEffect(() => {
    if (presetAgent) {
      setAgentId(presetAgent);
      setActiveBot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetAgent]);

  // Resolve instance whenever agentId changes.
  useEffect(() => {
    if (!agentId) {
      setInstance(null);
      return;
    }
    let cancelled = false;
    void resolveInstance(agentId).then((inst) => {
      if (!cancelled) setInstance(inst);
    });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Load agent list on open when no preset agent.
  async function loadAgents() {
    setErr(null);
    try {
      const res = await adminCall<{ agents: AgentSummary[] }>(
        "nexo/admin/agents/list",
        { active_only: false },
      );
      setAgents(res.agents);
    } catch (e) {
      setErr(`agents: ${(e as Error).message}`);
    }
  }
  useEffect(() => {
    if (!open) return;
    if (!agentId && agents.length === 0) void loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load bots once instance is known.
  async function refreshBots() {
    if (!instance) return;
    setErr(null);
    setBotsLoading(true);
    try {
      const resp = await listBots(instance);
      setBots(resp.bots);
      if (resp.bots.length === 1 && !activeBot) {
        setActiveBot(resp.bots[0]);
      }
    } catch (e) {
      setErr(`bots: ${(e as Error).message}`);
    } finally {
      setBotsLoading(false);
    }
  }
  useEffect(() => {
    if (!open || !instance) return;
    void refreshBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance]);

  // Live tap of the firehose so streamed bot replies append.
  const lastEventAt = useFirehose((s) => s.last_event_at_ms);
  useEffect(() => {
    if (!activeBot || !instance) return;
    let cancelled = false;
    botHistory(instance, activeBot.jid)
      .then((rs) => {
        if (!cancelled) setRows(rs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEventAt, activeBot?.jid, instance]);

  // Initial history fetch on bot select.
  useEffect(() => {
    if (!activeBot || !instance) return;
    let cancelled = false;
    botHistory(instance, activeBot.jid)
      .then((rs) => {
        if (!cancelled) setRows(rs);
      })
      .catch((e) => {
        if (!cancelled) setErr(`history: ${(e as Error).message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBot, instance]);

  const chunks = useMemo(() => rowsToChunks(rows), [rows]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chunks.length]);

  async function onSend() {
    const text = draft.trim();
    if (!activeBot || !instance || !text || sending) return;
    setSending(true);
    setErr(null);
    try {
      await sendToBot(instance, activeBot.jid, text);
      setDraft("");
      setRows((prev) => [
        ...prev,
        {
          row_id: -1,
          instance,
          bot_jid: activeBot.jid,
          role: "user",
          msg_id: `local-${Date.now()}`,
          target_id: null,
          edit: null,
          text,
          at_ms: Date.now(),
        },
      ]);
    } catch (e) {
      setErr(`send: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        title={t("chat.bot.toggle_open")}
      >
        🤖
      </Button>
    );
  }

  // ─── Header label (current step) ──────────────────────
  const headerTitle = activeBot
    ? activeBot.persona_id || activeBot.jid
    : agentId
      ? t("chat.bot.title_pick_bot", { agent: agentId })
      : t("chat.bot.title_pick_agent");

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col bg-white rounded-lg shadow-2xl border border-gray-300"
      style={{ width: 380, height: 520 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span>🤖</span>
          <span className="text-sm truncate">{headerTitle}</span>
        </div>
        <div className="flex gap-1">
          {activeBot && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveBot(null)}
              title={t("chat.bot.change_bot")}
            >
              ↩
            </Button>
          )}
          {agentId && !presetAgent && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setAgentId(null);
                setActiveBot(null);
                setBots([]);
              }}
              title={t("chat.bot.change_agent")}
            >
              ⌃
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </div>
      </div>

      {/* Body */}
      {!agentId ? (
        // Step 1 — Agent picker
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {err}
            </div>
          )}
          {agents.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              {t("chat.bot.loading_agents")}
            </div>
          ) : (
            agents
              .filter((a) => a.bindings_count > 0)
              .map((a) => (
                <Button
                  variant="secondary"
                  size="md"
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                >
                  <div className="font-medium">{a.id}</div>
                  <div className="text-xs text-gray-500">
                    {a.bindings_count === 1
                      ? t("chat.bot.agent_bindings_singular", {
                          provider: a.model_provider,
                          count: a.bindings_count,
                        })
                      : t("chat.bot.agent_bindings_plural", {
                          provider: a.model_provider,
                          count: a.bindings_count,
                        })}
                  </div>
                </Button>
              ))
          )}
        </div>
      ) : !activeBot ? (
        // Step 2 — Bot picker
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {err}
            </div>
          )}
          {!instance ? (
            <div className="text-sm text-gray-500 text-center py-8">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600 mb-2" />
              <div>{t("chat.bot.resolving_instance")}</div>
            </div>
          ) : botsLoading ? (
            <div className="text-sm text-gray-500 text-center py-8">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600 mb-2" />
              <div>{t("chat.bot.loading_bots")}</div>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              {err ? t("chat.bot.error_label") : t("chat.bot.no_bots")}
              <br />
              <Button variant="secondary" size="md" onClick={refreshBots}>
                {t("chat.bot.retry")}
              </Button>
            </div>
          ) : (
            bots.map((b) => (
              <Button
                variant="secondary"
                size="md"
                key={b.jid}
                onClick={() => setActiveBot(b)}
              >
                <div className="font-medium">
                  {b.persona_id || t("chat.bot.bot_no_id")}
                </div>
                <div className="text-xs text-gray-500 truncate">{b.jid}</div>
              </Button>
            ))
          )}
        </div>
      ) : (
        // Step 3 — Chat
        <>
          <div
            ref={scroller}
            className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50"
          >
            {err && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {err}
              </div>
            )}
            {chunks.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-8">
                {t("chat.bot.empty_chat")}
              </div>
            )}
            {chunks.map((c) => (
              <div
                key={c.key}
                className={`flex ${
                  c.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                    c.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-white border text-gray-900"
                  }`}
                >
                  {c.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t bg-white rounded-b-lg">
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder={t("chat.bot.input_placeholder")}
                className="flex-1 border rounded px-2 py-1 text-sm resize-none"
                rows={2}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => void onSend()}
                disabled={sending || !draft.trim()}
              >
                {sending ? t("chat.bot.sending") : t("chat.bot.send")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
