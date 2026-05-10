// Settings tabbed view — mailboxes / sellers / rules /
// templates / followup profiles. Live data from
// `/api/marketing/config/*` with mock fixture fallback when
// the extension is unreachable / a tenant is brand-new.

import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";

import { HttpError } from "../../api/client";

import {
  getAudit,
  getDraftTemplate,
  getNotificationTemplates,
  getSnippets,
  getTemplates,
  getTopicGuardrails,
  previewDraftTemplate,
  saveDraftTemplate,
  saveNotificationTemplates,
  saveSnippets,
  saveTemplates,
  saveTopicGuardrails,
  type ConfigFollowupProfile,
  type ConfigGuardrailRule,
  type ConfigMailbox,
  type ConfigNotificationTemplates,
  type ConfigSeller,
  type ConfigSnippet,
  type ConfigTemplate,
  type DraftTemplateConfig,
  type MarketingAuditEvent,
} from "../../api/marketing";
import { useMarketingConfig } from "../../store/marketingConfig";
import FollowupProfileEditor from "./components/FollowupProfileEditor";
import JsonEditorModal from "./components/JsonEditorModal";
import MailboxFormEditor from "./components/MailboxFormEditor";
import NotificationTemplatesEditor from "./components/NotificationTemplatesEditor";
import RoutingRuleEditor, {
  AssignTargetPicker,
  type AssignTarget,
  type RoutingRule as EditorRoutingRule,
} from "./components/RoutingRuleEditor";
import SellerForm from "./components/SellerForm";
import SnippetEditor from "./components/SnippetEditor";
import TemplateEditor from "./components/TemplateEditor";
import { Button, Code, Input, Select, Textarea } from "../../components/ui";
import { useT, t as tStatic } from "../../i18n";
import type { CatalogKey } from "../../i18n";

const TABS: ReadonlyArray<{ path: string; labelKey: CatalogKey }> = [
  { path: "mailboxes", labelKey: "marketing.settings.tab.mailboxes" },
  { path: "sellers", labelKey: "marketing.settings.tab.sellers" },
  { path: "rules", labelKey: "marketing.settings.tab.rules" },
  { path: "followup", labelKey: "marketing.settings.tab.followup" },
  { path: "templates", labelKey: "marketing.settings.tab.templates" },
  { path: "drafts", labelKey: "marketing.settings.tab.drafts" },
  { path: "draft_template", labelKey: "marketing.settings.tab.draft_template" },
  { path: "snippets", labelKey: "marketing.settings.tab.snippets" },
  { path: "guardrails", labelKey: "marketing.settings.tab.guardrails" },
  { path: "audit", labelKey: "marketing.settings.tab.audit" },
  { path: "spam-filter", labelKey: "marketing.settings.tab.spam_filter" },
  { path: "scoring", labelKey: "marketing.settings.tab.scoring" },
  { path: "state", labelKey: "marketing.settings.tab.state" },
  { path: "email-templates", labelKey: "marketing.settings.tab.email_templates" },
];

export default function SettingsView() {
  // Hydrate the 4 config slices on mount. Independent slice
  // fetches keep the slowest tab from blocking the others.
  const fetchAll = useMarketingConfig((s) => s.fetchAll);
  const t = useT();
  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);
  return (
    <div className="flex h-full flex-col">
      <header className="border-b  bg-white px-4 py-3">
        <h1 className="text-base font-semibold text-text-primary">
          {t("marketing.settings.title")}
        </h1>
        <nav className="mt-2 flex flex-wrap gap-1 text-xs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `rounded px-2 py-1 font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-panel-hover"
                }`
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="flex-1 overflow-y-auto bg-surface p-4">
        <Outlet />
      </div>
    </div>
  );
}

// ── Mailboxes tab ───────────────────────────────────────────────

export function SettingsMailboxes() {
  const t = useT();
  const slice = useMarketingConfig((s) => s.mailboxes);
  const save = useMarketingConfig((s) => s.saveMailboxes);
  const [jsonEditing, setJsonEditing] = useState(false);
  const [formEditing, setFormEditing] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLive = slice.source === "api";
  const mailboxes = isLive ? slice.data : [];

  const persist = async (next: ConfigMailbox[]) => {
    setError(null);
    const r = await save(next as never);
    if (r.kind === "error") {
      setError(r.message);
      return r;
    }
    setFormEditing(null);
    return r;
  };

  const upsert = async (next: ConfigMailbox) => {
    const before = mailboxes;
    const exists = before.some((m) => m.id === next.id);
    const after = exists
      ? before.map((m) => (m.id === next.id ? next : m))
      : [...before, next];
    await persist(after as ConfigMailbox[]);
  };

  const remove = async (id: string) => {
    if (
      !window.confirm(
        tStatic("marketing.settings.mailboxes.confirm_delete", { id }),
      )
    )
      return;
    await persist(mailboxes.filter((m) => m.id !== id) as ConfigMailbox[]);
  };

  const editingTarget = formEditing
    ? (mailboxes.find((m) => m.id === formEditing.id) ?? {
        id: formEditing.id,
        address: "",
        provider: "imap",
      })
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {t("marketing.settings.mailboxes.intro")}
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setFormEditing({
                id: `mailbox-${Date.now()}`,
                locked: false,
              })
            }
          >
            {t("marketing.settings.mailboxes.new")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJsonEditing(true)}
          >
            {t("marketing.settings.mailboxes.edit_json")}
          </Button>
        </div>
      </div>

      {jsonEditing && (
        <JsonEditorModal
          title={t("marketing.settings.mailboxes.json_title")}
          hint={t("marketing.settings.mailboxes.json_hint")}
          initial={mailboxes}
          onSave={async (parsed) => {
            if (!Array.isArray(parsed)) {
              return {
                kind: "error",
                message: t("marketing.settings.mailboxes.json_array_required"),
              };
            }
            return persist(parsed as ConfigMailbox[]);
          }}
          onClose={() => setJsonEditing(false)}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}

      {editingTarget && (
        <MailboxFormEditor
          initial={editingTarget as ConfigMailbox}
          idLocked={formEditing!.locked}
          onSave={upsert}
          onCancel={() => setFormEditing(null)}
          {...(formEditing!.locked
            ? { onDelete: () => remove(editingTarget.id) }
            : {})}
        />
      )}

      <SourceBanner source={slice.source} error={slice.error} />

      <ul className="space-y-2">
        {isLive ? (
          mailboxes.map((m) => (
            <li key={m.id}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setFormEditing({ id: m.id, locked: true })}
                data-testid={`mailbox-card-${m.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {String(m.address)}
                  </p>
                  <p className="text-[11px] text-text-meta">
                    {String(m.provider).toUpperCase()} · {String(m.mode)} ·{" "}
                    {m.draft_mode
                      ? t("marketing.settings.mailboxes.draft_mode")
                      : t("marketing.settings.mailboxes.autonomous")}
                    {typeof m.poll_interval_seconds === "number" &&
                      t("marketing.settings.mailboxes.poll_suffix", {
                        seconds: m.poll_interval_seconds,
                      })}
                  </p>
                </div>
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                  {t("marketing.settings.mailboxes.live")}
                </span>
              </Button>
            </li>
          ))
        ) : (
          <li className="rounded border border-dashed  bg-white p-4 text-center text-xs text-text-secondary">
            {slice.source === "loading"
              ? t("marketing.settings.mailboxes.loading")
              : t("marketing.settings.mailboxes.empty")}
          </li>
        )}
      </ul>
    </div>
  );
}

// Legacy stub MailboxEditor removed — SettingsMailboxes
// now drives editing through the inline MailboxFormEditor.

// ── Sellers tab ──────────────────────────────────────────────

export function SettingsSellers() {
  const t = useT();
  const slice = useMarketingConfig((s) => s.sellers);
  const save = useMarketingConfig((s) => s.saveSellers);
  /** Pop-out seller form. `null` = closed; `undefined-as-seller` =
   *  new row; concrete seller = edit existing. */
  const [editingRow, setEditingRow] = useState<ConfigSeller | null | "new">(
    null,
  );
  const isLive = slice.source === "api";

  // M15.46 — pre-filter when arriving from the agent badge
  // (`/m/marketing/settings/sellers?agent_id=<id>`). useSearchParams
  // keeps the filter URL-mirrored so deep links stay
  // shareable + a refresh preserves the filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const agentFilter = searchParams.get("agent_id") ?? "";

  // The form takes a single seller + composes the full
  // post-edit list before calling `saveSellers`. Add/edit
  // share the same composition path; delete is inline.
  async function saveOne(next: ConfigSeller) {
    const live = isLive ? slice.data : [];
    const others = live.filter((v) => v.id !== next.id);
    return save([...others, next]);
  }

  async function deleteOne(id: string) {
    if (!isLive) return;
    if (
      !confirm(
        tStatic("marketing.settings.sellers.confirm_delete", { id }),
      )
    )
      return;
    const next = slice.data.filter((v) => v.id !== id);
    await save(next);
  }

  // Tenant id stamped on new sellers. M16 multi-tenant
  // resolves it from the active tenant; today the proxy uses
  // a single `default_tenant`.
  const tenantId =
    isLive && slice.data[0]?.tenant_id
      ? String(slice.data[0].tenant_id)
      : "default";

  // Apply the agent filter at render-time. Keep slice.data
  // intact so the filter affordance always shows the
  // correct full count.
  const filteredData = agentFilter
    ? slice.data.filter(
        (v) => (v as { agent_id?: string }).agent_id === agentFilter,
      )
    : slice.data;

  function clearFilter() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("agent_id");
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {t("marketing.settings.sellers.intro")}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setEditingRow("new")}
        >
          <Plus size={12} /> {t("marketing.settings.sellers.new")}
        </Button>
      </div>

      {/* M15.46 — agent filter banner. Only renders when the
          URL carries ?agent_id=<id>; click "Quitar filtro" to
          drop the param. Operator typically lands here from
          /agents → 📧 N email sellers badge. */}
      {agentFilter && (
        <div
          className="flex items-center justify-between gap-2 rounded-md bg-violet-50 px-3 py-2 text-[11px] text-violet-800 ring-1 ring-violet-200"
          role="status"
        >
          <span>
            {t("marketing.settings.sellers.filter_banner")}
            <Code>{agentFilter}</Code>{" "}
            {t("marketing.settings.sellers.filter_count", {
              visible: filteredData.length,
              total: slice.data.length,
            })}
          </span>
          <Button variant="secondary" size="sm" onClick={clearFilter}>
            {t("marketing.settings.sellers.clear_filter")}
          </Button>
        </div>
      )}
      {editingRow !== null && (
        <SellerForm
          initial={editingRow === "new" ? null : editingRow}
          tenant_id={tenantId}
          onSave={saveOne}
          onClose={() => setEditingRow(null)}
        />
      )}
      <SourceBanner source={slice.source} error={slice.error} />
      <ul className="space-y-2">
        {isLive ? (
          filteredData.map((v) => {
            const agentId = (v as { agent_id?: string }).agent_id;
            const override = (
              v as { model_override?: { provider: string; model: string } }
            ).model_override;
            return (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded border  bg-white p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                  {String(v.name)
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {String(v.name)}
                    {v.on_vacation === true && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                        {t("marketing.settings.sellers.on_vacation")}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-text-meta">
                    {String(v.primary_email)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                    {agentId ? (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700 ring-1 ring-violet-200">
                        {t("marketing.settings.sellers.agent_prefix", {
                          id: agentId,
                        })}
                      </span>
                    ) : (
                      <span className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-500 ring-1 ring-slate-200">
                        {t("marketing.settings.sellers.no_agent")}
                      </span>
                    )}
                    {override && (
                      <span
                        className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200"
                        title={t(
                          "marketing.settings.sellers.model_override_title",
                          {
                            provider: override.provider,
                            model: override.model,
                          },
                        )}
                      >
                        {t("marketing.settings.sellers.model_override")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingRow(v)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => deleteOne(String(v.id))}
                    aria-label={t("marketing.settings.sellers.delete_aria", {
                      id: v.id,
                    })}
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              </li>
            );
          })
        ) : (
          <li className="rounded border border-dashed  bg-white p-4 text-center text-xs text-text-secondary">
            {slice.source === "loading"
              ? t("marketing.settings.sellers.loading")
              : t("marketing.settings.sellers.empty")}
          </li>
        )}
      </ul>
    </div>
  );
}

// ── Rules tab ───────────────────────────────────────────────────

function blankRule(id: string): EditorRoutingRule {
  return {
    id,
    name: "",
    conditions: [],
    assigns_to: { kind: "drop" },
    followup_profile: "",
    active: true,
  };
}

function describeRule(
  r: EditorRoutingRule,
  t: ReturnType<typeof useT>,
): string {
  const condLabel =
    r.conditions.length === 0
      ? t("marketing.settings.rules.describe_no_conditions")
      : t("marketing.settings.rules.describe_conditions", {
          count: r.conditions.length,
        });
  const target =
    r.assigns_to.kind === "seller"
      ? t("marketing.settings.rules.describe_seller", { id: r.assigns_to.id })
      : r.assigns_to.kind === "round_robin"
        ? t("marketing.settings.rules.describe_pool", {
            ids: r.assigns_to.pool.join(", "),
          })
        : t("marketing.settings.rules.describe_drop");
  return `${condLabel} · ${target}`;
}

export function SettingsRules() {
  const t = useT();
  const slice = useMarketingConfig((s) => s.rules);
  const save = useMarketingConfig((s) => s.saveRules);
  const sellersSlice = useMarketingConfig((s) => s.sellers);
  const followupsSlice = useMarketingConfig((s) => s.followups);
  const [jsonEditing, setJsonEditing] = useState(false);
  const [formEditing, setFormEditing] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLive = slice.source === "api" && slice.data !== null;
  // Empty initial value when no live data — operator gets a
  // skeleton RuleSet they can fill in.
  const editorInitial = isLive
    ? slice.data
    : {
        tenant_id: "default",
        version: 1,
        rules: [],
        default_target: { kind: "drop" },
      };

  const liveRules: readonly EditorRoutingRule[] = isLive
    ? ((slice.data!.rules ?? []) as unknown as readonly EditorRoutingRule[])
    : [];
  const liveDefaultTarget: AssignTarget =
    isLive && slice.data
      ? ((slice.data.default_target as AssignTarget) ?? { kind: "drop" })
      : { kind: "drop" };

  const sellerIds =
    sellersSlice.source === "api"
      ? sellersSlice.data.map((s) => String(s.id))
      : [];
  const followupIds =
    followupsSlice.source === "api"
      ? followupsSlice.data.map((p) => String(p.id))
      : [];

  const persist = async (next: EditorRoutingRule[], target: AssignTarget) => {
    setError(null);
    const payload = {
      ...(isLive ? (slice.data ?? {}) : { tenant_id: "default", version: 1 }),
      rules: next,
      default_target: target,
    };
    const r = await save(payload as never);
    if (r.kind === "error") {
      setError(r.message);
      return r;
    }
    setFormEditing(null);
    return r;
  };

  const upsertRule = async (next: EditorRoutingRule) => {
    const before = liveRules;
    const exists = before.some((r) => r.id === next.id);
    const after = exists
      ? before.map((r) => (r.id === next.id ? next : r))
      : [...before, next];
    await persist(after, liveDefaultTarget);
  };

  const removeRule = async (id: string) => {
    if (
      !window.confirm(
        tStatic("marketing.settings.rules.confirm_delete", { id }),
      )
    )
      return;
    await persist(
      liveRules.filter((r) => r.id !== id),
      liveDefaultTarget,
    );
  };

  const updateDefaultTarget = async (next: AssignTarget) => {
    await persist([...liveRules], next);
  };

  const editingTarget = formEditing
    ? (liveRules.find((r) => r.id === formEditing.id) ??
      blankRule(formEditing.id))
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {t("marketing.settings.rules.intro")}
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setFormEditing({
                id: `rule-${Date.now()}`,
                locked: false,
              })
            }
          >
            {t("marketing.settings.rules.new")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJsonEditing(true)}
          >
            {t("marketing.settings.rules.edit_json")}
          </Button>
        </div>
      </div>
      {jsonEditing && (
        <JsonEditorModal
          title={t("marketing.settings.rules.json_title")}
          hint={t("marketing.settings.rules.json_hint")}
          initial={editorInitial}
          onSave={async (parsed) => {
            if (typeof parsed !== "object" || parsed === null) {
              return {
                kind: "error",
                message: t("marketing.settings.rules.json_object_required"),
              };
            }
            return save(parsed as never);
          }}
          onClose={() => setJsonEditing(false)}
        />
      )}
      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}
      {editingTarget && (
        <RoutingRuleEditor
          initial={editingTarget}
          idLocked={formEditing!.locked}
          availableSellerIds={sellerIds}
          availableFollowupProfiles={followupIds}
          onSave={upsertRule}
          onCancel={() => setFormEditing(null)}
          {...(formEditing!.locked
            ? { onDelete: () => removeRule(editingTarget.id) }
            : {})}
        />
      )}
      <SourceBanner source={slice.source} error={slice.error} />
      {isLive && slice.data ? (
        <>
          <ul className="space-y-2">
            {liveRules.map((r, idx) => (
              <li key={r.id ?? idx}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setFormEditing({ id: r.id, locked: true })}
                  data-testid={`rule-card-${r.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {idx + 1}. {r.id}
                      {r.active ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          {t("marketing.settings.rules.active")}
                        </span>
                      ) : (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                          {t("marketing.settings.rules.paused")}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-meta">
                      {r.name || t("marketing.settings.rules.no_name")}
                      {" · "}
                      {describeRule(r, t)}
                    </p>
                  </div>
                </Button>
              </li>
            ))}
            {liveRules.length === 0 && (
              <li className="rounded border border-dashed  bg-white p-4 text-center text-xs text-text-secondary">
                {t("marketing.settings.rules.empty")}
              </li>
            )}
          </ul>
          <div
            data-testid="default-target-card"
            className="rounded border border-violet-200 bg-violet-50/50 p-3"
          >
            <p className="mb-1.5 text-[11px] font-semibold text-violet-800">
              {t("marketing.settings.rules.default_target_label")}
            </p>
            <AssignTargetPicker
              value={liveDefaultTarget}
              onChange={updateDefaultTarget}
              availableSellerIds={sellerIds}
              testidPrefix="default-target"
            />
          </div>
        </>
      ) : (
        <p className="rounded border border-dashed  bg-white p-4 text-center text-xs text-text-secondary">
          {slice.source === "loading"
            ? t("marketing.settings.rules.loading")
            : t("marketing.settings.rules.empty_full")}
        </p>
      )}
    </div>
  );
}

// ── Followup tab ────────────────────────────────────────────────

export function SettingsFollowup() {
  const t = useT();
  const slice = useMarketingConfig((s) => s.followups);
  const save = useMarketingConfig((s) => s.saveFollowups);
  const [jsonEditing, setJsonEditing] = useState(false);
  const [formEditing, setFormEditing] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLive = slice.source === "api";
  const profiles: readonly ConfigFollowupProfile[] = isLive ? slice.data : [];

  const upsertProfile = async (next: ConfigFollowupProfile) => {
    const before = isLive ? slice.data : [];
    const exists = before.some((p) => p.id === next.id);
    const after = exists
      ? before.map((p) => (p.id === next.id ? next : p))
      : [...before, next];
    setError(null);
    const r = await save(after as never);
    if (r.kind === "error") {
      setError(r.message);
      return;
    }
    setFormEditing(null);
  };

  const deleteProfile = async (id: string) => {
    const before = isLive ? slice.data : [];
    if (
      !window.confirm(
        tStatic("marketing.settings.followup.confirm_delete", { id }),
      )
    )
      return;
    setError(null);
    const r = await save(before.filter((p) => p.id !== id) as never);
    if (r.kind === "error") {
      setError(r.message);
      return;
    }
    setFormEditing(null);
  };

  const editingProfile =
    formEditing !== null
      ? (profiles.find((p) => p.id === formEditing.id) ?? {
          id: formEditing.id,
          cadence: ["1d"],
          max_attempts: 3,
          stop_on_reply: true,
        })
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {t("marketing.settings.followup.intro")}
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setFormEditing({ id: `profile-${Date.now()}`, locked: false })
            }
          >
            {t("marketing.settings.followup.new")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJsonEditing(true)}
          >
            {t("marketing.settings.followup.edit_json")}
          </Button>
        </div>
      </div>
      {jsonEditing && (
        <JsonEditorModal
          title={t("marketing.settings.followup.json_title")}
          hint={t("marketing.settings.followup.json_hint")}
          initial={isLive ? slice.data : []}
          onSave={async (parsed) => {
            if (!Array.isArray(parsed)) {
              return {
                kind: "error",
                message: t("marketing.settings.followup.json_array_required"),
              };
            }
            return save(parsed as never);
          }}
          onClose={() => setJsonEditing(false)}
        />
      )}
      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}
      <SourceBanner source={slice.source} error={slice.error} />
      {editingProfile && (
        <FollowupProfileEditor
          initial={editingProfile}
          idLocked={formEditing!.locked}
          onSave={upsertProfile}
          onCancel={() => setFormEditing(null)}
          {...(formEditing!.locked
            ? { onDelete: () => deleteProfile(editingProfile.id) }
            : {})}
        />
      )}
      <div className="grid gap-2 md:grid-cols-3">
        {profiles.map((p) => {
          const id = String(p.id);
          const cadence = (p as { cadence?: readonly string[] }).cadence ?? [];
          const max =
            (p as { max_attempts?: number; max?: number }).max_attempts ??
            (p as { max?: number }).max ??
            0;
          const stopOnReply =
            (p as { stop_on_reply?: boolean }).stop_on_reply ?? true;
          return (
            <Button
              variant="secondary"
              size="md"
              key={id}
              onClick={() => isLive && setFormEditing({ id, locked: true })}
              disabled={!isLive}
              data-testid={`followup-profile-${id}`}
            >
              <p className="text-sm font-medium text-text-primary">{id}</p>
              <ol className="mt-2 space-y-1 text-[11px] text-text-secondary">
                {cadence.map((c, i) => (
                  <li key={i}>
                    <span className="text-accent">●</span>{" "}
                    {t("marketing.settings.followup.day_label", {
                      cadence: c,
                      step: i + 1,
                    })}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[10px] text-text-meta">
                {t("marketing.settings.followup.summary", {
                  max,
                  stop: stopOnReply
                    ? t("marketing.settings.followup.summary_check")
                    : t("marketing.settings.followup.summary_x"),
                })}
              </p>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ── Templates tab (stub) ────────────────────────────────────────

export function SettingsTemplates() {
  const t = useT();
  // M15.44 — operator-supplied notification template overrides.
  // Reuses the JSON editor pattern (M15.34); proper per-kind
  // form is a future polish (~F11-style work).
  const [editing, setEditing] = useState<unknown | null>(null);
  const [snapshot, setSnapshot] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getNotificationTemplates();
        if (!cancelled) setSnapshot(r.templates ?? {});
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setSnapshot({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.templates.title")}
        </p>
        <p className="mt-1">
          {t("marketing.settings.templates.intro_html")}
        </p>
        <p className="mt-2 text-[10px] text-text-meta">
          {t("marketing.settings.templates.placeholders_prefix")}
          <Code>{`{{from}}`}</Code>{" "}
          <Code>{`{{from_email}}`}</Code> <Code>{`{{subject}}`}</Code>{" "}
          <Code>{`{{seller}}`}</Code> <Code>{`{{seller_email}}`}</Code>{" "}
          <Code>{`{{lead_id}}`}</Code>
          {t("marketing.settings.templates.placeholders_transition_prefix")}
          <Code>{`{{state_from}}`}</Code> · <Code>{`{{state_to}}`}</Code> ·{" "}
          <Code>{`{{reason}}`}</Code>
          {t("marketing.settings.templates.placeholders_meeting_prefix")}
          <Code>{`{{confidence_pct}}`}</Code> · <Code>{`{{evidence}}`}</Code>.
        </p>
      </div>
      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
          {error}
        </div>
      )}
      {snapshot !== null && (
        <NotificationTemplatesEditor
          initial={snapshot as ConfigNotificationTemplates}
          onSave={async (next) => {
            try {
              const r = await saveNotificationTemplates(next);
              setSnapshot(r.templates);
              if (r.restart_required) {
                return {
                  kind: "ok_restart_required",
                  note: t(
                    "marketing.settings.templates.restart_required_note",
                  ),
                };
              }
              return { kind: "ok" };
            } catch (e) {
              return {
                kind: "error",
                message: e instanceof Error ? e.message : String(e),
              };
            }
          }}
        />
      )}
      {snapshot !== null && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setEditing(snapshot)}
        >
          {t("marketing.settings.templates.edit_json")}
        </Button>
      )}
      {editing !== null && (
        <JsonEditorModal
          title={t("marketing.settings.templates.json_title")}
          hint={t("marketing.settings.templates.json_hint")}
          initial={editing}
          onSave={async (parsed) => {
            if (typeof parsed !== "object" || parsed === null) {
              return {
                kind: "error",
                message: t(
                  "marketing.settings.templates.json_object_required",
                ),
              };
            }
            try {
              const r = await saveNotificationTemplates(
                parsed as ConfigNotificationTemplates,
              );
              setSnapshot(r.templates);
              if (r.restart_required) {
                return {
                  kind: "ok_restart_required",
                  note: t(
                    "marketing.settings.templates.restart_required_note",
                  ),
                };
              }
              return { kind: "ok" };
            } catch (e) {
              return {
                kind: "error",
                message: e instanceof Error ? e.message : String(e),
              };
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Guardrails tab (M15.23.d / F30) ─────────────────────────────

/** Mirror of the backend's `guardrail_compile` error detail
 *  (M15.23.d / F30). Set by the PUT handler when
 *  `GuardrailSet::build` rejects the candidate; lets the
 *  frontend highlight the offending rule + pattern inline. */
export interface GuardrailCompileDetail {
  kind: "invalid_pattern" | "duplicate_id" | "empty_rule";
  rule_id: string | null;
  pattern_index: number | null;
  regex_error: string | null;
}

/** Pull the structured detail out of an `HttpError` body if
 *  it matches the guardrail-compile envelope. Robust to any
 *  field being missing — falls back to `null`. */
export function parseGuardrailCompileDetail(
  err: unknown,
): GuardrailCompileDetail | null {
  if (!(err instanceof HttpError)) return null;
  const body = err.body as
    | { code?: string; detail?: Partial<GuardrailCompileDetail> }
    | null
    | undefined;
  if (!body || body.code !== "guardrail_compile" || !body.detail) {
    return null;
  }
  const d = body.detail;
  if (
    d.kind !== "invalid_pattern" &&
    d.kind !== "duplicate_id" &&
    d.kind !== "empty_rule"
  ) {
    return null;
  }
  return {
    kind: d.kind,
    rule_id: typeof d.rule_id === "string" ? d.rule_id : null,
    pattern_index: typeof d.pattern_index === "number" ? d.pattern_index : null,
    regex_error: typeof d.regex_error === "string" ? d.regex_error : null,
  };
}

/** Render-friendly summary of a compile error. Resolves
 *  through the active i18n locale via the static `t`. */
export function summarizeGuardrailCompileDetail(
  d: GuardrailCompileDetail,
): string {
  switch (d.kind) {
    case "invalid_pattern":
      if (d.rule_id !== null && d.pattern_index !== null) {
        return d.regex_error
          ? tStatic("marketing.settings.guardrails.invalid_pattern_with_id", {
              id: d.rule_id,
              index: d.pattern_index,
              error: d.regex_error,
            })
          : tStatic(
              "marketing.settings.guardrails.invalid_pattern_with_id_no_error",
              { id: d.rule_id, index: d.pattern_index },
            );
      }
      return tStatic("marketing.settings.guardrails.invalid_pattern_generic");
    case "duplicate_id":
      return d.rule_id !== null
        ? tStatic("marketing.settings.guardrails.duplicate_with_id", {
            id: d.rule_id,
          })
        : tStatic("marketing.settings.guardrails.duplicate_generic");
    case "empty_rule":
      return d.rule_id !== null
        ? tStatic("marketing.settings.guardrails.empty_with_id", {
            id: d.rule_id,
          })
        : tStatic("marketing.settings.guardrails.empty_generic");
  }
}

/** Operator UI for the topic guardrail YAML. Lists the
 *  current rules + lets the operator edit via a JSON modal.
 *  Server validates: bad regex / dup id / empty pattern list
 *  ⇒ HTTP 400 + typed body, surfaced as the modal's error
 *  banner. */
export function SettingsGuardrails() {
  const t = useT();
  const [rules, setRules] = useState<ConfigGuardrailRule[] | null>(null);
  const [editing, setEditing] = useState<ConfigGuardrailRule[] | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);
  /** F30 — last compile failure surfaced by the backend.
   *  Highlights the offending rule row + paints the rule
   *  list red border. Cleared on a successful save or when
   *  the rules reload. */
  const [compile_error, setCompileError] =
    useState<GuardrailCompileDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getTopicGuardrails();
        if (!cancelled) setRules(r.guardrails ?? []);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.guardrails.title")}
        </p>
        <p className="mt-1">
          {t("marketing.settings.guardrails.intro_prefix")}
          <Code>force_approval</Code>
          {t("marketing.settings.guardrails.intro_force_approval")}
          <Code>block</Code>
          {t("marketing.settings.guardrails.intro_block")}
        </p>
        <p className="mt-2 text-[10px] text-text-meta">
          {t("marketing.settings.guardrails.syntax_prefix")}
          <Code>regex</Code>
          {t("marketing.settings.guardrails.syntax_middle")}
          <Code>(?-i)</Code>
          {t("marketing.settings.guardrails.syntax_suffix")}
        </p>
      </div>
      {load_error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
          {load_error}
        </div>
      )}
      {compile_error && (
        <div
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-800"
          role="alert"
        >
          <p className="font-semibold uppercase tracking-wider text-[10px]">
            {t("marketing.settings.guardrails.compile_error_title")}
          </p>
          <p className="mt-1">
            {summarizeGuardrailCompileDetail(compile_error)}
          </p>
          <p className="mt-1 text-[10px] text-rose-600">
            {t("marketing.settings.guardrails.compile_error_footer")}
          </p>
        </div>
      )}
      {rules !== null && rules.length === 0 && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.guardrails.empty")}
        </p>
      )}
      {rules !== null && rules.length > 0 && (
        <ul className="space-y-1">
          {rules.map((r) => {
            const flagged =
              compile_error !== null && compile_error.rule_id === r.id;
            return (
              <li
                key={r.id}
                data-rule-id={r.id}
                className={`rounded border px-3 py-2 text-xs ${
                  flagged
                    ? "border-rose-400 bg-rose-50 ring-1 ring-rose-200"
                    : " bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      r.action === "block"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {r.action === "block"
                      ? t("marketing.settings.guardrails.action_block")
                      : t(
                          "marketing.settings.guardrails.action_force_approval",
                        )}
                  </span>
                  <span className="font-mono text-text-primary">{r.id}</span>
                  <span className="text-text-secondary">— {r.name}</span>
                  {flagged && (
                    <span
                      className="ml-auto rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800"
                      title={summarizeGuardrailCompileDetail(compile_error!)}
                    >
                      ⚠️ {compile_error!.kind.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.patterns.map((p, i) => {
                    const pattern_flagged =
                      flagged &&
                      compile_error!.kind === "invalid_pattern" &&
                      compile_error!.pattern_index === i;
                    return (
                      <span
                        key={i}
                        className={
                          pattern_flagged
                            ? "ring-1 ring-danger rounded"
                            : ""
                        }
                      >
                        <Code>{p}</Code>
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rules !== null && (
        <Button variant="primary" size="sm" onClick={() => setEditing(rules)}>
          {t("marketing.settings.guardrails.edit_json")}
        </Button>
      )}
      {editing !== null && (
        <JsonEditorModal
          title={t("marketing.settings.guardrails.json_title")}
          hint={t("marketing.settings.guardrails.json_hint")}
          initial={editing}
          onSave={async (parsed) => {
            if (!Array.isArray(parsed)) {
              return {
                kind: "error",
                message: t(
                  "marketing.settings.guardrails.json_array_required",
                ),
              };
            }
            try {
              const r = await saveTopicGuardrails(
                parsed as ConfigGuardrailRule[],
              );
              // Successful save clears any prior compile-error
              // highlight + replaces the displayed list with
              // the just-persisted rows (which include the
              // formerly-flagged rule, now compiling cleanly).
              setCompileError(null);
              setRules(r.guardrails);
              if (r.restart_required) {
                return {
                  kind: "ok_restart_required",
                  note: t(
                    "marketing.settings.guardrails.restart_required_note",
                  ),
                };
              }
              return { kind: "ok" };
            } catch (e) {
              // F30 — extract the structured detail when the
              // backend rejected the candidate. The modal's
              // own banner shows the message; the rule list
              // behind it picks up the highlight on close.
              const detail = parseGuardrailCompileDetail(e);
              if (detail) {
                setCompileError(detail);
                // Optimistically reflect the staged list so
                // the offending rule (which isn't persisted
                // yet) IS visible in the highlighted list
                // while the operator iterates.
                setRules(parsed as ConfigGuardrailRule[]);
                return {
                  kind: "error",
                  message: summarizeGuardrailCompileDetail(detail),
                };
              }
              return {
                kind: "error",
                message: e instanceof Error ? e.message : String(e),
              };
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Draft templates tab (M15.23.b) ──────────────────────────────

/** Operator UI for the draft template library. Same JSON
 *  editor pattern as the notification-templates + guardrails
 *  tabs. */
export function SettingsDraftTemplates() {
  const t = useT();
  const [templates, setTemplates] = useState<ConfigTemplate[] | null>(null);
  const [jsonEditing, setJsonEditing] = useState(false);
  const [formEditing, setFormEditing] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getTemplates();
        if (!cancelled) setTemplates(r.templates ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setTemplates([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: ConfigTemplate[]) => {
    setError(null);
    try {
      const r = await saveTemplates(next);
      setTemplates(r.templates);
      setFormEditing(null);
      return { kind: "ok" as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { kind: "error" as const, message: msg };
    }
  };

  const upsert = async (next: ConfigTemplate) => {
    const before = templates ?? [];
    const exists = before.some((tpl) => tpl.id === next.id);
    const after = exists
      ? before.map((tpl) => (tpl.id === next.id ? next : tpl))
      : [...before, next];
    await persist(after);
  };

  const remove = async (id: string) => {
    const before = templates ?? [];
    if (
      !window.confirm(
        tStatic("marketing.settings.draft_templates.confirm_delete", { id }),
      )
    )
      return;
    await persist(before.filter((tpl) => tpl.id !== id));
  };

  const editingTarget = formEditing
    ? (templates?.find((tpl) => tpl.id === formEditing.id) ?? {
        id: formEditing.id,
        name: "",
        body: "",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.draft_templates.title")}
        </p>
        <p className="mt-1">
          {t("marketing.settings.draft_templates.intro_prefix")}
          <Code>{`{{person.name}}`}</Code>,{" "}
          <Code>{`{{seller.signature}}`}</Code>,{" "}
          <Code>{`{{company.name}}`}</Code>
          {t("marketing.settings.draft_templates.intro_suffix")}
        </p>
        <p className="mt-2 text-[10px] text-text-meta">
          {t("marketing.settings.draft_templates.missing_paths_prefix")}
          <Code>&lt;missing&gt;</Code>
          {t("marketing.settings.draft_templates.missing_paths_suffix")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            setFormEditing({
              id: `template-${Date.now()}`,
              locked: false,
            })
          }
        >
          {t("marketing.settings.draft_templates.new")}
        </Button>
        {templates !== null && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJsonEditing(true)}
          >
            {t("marketing.settings.draft_templates.edit_json")}
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}

      {editingTarget && (
        <TemplateEditor
          initial={editingTarget}
          idLocked={formEditing!.locked}
          onSave={upsert}
          onCancel={() => setFormEditing(null)}
          {...(formEditing!.locked
            ? { onDelete: () => remove(editingTarget.id) }
            : {})}
        />
      )}

      {templates !== null && templates.length === 0 && !formEditing && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.draft_templates.empty")}
        </p>
      )}
      {templates !== null && templates.length > 0 && (
        <ul className="space-y-1">
          {templates.map((tpl) => (
            <li key={tpl.id}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setFormEditing({ id: tpl.id, locked: true })}
                data-testid={`template-card-${tpl.id}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-text-primary">{tpl.id}</span>
                  <span className="text-text-secondary">— {tpl.name}</span>
                </div>
                {tpl.description && (
                  <p className="mt-1 text-[10px] text-text-meta">
                    {tpl.description}
                  </p>
                )}
                <pre className="mt-1 overflow-auto rounded bg-slate-50 px-2 py-1 font-mono text-[10px] text-text-primary">
                  {tpl.body}
                </pre>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {jsonEditing && (
        <JsonEditorModal
          title={t("marketing.settings.draft_templates.json_title")}
          hint={t("marketing.settings.draft_templates.json_hint")}
          initial={templates ?? []}
          onSave={async (parsed) => {
            if (!Array.isArray(parsed)) {
              return {
                kind: "error",
                message: t(
                  "marketing.settings.draft_templates.json_array_required",
                ),
              };
            }
            return persist(parsed as ConfigTemplate[]);
          }}
          onClose={() => setJsonEditing(false)}
        />
      )}
    </div>
  );
}

// ── Draft AI template tab ───────────────────────────────────────

/** Operator UI for the per-tenant Handlebars template the
 *  M15.21-slice-4 draft generator renders. Edit-in-place
 *  textarea + "Reset to default" affordance. Server
 *  sandbox-validates on PUT — broken Handlebars surfaces
 *  inline so the operator can fix it without leaving the
 *  page. */
export function SettingsDraftAiTemplate() {
  const t = useT();
  const [config, setConfig] = useState<DraftTemplateConfig | null>(null);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getDraftTemplate();
        if (cancelled) return;
        setConfig(r);
        setDraft(r.template);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setSavedToast(false);
    try {
      await saveDraftTemplate(draft);
      // Refetch so source flips to "tenant" + UI reflects
      // the canonical persisted body.
      const r = await getDraftTemplate();
      setConfig(r);
      setDraft(r.template);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (e) {
      if (e instanceof HttpError) {
        const body = e.body as { code?: string; message?: string } | string;
        const code =
          typeof body === "object" && body && "code" in body
            ? body.code
            : `http_${e.status}`;
        const msg =
          typeof body === "object" && body && "message" in body
            ? body.message
            : null;
        setError(msg ? `${code} · ${msg}` : (code ?? `http_${e.status}`));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    if (config) setDraft(config.default_template);
  };

  const onPreview = async () => {
    setPreviewBusy(true);
    setError(null);
    setPreviewBody(null);
    try {
      const trimmedHint = hint.trim();
      const r = await previewDraftTemplate({
        template: draft,
        ...(trimmedHint.length > 0 ? { operator_hint: trimmedHint } : {}),
      });
      setPreviewBody(r.rendered);
    } catch (e) {
      if (e instanceof HttpError) {
        const body = e.body as { code?: string; message?: string } | string;
        const code =
          typeof body === "object" && body && "code" in body
            ? body.code
            : `http_${e.status}`;
        const msg =
          typeof body === "object" && body && "message" in body
            ? body.message
            : null;
        setError(msg ? `${code} · ${msg}` : (code ?? `http_${e.status}`));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.draft_ai.title")}
        </p>
        <p className="mt-1">{t("marketing.settings.draft_ai.intro")}</p>
        <p className="mt-2 text-[10px] text-text-meta">
          {t("marketing.settings.draft_ai.variables_prefix")}
          <Code>{`{{lead.subject}}`}</Code>,{" "}
          <Code>{`{{seller.name}}`}</Code>,{" "}
          <Code>{`{{seller.signature_text}}`}</Code>,{" "}
          <Code>{`{{last_inbound.body}}`}</Code>,{" "}
          <Code>{`{{last_inbound.from_label}}`}</Code>,{" "}
          <Code>{`{{operator_hint}}`}</Code>
          {t("marketing.settings.draft_ai.variables_blocks")}
          <Code>{`{{#if}}`}</Code>
          {t("marketing.settings.draft_ai.variables_blocks_middle")}
          <Code>{`{{#each}}`}</Code>
          {t("marketing.settings.draft_ai.variables_blocks_suffix")}
        </p>
      </div>
      {config !== null && (
        <div className="flex items-center gap-2 text-[11px] text-text-meta">
          <span>
            {t("marketing.settings.draft_ai.source_label")}
            <span
              className={
                config.source === "tenant"
                  ? "font-semibold text-emerald-700"
                  : "italic"
              }
            >
              {config.source}
            </span>
          </span>
          {savedToast && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
              {t("marketing.settings.draft_ai.saved_toast")}
            </span>
          )}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}
      {config === null && !error && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.draft_ai.loading")}
        </p>
      )}
      {config !== null && (
        <>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            disabled={busy}
            spellCheck={false}
            className="w-full rounded border  bg-white p-3 font-mono text-[11px] leading-relaxed text-text-primary outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={busy || draft.trim().length === 0}
            >
              {busy
                ? t("marketing.settings.draft_ai.saving")
                : t("marketing.settings.draft_ai.save")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onPreview}
              disabled={previewBusy || busy || draft.trim().length === 0}
            >
              {previewBusy
                ? t("marketing.settings.draft_ai.rendering")
                : t("marketing.settings.draft_ai.preview")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={busy}
            >
              {t("marketing.settings.draft_ai.reset")}
            </Button>
            <span className="ml-auto text-[10px] text-text-meta">
              {t("marketing.settings.draft_ai.chars", { count: draft.length })}
            </span>
          </div>
          <details className="rounded border  bg-white p-2 text-[11px] text-text-secondary">
            <summary className="cursor-pointer font-medium">
              {t("marketing.settings.draft_ai.preview_summary")}
            </summary>
            <Input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t("marketing.settings.draft_ai.preview_placeholder")}
              disabled={previewBusy}
              className="mt-2 w-full rounded border  bg-white px-2 py-1 text-xs outline-none focus:border-indigo-400 disabled:opacity-60"
            />
            <p className="mt-1 text-[10px] text-text-meta">
              {t("marketing.settings.draft_ai.preview_note")}
            </p>
          </details>
          {previewBody !== null && (
            <div
              data-testid="draft-template-preview"
              className="rounded border border-emerald-200 bg-emerald-50/50 p-3"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                {t("marketing.settings.draft_ai.preview_render")}
              </p>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-800">
                {previewBody}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Snippets tab (M15.23.b) ─────────────────────────────────────

/** Operator UI for inline reusable snippets. Each carries an
 *  optional `shortcut` that the draft editor (post-M22) maps
 *  to keyboard insertion. */
export function SettingsSnippets() {
  const t = useT();
  const [snippets, setSnippets] = useState<ConfigSnippet[] | null>(null);
  const [jsonEditing, setJsonEditing] = useState(false);
  const [formEditing, setFormEditing] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getSnippets();
        if (!cancelled) setSnippets(r.snippets ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setSnippets([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: ConfigSnippet[]) => {
    setError(null);
    try {
      const r = await saveSnippets(next);
      setSnippets(r.snippets);
      setFormEditing(null);
      return { kind: "ok" as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { kind: "error" as const, message: msg };
    }
  };

  const upsert = async (next: ConfigSnippet) => {
    const before = snippets ?? [];
    const exists = before.some((s) => s.id === next.id);
    const after = exists
      ? before.map((s) => (s.id === next.id ? next : s))
      : [...before, next];
    await persist(after);
  };

  const remove = async (id: string) => {
    const before = snippets ?? [];
    if (
      !window.confirm(
        tStatic("marketing.settings.snippets.confirm_delete", { id }),
      )
    )
      return;
    await persist(before.filter((s) => s.id !== id));
  };

  const editingTarget = formEditing
    ? (snippets?.find((s) => s.id === formEditing.id) ?? {
        id: formEditing.id,
        name: "",
        body: "",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.snippets.title")}
        </p>
        <p className="mt-1">
          {t("marketing.settings.snippets.intro_prefix")}
          <Code>shortcut</Code>
          {t("marketing.settings.snippets.intro_middle")}
          <Code>/saludo</Code>
          {t("marketing.settings.snippets.intro_middle2")}
          <Code>/firma</Code>
          {t("marketing.settings.snippets.intro_suffix")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            setFormEditing({
              id: `snippet-${Date.now()}`,
              locked: false,
            })
          }
        >
          {t("marketing.settings.snippets.new")}
        </Button>
        {snippets !== null && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJsonEditing(true)}
          >
            {t("marketing.settings.snippets.edit_json")}
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}

      {editingTarget && (
        <SnippetEditor
          initial={editingTarget}
          idLocked={formEditing!.locked}
          onSave={upsert}
          onCancel={() => setFormEditing(null)}
          {...(formEditing!.locked
            ? { onDelete: () => remove(editingTarget.id) }
            : {})}
        />
      )}

      {snippets !== null && snippets.length === 0 && !formEditing && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.snippets.empty")}
        </p>
      )}

      {snippets !== null && snippets.length > 0 && (
        <ul className="space-y-1">
          {snippets.map((s) => (
            <li key={s.id}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setFormEditing({ id: s.id, locked: true })}
                data-testid={`snippet-card-${s.id}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-text-primary">{s.id}</span>
                  <span className="text-text-secondary">— {s.name}</span>
                  {s.shortcut && (
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] text-violet-800">
                      {s.shortcut}
                    </span>
                  )}
                </div>
                <pre className="mt-1 overflow-auto rounded bg-slate-50 px-2 py-1 font-mono text-[10px] text-text-primary">
                  {s.body}
                </pre>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {jsonEditing && (
        <JsonEditorModal
          title={t("marketing.settings.snippets.json_title")}
          hint={t("marketing.settings.snippets.json_hint")}
          initial={snippets ?? []}
          onSave={async (parsed) => {
            if (!Array.isArray(parsed)) {
              return {
                kind: "error",
                message: t("marketing.settings.snippets.json_array_required"),
              };
            }
            return persist(parsed as ConfigSnippet[]);
          }}
          onClose={() => setJsonEditing(false)}
        />
      )}
    </div>
  );
}

// ── Audit tab (F27) ─────────────────────────────────────────────

/** Stable kind-label palette so the row badge color tracks
 *  the audit kind regardless of which event variant landed. */
const AUDIT_KIND_BADGE: Record<MarketingAuditEvent["kind"], string> = {
  routing_decided: "bg-sky-100 text-sky-800",
  lead_transitioned: "bg-violet-100 text-violet-800",
  notification_published: "bg-emerald-100 text-emerald-800",
  topic_guardrail_fired: "bg-amber-100 text-amber-800",
  duplicate_person_detected: "bg-rose-100 text-rose-800",
};

const AUDIT_KIND_OPTIONS: readonly {
  value: MarketingAuditEvent["kind"] | "";
  labelKey: CatalogKey;
}[] = [
  { value: "", labelKey: "marketing.settings.audit.kind_all" },
  {
    value: "routing_decided",
    labelKey: "marketing.settings.audit.kind_routing_decided",
  },
  {
    value: "lead_transitioned",
    labelKey: "marketing.settings.audit.kind_lead_transitioned",
  },
  {
    value: "notification_published",
    labelKey: "marketing.settings.audit.kind_notification_published",
  },
  {
    value: "topic_guardrail_fired",
    labelKey: "marketing.settings.audit.kind_topic_guardrail_fired",
  },
  {
    value: "duplicate_person_detected",
    labelKey: "marketing.settings.audit.kind_duplicate_person_detected",
  },
];

/** Distill an audit event into a one-line summary the
 *  table cell renders. Kept pure + exported for unit
 *  testing — every variant covered explicitly so a future
 *  audit kind landing without a renderer surfaces as a
 *  TS compile error. */
export function summarizeAuditEvent(e: MarketingAuditEvent): string {
  switch (e.kind) {
    case "routing_decided":
      return e.chosen_seller_id
        ? `→ ${e.chosen_seller_id} · ${e.from_email}${
            e.rule_id ? ` (rule:${e.rule_id})` : ""
          } · score ${e.score}`
        : `dropped · ${e.from_email}${e.rule_id ? ` (rule:${e.rule_id})` : ""}`;
    case "lead_transitioned":
      return `${e.from} → ${e.to}${e.reason ? ` · ${e.reason}` : ""}`;
    case "notification_published":
      return `${e.notification_kind} · ${e.channel} · seller ${e.seller_id}`;
    case "topic_guardrail_fired":
      return `${e.rule_name} (${e.action}) · "${e.excerpt}"`;
    case "duplicate_person_detected":
      return `${Math.round(e.confidence * 100)}% · ${e.signal} · ${e.detail}`;
  }
}

function formatAuditTimestamp(at_ms: number): string {
  const d = new Date(at_ms);
  if (Number.isNaN(d.getTime())) return "?";
  return d.toLocaleString();
}

/** F27 — operator-facing audit log browser. Reads
 *  `/api/marketing/audit` with filters; mirrors the
 *  backend's `ListFilter` shape so future filter columns
 *  map 1:1. Empty-state copy clarifies tenant scoping
 *  (rows only ever match the operator's active tenant). */
export function SettingsAudit() {
  const t = useT();
  const [events, setEvents] = useState<MarketingAuditEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded_at_ms, setExpandedAtMs] = useState<number | null>(null);

  // Filter inputs are draft-state — only `applied` filters
  // hit the backend so typing a lead_id doesn't fire a
  // GET per keystroke.
  const [draft_kind, setDraftKind] = useState<MarketingAuditEvent["kind"] | "">(
    "",
  );
  const [draft_lead_id, setDraftLeadId] = useState("");
  const [draft_limit, setDraftLimit] = useState(100);
  const [applied, setApplied] = useState<{
    kind: MarketingAuditEvent["kind"] | "";
    lead_id: string;
    limit: number;
  }>({ kind: "", lead_id: "", limit: 100 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const r = await getAudit({
          ...(applied.kind ? { kind: applied.kind } : {}),
          ...(applied.lead_id ? { lead_id: applied.lead_id } : {}),
          limit: applied.limit,
        });
        if (!cancelled) setEvents(r.events);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const apply_filters = () => {
    setApplied({
      kind: draft_kind,
      lead_id: draft_lead_id.trim(),
      limit: Math.max(1, Math.min(1000, draft_limit)),
    });
    setExpandedAtMs(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded border  bg-white p-4 text-xs text-text-secondary">
        <p className="font-medium text-text-primary">
          {t("marketing.settings.audit.title")}
        </p>
        <p className="mt-1">{t("marketing.settings.audit.intro")}</p>
      </div>

      {/* Filter strip */}
      <div className="rounded border  bg-white px-3 py-2">
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-meta">
              {t("marketing.settings.audit.filter_kind")}
            </span>
            <Select
              value={draft_kind}
              onChange={(e) =>
                setDraftKind(e.target.value as MarketingAuditEvent["kind"] | "")
              }
              className="rounded border  bg-white px-2 py-1 text-xs"
            >
              {AUDIT_KIND_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-meta">
              {t("marketing.settings.audit.filter_lead_id")}
            </span>
            <Input
              value={draft_lead_id}
              onChange={(e) => setDraftLeadId(e.target.value)}
              placeholder={t(
                "marketing.settings.audit.filter_lead_id_placeholder",
              )}
              className="rounded border  bg-white px-2 py-1 text-xs font-mono"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-meta">
              {t("marketing.settings.audit.filter_limit")}
            </span>
            <Input
              type="number"
              min={1}
              max={1000}
              value={draft_limit}
              onChange={(e) => setDraftLimit(Number(e.target.value) || 100)}
              className="rounded border  bg-white px-2 py-1 text-xs w-20"
            />
          </label>
          <Button variant="primary" size="sm" onClick={apply_filters}>
            {t("marketing.settings.audit.apply")}
          </Button>
          {(applied.kind || applied.lead_id) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraftKind("");
                setDraftLeadId("");
                setDraftLimit(100);
                setApplied({ kind: "", lead_id: "", limit: 100 });
                setExpandedAtMs(null);
              }}
            >
              {t("marketing.settings.audit.clear")}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.audit.loading")}
        </p>
      )}

      {!loading && events !== null && events.length === 0 && (
        <p className="text-xs text-text-meta italic">
          {t("marketing.settings.audit.empty")}
        </p>
      )}

      {!loading && events !== null && events.length > 0 && (
        <ul className="space-y-1">
          {events.map((e) => {
            const summary = summarizeAuditEvent(e);
            const expanded = expanded_at_ms === e.at_ms;
            return (
              <li
                key={`${e.kind}-${e.at_ms}-${
                  "lead_id" in e ? (e.lead_id ?? "") : ""
                }`}
                className="rounded border  bg-white text-xs"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedAtMs(expanded ? null : e.at_ms)}
                >
                  <span className="text-[10px] tabular-nums text-text-meta">
                    {formatAuditTimestamp(e.at_ms)}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      AUDIT_KIND_BADGE[e.kind]
                    }`}
                  >
                    {e.kind.replace(/_/g, " ")}
                  </span>
                  {"lead_id" in e && e.lead_id && (
                    <span className="font-mono text-[10px] text-text-primary">
                      {e.lead_id}
                    </span>
                  )}
                  <span className="flex-1 truncate text-text-secondary">
                    {summary}
                  </span>
                  <span className="text-[10px] text-text-meta">
                    {expanded ? "▾" : "▸"}
                  </span>
                </Button>
                {expanded && (
                  <pre className="border-t  bg-slate-50 px-3 py-2 font-mono text-[10px] text-text-primary overflow-x-auto">
                    {JSON.stringify(e, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Shared SourceBanner ─────────────────────────────────────────

/** Surfaces the live/mock/error/loading state for each Settings
 *  tab. Renders nothing when the slice is `api` (no banner =
 *  live data, the per-row "live" pills already convey it). */
function SourceBanner({
  source,
  error,
}: {
  source: "api" | "mock" | "loading" | "error";
  error: string | null;
}) {
  const t = useT();
  if (source === "api") return null;
  const label =
    source === "loading"
      ? t("marketing.settings.source.loading")
      : source === "error"
        ? t("marketing.settings.source.error", {
            error: error ?? t("marketing.settings.source.error_unknown"),
          })
        : t("marketing.settings.source.mock");
  const tone =
    source === "error"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : source === "loading"
        ? "bg-slate-50 text-slate-500 ring-slate-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <div
      className={`rounded-md px-2.5 py-1.5 text-[10px] ring-1 ${tone}`}
      role="status"
    >
      {label}
    </div>
  );
}
