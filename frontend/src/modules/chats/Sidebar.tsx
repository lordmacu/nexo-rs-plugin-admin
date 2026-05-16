import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  Globe,
  KeyRound,
  LogOut,
  MessageSquare,
  MoreVertical,
  Tag,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUrlState } from "../../shell/useUrlState";
import { useConversations } from "../../store/conversations";
import { useAuth } from "../../store/auth";
import { useBootstrap, configuredAgentIds } from "../../store/bootstrap";
import { useCmdk } from "../../store/cmdk";
import { useLabels } from "../../store/labels";
import { useSoundPref } from "../../store/soundPref";
import {
  SUPPORTED_LOCALES,
  useLocale,
  useSetLocale,
  useT,
} from "../../i18n";
import { matchesQuery } from "../../lib/searchMatch";
import ChatListItem from "./ChatListItem";
import { EmptyState } from "@lordmacu/nexo-microapp-ui-react";
import LabelManagerModal from "./LabelManagerModal";
import NotifyOptInBanner from "./NotifyOptInBanner";
import { RotateTokenModal } from "../../components/RotateTokenButton";
import SearchHistoryModal from "./SearchHistoryModal";
import {
  Button,
  Chip,
  Menu,
  ModuleHeader,
  SearchInput,
  StatusDot,
} from "../../components/ui";

export default function Sidebar() {
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const conversations = useConversations((s) => s.conversations);
  const logout = useAuth((s) => s.logout);
  const sound_enabled = useSoundPref((s) => s.enabled);
  const toggle_sound = useSoundPref((s) => s.toggle);
  // `query` and `filter_label_id` mirror to the URL so a deep
  // link / refresh / tenant switch restores the operator's
  // filtered view. Modal-open booleans stay local — they're
  // transient.
  const [query, setQuery] = useUrlState<string>("chats.search", "");
  const [filter_label_id, setFilterLabelId] = useUrlState<string | null>(
    "chats.label",
    null,
  );
  const [search_modal_open, setSearchModalOpen] = useState(false);
  const [label_modal_open, setLabelModalOpen] = useState(false);
  const [rotate_token_open, setRotateTokenOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = useLabels((s) => s.labels);
  const assignments = useLabels((s) => s.assignments);
  const bootstrap = useBootstrap((s) => s.bootstrap);

  const filtered = useMemo(() => {
    const sorted = [...conversations.values()].sort(
      (a, b) => b.last_message_at - a.last_message_at,
    );
    // Drop conversations whose `agent_id` is no longer attached
    // to a paired channel instance — the firehose replays
    // historical events for deleted / unbound agents and we
    // don't want those polluting the operator's queue. While
    // bootstrap is still loading (`loaded === false`) we stay
    // optimistic and show everything to avoid a first-paint
    // flash of an empty sidebar.
    const { ids: paired_agent_ids, loaded } = configuredAgentIds(bootstrap);
    let scoped = loaded
      ? sorted.filter((c) => paired_agent_ids.has(c.agent_id))
      : sorted;
    if (filter_label_id !== null) {
      scoped = scoped.filter((c) => {
        const ids = assignments.get(c.key);
        return ids ? ids.has(filter_label_id) : false;
      });
    }
    if (query.trim().length === 0) return scoped;
    return scoped.filter((c) =>
      matchesQuery(query, [
        c.contact_label,
        c.last_message_preview,
        c.agent_id,
      ]),
    );
  }, [conversations, query, filter_label_id, assignments, bootstrap]);

  // `/` quick-focus shortcut. Skip when an input/textarea/
  // contenteditable element is the active target so it doesn't
  // hijack typing in the chat reply field or the wizard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const editable = target?.isContentEditable ?? false;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showNoResults = query.trim().length > 0 && filtered.length === 0;
  // Show the "no chats" placeholder when the filtered queue
  // (post agent-paired filter + label filter) is empty AND the
  // operator hasn't typed a search query — otherwise orphan
  // conversations in the raw store would leave the sidebar
  // blank with no empty-state copy.
  const showEmpty =
    !showNoResults && filtered.length === 0 && filter_label_id === null;

  // Conversation count drives the live indicator in the
  // header — green dot when at least one conversation is
  // open in the operator's queue.
  const haveConversations = conversations.size > 0;

  return (
    <aside className="flex h-full w-full flex-col bg-gradient-to-b from-surface to-panel">
      <ModuleHeader
        icon={<MessageSquare size={14} />}
        gradient="from-emerald-500 to-teal-600"
        title={t("chat.sidebar.title")}
        titleTrailing={
          haveConversations ? (
            <StatusDot
              tone="success"
              pulse
              label={t("chat.sidebar.live_indicator")}
            />
          ) : undefined
        }
        subtitle={t("chat.sidebar.subtitle", { count: conversations.size })}
        actions={
          <>
            {/* Operator menu — every secondary control collapsed
                into a single dropdown so the header stays
                breathable on narrow sidebars. The most-used
                actions (cmdk, agents, tags) live here too —
                if any becomes a primary muscle-memory click,
                lift it back out as a standalone Button. */}
            <Menu
              trigger={
                <Button
                  variant="ghost"
                  size="md"
                  title={t("chat.header.actions_more")}
                  aria-label={t("chat.header.actions_more")}
                >
                  <MoreVertical size={16} />
                </Button>
              }
              separatorsBefore={["sound-toggle", "rotate-token", "locale"]}
              items={[
                {
                  id: "cmdk",
                  icon: <Command size={14} />,
                  label: t("chat.menu.cmdk"),
                  hint: t("chat.menu.cmdk_hint"),
                  onSelect: () => useCmdk.getState().toggle(),
                },
                {
                  id: "agents",
                  icon: <Users size={14} />,
                  label: t("chat.menu.agents"),
                  onSelect: () => navigate("/agents"),
                },
                {
                  id: "labels",
                  icon: <Tag size={14} />,
                  label: t("chat.menu.labels"),
                  onSelect: () => setLabelModalOpen(true),
                },
                {
                  id: "sound-toggle",
                  icon: sound_enabled ? (
                    <Volume2 size={14} />
                  ) : (
                    <VolumeX size={14} />
                  ),
                  label: sound_enabled
                    ? t("chat.menu.sound_off")
                    : t("chat.menu.sound_on"),
                  pressed: sound_enabled,
                  onSelect: () => void toggle_sound(),
                },
                {
                  id: "rotate-token",
                  icon: <KeyRound size={14} />,
                  label: t("chat.menu.rotate_token"),
                  onSelect: () => setRotateTokenOpen(true),
                },
                // Locale toggle — flips between every entry in
                // SUPPORTED_LOCALES so the dropdown stays in
                // sync if a third language lands later.
                ...SUPPORTED_LOCALES.map((l) => ({
                  id: `locale-${l.code}`,
                  icon: <Globe size={14} />,
                  label: l.nativeLabel,
                  pressed: locale === l.code,
                  onSelect: () => setLocale(l.code),
                })),
              ]}
            />
            {/* Logout stays as a standalone button — destructive
                "leave the app" action that should always be one
                click away. */}
            <Button
              variant="ghost"
              size="md"
              onClick={logout}
              title={t("chat.header.logout")}
              aria-label={t("chat.header.logout")}
            >
              <LogOut size={16} />
            </Button>
          </>
        }
      />
      {rotate_token_open && (
        <RotateTokenModal onClose={() => setRotateTokenOpen(false)} />
      )}
      {/* M7.notify.b — opt-in CTA banner. Self-hides when
          permission is granted or operator dismisses. */}
      <NotifyOptInBanner />
      {/* Search */}
      <div className="px-4 pt-3">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          placeholder={t("chat.sidebar.search_placeholder")}
          clearable
          onClear={() => setQuery("")}
        />
      </div>
      {labels.size > 0 && (
        <div className="px-4 pt-2">
          <LabelFilterChips
            labels={[...labels.values()]}
            active_id={filter_label_id}
            on_change={setFilterLabelId}
          />
        </div>
      )}
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {showEmpty ? (
          <EmptyState
            title={t("chat.empty.no_chats_title")}
            body={t("chat.empty.no_chats_body")}
          />
        ) : showNoResults ? (
          <EmptyState
            title={t("chat.empty.no_results_title")}
            body={t("chat.empty.no_results_body", { query: query.trim() })}
            action={
              <div className="flex flex-col items-center gap-2">
                {/* M7.search.fts — operator can fall through to
                    the daemon's FTS5 index when the in-memory
                    sidebar (top 200) doesn't cover the chat
                    they're looking for. */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSearchModalOpen(true)}
                >
                  {t("chat.empty.search_history")}
                </Button>
                <Button variant="ghost" size="md" onClick={() => setQuery("")}>
                  {t("chat.empty.clear_search")}
                </Button>
              </div>
            }
          />
        ) : (
          filtered.map((conv) => <ChatListItem key={conv.key} conv={conv} />)
        )}
      </div>
      <SearchHistoryModal
        open={search_modal_open}
        onClose={() => setSearchModalOpen(false)}
      />
      <LabelManagerModal
        open={label_modal_open}
        on_close={() => setLabelModalOpen(false)}
      />
    </aside>
  );
}

function LabelFilterChips(props: {
  labels: import("../../store/labels").Label[];
  active_id: string | null;
  on_change: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
      <Chip
        active={props.active_id === null}
        onClick={() => props.on_change(null)}
        className="shrink-0"
      >
        Todos
      </Chip>
      {props.labels.map((l) => {
        const active = props.active_id === l.id;
        // Custom label color overrides the default Chip accent so
        // every tag chip carries its operator-chosen tint.
        return (
          <Chip
            key={l.id}
            active={active}
            onClick={() => props.on_change(active ? null : l.id)}
            className="shrink-0"
            style={
              active
                ? { backgroundColor: l.color, borderColor: l.color }
                : undefined
            }
            icon={
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: l.color }}
              />
            }
          >
            {l.name}
          </Chip>
        );
      })}
    </div>
  );
}
