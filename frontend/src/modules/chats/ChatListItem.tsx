import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import {
  AlertOctagon,
  ChevronDown,
  PauseCircle,
  Pencil,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import {
  getConversationAlias,
  useConversations,
  type Conversation,
} from "../../store/conversations";
import { useLabels, type Label } from "../../store/labels";
import { useProspects, type Prospect } from "../../store/prospects";
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Textarea,
} from "../../components/ui";
import { useT } from "../../i18n";

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

function initials(s: string): string {
  return (
    s
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function formatTime(at_ms: number, yesterdayLabel: string): string {
  const d = new Date(at_ms);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return yesterdayLabel;
  return format(d, "dd/MM/yy", { locale: es });
}

export default function ChatListItem({ conv }: { conv: Conversation }) {
  const t = useT();
  const nav = useNavigate();
  const active_key = useConversations((s) => s.active_key);
  const set_active = useConversations((s) => s.set_active);
  const dismiss = useConversations((s) => s.dismiss);
  const set_alias = useConversations((s) => s.set_alias);
  const labels_map = useLabels((s) => s.labels);
  const assignments = useLabels((s) => s.assignments);
  const toggle_assignment = useLabels((s) => s.toggle_assignment);
  const prospects_map = useProspects((s) => s.prospects);

  const [menu_open, set_menu_open] = useState(false);
  const [confirm_delete, set_confirm_delete] = useState(false);
  const [renaming, set_renaming] = useState(false);
  const [alias_draft, set_alias_draft] = useState("");
  const [labels_picker_open, set_labels_picker_open] = useState(false);
  const [prospect_open, set_prospect_open] = useState(false);
  const menu_ref = useRef<HTMLDivElement | null>(null);

  const isActive = active_key === conv.key;
  const alias = getConversationAlias(conv.key);
  const display_label = alias ?? conv.contact_label;
  const assigned_ids = assignments.get(conv.key);
  const conv_labels: Label[] = assigned_ids
    ? [...assigned_ids]
        .map((id) => labels_map.get(id))
        .filter((l): l is Label => l !== undefined)
    : [];
  const has_prospect = prospects_map.has(conv.key);

  useEffect(() => {
    if (!menu_open) return;
    function onDocClick(e: MouseEvent) {
      if (!menu_ref.current) return;
      if (menu_ref.current.contains(e.target as Node)) return;
      set_menu_open(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") set_menu_open(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu_open]);

  function openConversation() {
    set_active(conv.key);
    nav(`/chat/${encodeURIComponent(conv.key)}`);
  }

  function startRename() {
    set_alias_draft(alias ?? "");
    set_renaming(true);
    set_menu_open(false);
  }

  function commitRename() {
    set_alias(conv.key, alias_draft.trim().length > 0 ? alias_draft : null);
    set_renaming(false);
  }

  function clearAlias() {
    set_alias(conv.key, null);
    set_renaming(false);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openConversation}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "") {
            e.preventDefault();
            openConversation();
          }
        }}
        className={clsx(
          "group relative w-full flex items-center gap-3 px-3 py-3 border-b /60 transition-colors text-left cursor-pointer",
          isActive ? "bg-panel-alt" : "hover:bg-panel-hover",
          menu_open ? "z-30" : "z-0",
        )}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
          style={{ backgroundColor: avatarColor(display_label) }}
        >
          {initials(display_label)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-text-primary text-sm truncate flex items-center gap-1">
              {display_label}
              {has_prospect && (
                <UserPlus
                  size={12}
                  className="text-accent shrink-0"
                  aria-label={t("chat.list_item.has_prospect")}
                />
              )}
            </span>
            <span className="text-xs text-text-meta shrink-0">
              {formatTime(
                conv.last_message_at,
                t("chat.list_item.time_yesterday"),
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-sm text-text-secondary truncate flex items-center gap-1.5">
              {conv_labels.length > 0 && (
                <span className="flex items-center gap-0.5 shrink-0">
                  {conv_labels.slice(0, 3).map((l) => (
                    <span
                      key={l.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                      title={l.name}
                    />
                  ))}
                </span>
              )}
              <span className="truncate">{conv.last_message_preview}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {conv.is_paused && (
                <PauseCircle size={16} className="text-warning-soft" />
              )}
              {conv.has_pending_escalation && (
                <AlertOctagon size={16} className="text-warning" />
              )}
              {conv.unread_count > 0 && (
                <span className="bg-accent text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">
                  {conv.unread_count}
                </span>
              )}
            </span>
          </div>
        </div>

        <div
          ref={menu_ref}
          className={clsx(
            "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity",
            menu_open
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <Button
            variant="ghost"
            size="md"
            aria-label={t("chat.list_item.actions_aria")}
            aria-haspopup="menu"
            aria-expanded={menu_open}
            onClick={(e) => {
              e.stopPropagation();
              set_menu_open((v) => !v);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ChevronDown size={16} />
          </Button>
          {menu_open && (
            <div
              role="menu"
              className="absolute right-0 mt-1 z-40 min-w-[220px] bg-white border rounded-md shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="md"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  startRename();
                }}
              >
                <Pencil size={14} /> {t("chat.list_item.menu.rename")}
              </Button>
              {alias && (
                <Button
                  variant="ghost"
                  size="md"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    set_menu_open(false);
                    clearAlias();
                  }}
                >
                  <X size={14} /> {t("chat.list_item.menu.clear_alias")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="md"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  set_menu_open(false);
                  set_labels_picker_open(true);
                }}
              >
                <Tag size={14} /> {t("chat.list_item.menu.labels")}
                {conv_labels.length > 0 && (
                  <span className="ml-auto text-xs text-text-secondary">
                    {conv_labels.length}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="md"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  set_menu_open(false);
                  set_prospect_open(true);
                }}
              >
                <UserPlus size={14} />
                {""}
                {has_prospect
                  ? t("chat.list_item.menu.edit_prospect")
                  : t("chat.list_item.menu.create_prospect")}
              </Button>
              <Button
                variant="secondary"
                size="md"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  set_menu_open(false);
                  set_confirm_delete(true);
                }}
              >
                <Trash2 size={14} /> {t("chat.list_item.menu.delete")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {renaming && (
        <RenameModal
          initial={alias_draft}
          current_label={display_label}
          on_change={set_alias_draft}
          on_save={commitRename}
          on_cancel={() => set_renaming(false)}
        />
      )}

      {confirm_delete && (
        <ConfirmDeleteModal
          label={display_label}
          on_confirm={() => {
            set_confirm_delete(false);
            dismiss(conv.key);
          }}
          on_cancel={() => set_confirm_delete(false)}
        />
      )}

      {labels_picker_open && (
        <LabelsPickerModal
          conversation_key={conv.key}
          all_labels={[...labels_map.values()]}
          assigned_ids={new Set(assigned_ids ?? [])}
          on_toggle={(id) => toggle_assignment(conv.key, id)}
          on_close={() => set_labels_picker_open(false)}
        />
      )}

      {prospect_open && (
        <ProspectModal
          conversation_key={conv.key}
          default_name={display_label}
          conv_label_ids={[...(assigned_ids ?? [])]}
          all_labels={labels_map}
          on_close={() => set_prospect_open(false)}
        />
      )}
    </>
  );
}

function RenameModal(props: {
  initial: string;
  current_label: string;
  on_change: (v: string) => void;
  on_save: () => void;
  on_cancel: () => void;
}) {
  const t = useT();
  const input_ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    input_ref.current?.focus();
    input_ref.current?.select();
  }, []);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-5 py-3 border-b">
          <h2 className="text-base font-medium text-text-primary">
            {t("chat.list_item.rename.title")}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-text-secondary">
            {t("chat.list_item.rename.description", {
              label: props.current_label,
            })}
          </p>
          <Input
            ref={input_ref}
            value={props.initial}
            onChange={(e) => props.on_change(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.on_save();
              if (e.key === "Escape") props.on_cancel();
            }}
            placeholder={t("chat.list_item.rename.placeholder")}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={props.on_cancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={props.on_save}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal(props: {
  label: string;
  on_confirm: () => void;
  on_cancel: () => void;
}) {
  const t = useT();
  // Split the delete body around `{label}` so we can render the
  // label in bold while keeping the surrounding sentence translatable.
  const SENTINEL = "LABEL";
  const body_template = t("chat.list_item.delete.body", { label: SENTINEL });
  const [body_before = "", body_after = ""] = body_template.split(SENTINEL);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-5 py-3 border-b">
          <h2 className="text-base font-medium text-text-primary">
            {t("chat.list_item.delete.title")}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-text-primary">
          <p>
            {body_before}
            <strong className="font-medium">{props.label}</strong>
            {body_after}
          </p>
          <p className="text-xs text-text-secondary">
            {t("chat.list_item.delete.body_hint")}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={props.on_cancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={props.on_confirm}>
            <Trash2 size={14} /> {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LabelsPickerModal(props: {
  conversation_key: string;
  all_labels: Label[];
  assigned_ids: Set<string>;
  on_toggle: (id: string) => void;
  on_close: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-base font-medium text-text-primary">
            {t("chat.list_item.labels.title")}
          </h2>
          <Button
            variant="ghost"
            size="md"
            onClick={props.on_close}
            aria-label={t("chat.list_item.close_aria")}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="px-5 py-3 max-h-80 overflow-y-auto">
          {props.all_labels.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t("chat.list_item.labels.empty")}
              <span className="inline-flex ml-1">
                <Tag size={14} />
              </span>
            </p>
          ) : (
            <ul className="space-y-1">
              {props.all_labels.map((l) => {
                const checked = props.assigned_ids.has(l.id);
                return (
                  <li key={l.id}>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel-hover cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onChange={() => props.on_toggle(l.id)}
                      />
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-sm text-text-primary">
                        {l.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-end px-5 py-3 border-t">
          <Button variant="primary" size="sm" onClick={props.on_close}>
            {t("chat.list_item.labels.done")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProspectModal(props: {
  conversation_key: string;
  default_name: string;
  conv_label_ids: string[];
  all_labels: Map<string, Label>;
  on_close: () => void;
}) {
  const t = useT();
  const existing = useProspects((s) => s.prospects.get(props.conversation_key));
  const upsert = useProspects((s) => s.upsert);
  const remove = useProspects((s) => s.remove);

  const [name, set_name] = useState(existing?.name ?? props.default_name);
  const [email, set_email] = useState(existing?.email ?? "");
  const [phone, set_phone] = useState(existing?.phone ?? "");
  const [notes, set_notes] = useState(existing?.notes ?? "");
  // Initialise selected labels from the existing prospect; fall
  // back to the conversation's current label assignments so a fresh
  //"Crear prospecto"pre-fills the chat's labels.
  const [selected, set_selected] = useState<Set<string>>(
    () => new Set(existing?.label_ids ?? props.conv_label_ids),
  );

  function toggle(id: string) {
    set_selected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    const now = Date.now();
    const next: Prospect = {
      conversation_key: props.conversation_key,
      name: name.trim().length > 0 ? name.trim() : props.default_name,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      label_ids: [...selected],
      created_at_ms: existing?.created_at_ms ?? now,
      updated_at_ms: now,
    };
    upsert(next);
    props.on_close();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-base font-medium text-text-primary">
            {existing
              ? t("chat.list_item.prospect.title_edit")
              : t("chat.list_item.prospect.title_create")}
          </h2>
          <Button
            variant="ghost"
            size="md"
            onClick={props.on_close}
            aria-label={t("chat.list_item.close_aria")}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              {t("chat.list_item.prospect.field_name")}
            </label>
            <Input
              value={name}
              onChange={(e) => set_name(e.target.value)}
              className="w-full border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              {t("chat.list_item.prospect.field_email")}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => set_email(e.target.value)}
              placeholder={t("chat.list_item.prospect.email_placeholder")}
              className="w-full border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              {t("chat.list_item.prospect.field_phone")}
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => set_phone(e.target.value)}
              placeholder={t("chat.list_item.prospect.phone_placeholder")}
              className="w-full border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              {t("chat.list_item.prospect.field_notes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => set_notes(e.target.value)}
              rows={4}
              placeholder={t("chat.list_item.prospect.notes_placeholder")}
              className="w-full border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              {t("chat.list_item.prospect.field_labels")}
            </label>
            {props.all_labels.size === 0 ? (
              <p className="text-xs text-text-secondary italic">
                {t("chat.list_item.prospect.no_labels")}
                <span className="inline-flex ml-1">
                  <Tag size={12} />
                </span>
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...props.all_labels.values()].map((l) => {
                  const active = selected.has(l.id);
                  return (
                    <Chip
                      key={l.id}
                      active={active}
                      onClick={() => toggle(l.id)}
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
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t">
          {existing ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                remove(props.conversation_key);
                props.on_close();
              }}
            >
              <Trash2 size={14} /> {t("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={props.on_close}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={save}>
              {existing
                ? t("chat.list_item.prospect.save_changes")
                : t("chat.list_item.prospect.create")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
