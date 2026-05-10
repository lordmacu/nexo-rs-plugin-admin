// Form editor for one routing rule + its sub-components
// (predicate-condition rows, assign-target picker). Mirrors
// `nexo-tool-meta::marketing::{RoutingRule, RulePredicate,
// AssignTarget}` wire shapes.
//
// Predicate kinds covered:
// - sender_domain_kind  { value: 'personal' | 'corporate' | 'disposable' }
// - sender_email_matches { pattern }
// - company_industry    { value }
// - person_has_tag      { tag }
// - score_gte           { score }
// - body_contains       { needle }
// - subject_contains    { needle }
//
// Assign target kinds:
// - seller       { id }
// - round_robin  { pool: id[] }
// - drop

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Checkbox, Input, Select } from "../../../components/ui";
import { useT } from "../../../i18n";
import type { CatalogKey } from "../../../i18n";

export type DomainKind = "personal" | "corporate" | "disposable";

export type RulePredicate =
  | { kind: "sender_domain_kind"; value: DomainKind }
  | { kind: "sender_email_matches"; pattern: string }
  | { kind: "company_industry"; value: string }
  | { kind: "person_has_tag"; tag: string }
  | { kind: "score_gte"; score: number }
  | { kind: "body_contains"; needle: string }
  | { kind: "subject_contains"; needle: string };

export type AssignTarget =
  | { kind: "seller"; id: string }
  | { kind: "round_robin"; pool: string[] }
  | { kind: "drop" };

export interface RoutingRule {
  id: string;
  name: string;
  conditions: RulePredicate[];
  assigns_to: AssignTarget;
  followup_profile: string;
  active: boolean;
}

const PREDICATE_KINDS: Array<{
  kind: RulePredicate["kind"];
  labelKey: CatalogKey;
}> = [
  { kind: "sender_domain_kind", labelKey: "marketing.routing_rule.predicate.domain_kind" },
  { kind: "sender_email_matches", labelKey: "marketing.routing_rule.predicate.sender_email" },
  { kind: "company_industry", labelKey: "marketing.routing_rule.predicate.company_industry" },
  { kind: "person_has_tag", labelKey: "marketing.routing_rule.predicate.person_tag" },
  { kind: "score_gte", labelKey: "marketing.routing_rule.predicate.score_gte" },
  { kind: "body_contains", labelKey: "marketing.routing_rule.predicate.body_contains" },
  { kind: "subject_contains", labelKey: "marketing.routing_rule.predicate.subject_contains" },
];

/** Build a fresh predicate of the chosen kind with sane
 *  defaults so the operator never sees a half-empty
 *  payload. Exported for testing. */
export function blankPredicate(kind: RulePredicate["kind"]): RulePredicate {
  switch (kind) {
    case "sender_domain_kind":
      return { kind, value: "corporate" };
    case "sender_email_matches":
      return { kind, pattern: "" };
    case "company_industry":
      return { kind, value: "" };
    case "person_has_tag":
      return { kind, tag: "" };
    case "score_gte":
      return { kind, score: 50 };
    case "body_contains":
      return { kind, needle: "" };
    case "subject_contains":
      return { kind, needle: "" };
  }
}

interface PredicateRowProps {
  readonly value: RulePredicate;
  readonly onChange: (next: RulePredicate) => void;
  readonly onRemove: () => void;
  readonly idx: number;
}

function PredicateRow({ value, onChange, onRemove, idx }: PredicateRowProps) {
  const t = useT();
  const setKind = (kind: RulePredicate["kind"]) =>
    onChange(blankPredicate(kind));

  return (
    <li
      data-testid={`predicate-row-${idx}`}
      className="flex flex-wrap items-center gap-2 rounded border  bg-white p-2 text-[11px]"
    >
      <Select
        value={value.kind}
        onChange={(e) => setKind(e.target.value as RulePredicate["kind"])}
        aria-label={`predicate-kind-${idx}`}
        className="rounded border  bg-white px-2 py-1 text-[11px]"
      >
        {PREDICATE_KINDS.map((p) => (
          <option key={p.kind} value={p.kind}>
            {t(p.labelKey)}
          </option>
        ))}
      </Select>
      <PredicateBody value={value} onChange={onChange} idx={idx} />
      <Button
        variant="secondary"
        size="md"
        onClick={onRemove}
        aria-label={`predicate-remove-${idx}`}
      >
        <Trash2 size={11} />
      </Button>
    </li>
  );
}

function PredicateBody({
  value,
  onChange,
  idx,
}: {
  value: RulePredicate;
  onChange: (next: RulePredicate) => void;
  idx: number;
}) {
  const t = useT();
  switch (value.kind) {
    case "sender_domain_kind":
      return (
        <Select
          value={value.value}
          onChange={(e) =>
            onChange({
              kind: "sender_domain_kind",
              value: e.target.value as DomainKind,
            })
          }
          aria-label={`predicate-value-${idx}`}
          className="rounded border  bg-white px-2 py-1 text-[11px]"
        >
          <option value="corporate">corporate</option>
          <option value="personal">personal</option>
          <option value="disposable">disposable</option>
        </Select>
      );
    case "sender_email_matches":
      return (
        <Input
          value={value.pattern}
          onChange={(e) =>
            onChange({
              kind: "sender_email_matches",
              pattern: e.target.value,
            })
          }
          placeholder={t("marketing.routing_rule.placeholder.sender_pattern")}
          aria-label={`predicate-value-${idx}`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
    case "company_industry":
      return (
        <Input
          value={value.value}
          onChange={(e) =>
            onChange({ kind: "company_industry", value: e.target.value })
          }
          placeholder={t("marketing.routing_rule.placeholder.industry")}
          aria-label={`predicate-value-${idx}`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
    case "person_has_tag":
      return (
        <Input
          value={value.tag}
          onChange={(e) =>
            onChange({ kind: "person_has_tag", tag: e.target.value })
          }
          placeholder={t("marketing.routing_rule.placeholder.tag")}
          aria-label={`predicate-value-${idx}`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
    case "score_gte":
      return (
        <Input
          type="number"
          min={0}
          max={100}
          value={value.score}
          onChange={(e) =>
            onChange({
              kind: "score_gte",
              score: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
            })
          }
          aria-label={`predicate-value-${idx}`}
          className="w-20 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
    case "body_contains":
      return (
        <Input
          value={value.needle}
          onChange={(e) =>
            onChange({ kind: "body_contains", needle: e.target.value })
          }
          placeholder={t("marketing.routing_rule.placeholder.body")}
          aria-label={`predicate-value-${idx}`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
    case "subject_contains":
      return (
        <Input
          value={value.needle}
          onChange={(e) =>
            onChange({ kind: "subject_contains", needle: e.target.value })
          }
          placeholder={t("marketing.routing_rule.placeholder.subject")}
          aria-label={`predicate-value-${idx}`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      );
  }
}

interface AssignTargetPickerProps {
  readonly value: AssignTarget;
  readonly onChange: (next: AssignTarget) => void;
  readonly availableSellerIds: readonly string[];
  readonly testidPrefix: string;
}

export function AssignTargetPicker({
  value,
  onChange,
  availableSellerIds,
  testidPrefix,
}: AssignTargetPickerProps) {
  const t = useT();
  const [poolDraft, setPoolDraft] = useState(
    value.kind === "round_robin" ? value.pool.join(", ") : "",
  );

  const setKind = (kind: AssignTarget["kind"]) => {
    if (kind === "drop") onChange({ kind: "drop" });
    else if (kind === "seller")
      onChange({ kind: "seller", id: availableSellerIds[0] ?? "" });
    else onChange({ kind: "round_robin", pool: [] });
  };

  return (
    <div
      data-testid={testidPrefix}
      className="flex flex-wrap items-center gap-2 text-[11px]"
    >
      <Select
        value={value.kind}
        onChange={(e) => setKind(e.target.value as AssignTarget["kind"])}
        aria-label={`${testidPrefix}-kind`}
        className="rounded border  bg-white px-2 py-1 text-[11px]"
      >
        <option value="seller">{t("marketing.routing_rule.assign_seller")}</option>
        <option value="round_robin">
          {t("marketing.routing_rule.assign_round_robin")}
        </option>
        <option value="drop">{t("marketing.routing_rule.assign_drop")}</option>
      </Select>
      {value.kind === "seller" && (
        <Input
          value={value.id}
          onChange={(e) => onChange({ kind: "seller", id: e.target.value })}
          placeholder={t("marketing.routing_rule.placeholder.seller_id")}
          aria-label={`${testidPrefix}-seller-id`}
          list={`${testidPrefix}-seller-list`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      )}
      {value.kind === "seller" && (
        <datalist id={`${testidPrefix}-seller-list`}>
          {availableSellerIds.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      )}
      {value.kind === "round_robin" && (
        <Input
          value={poolDraft}
          onChange={(e) => {
            setPoolDraft(e.target.value);
            const pool = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ kind: "round_robin", pool });
          }}
          placeholder={t("marketing.routing_rule.placeholder.pool")}
          aria-label={`${testidPrefix}-pool`}
          className="flex-1 rounded border  bg-white px-2 py-1 text-[11px]"
        />
      )}
      {value.kind === "drop" && (
        <span className="italic text-text-meta">
          {t("marketing.routing_rule.drop_silent")}
        </span>
      )}
    </div>
  );
}

interface Props {
  readonly initial: RoutingRule;
  readonly idLocked: boolean;
  readonly availableSellerIds: readonly string[];
  readonly availableFollowupProfiles: readonly string[];
  readonly onSave: (next: RoutingRule) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export default function RoutingRuleEditor({
  initial,
  idLocked,
  availableSellerIds,
  availableFollowupProfiles,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState<RoutingRule>(initial);

  const updateCondition = (idx: number, next: RulePredicate) =>
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === idx ? next : c)),
    }));

  const removeCondition = (idx: number) =>
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.filter((_, i) => i !== idx),
    }));

  const addCondition = () =>
    setDraft((d) => ({
      ...d,
      conditions: [...d.conditions, blankPredicate("sender_domain_kind")],
    }));

  const idValid = draft.id.trim().length > 0;
  const nameValid = draft.name.trim().length > 0;
  const canSave = idValid && nameValid;

  return (
    <div
      data-testid="routing-rule-editor"
      className="space-y-3 rounded border border-indigo-200 bg-indigo-50/30 p-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.routing_rule.id")}
          <Input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            disabled={idLocked}
            aria-label="rule-id"
            className="rounded border  bg-white px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.routing_rule.name")}
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            aria-label="rule-name"
            className="rounded border  bg-white px-2 py-1 text-xs"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
        <label className="flex items-center gap-1">
          <Checkbox
            checked={draft.active}
            onChange={(e) =>
              setDraft((d) => ({ ...d, active: e.target.checked }))
            }
            aria-label="rule-active"
          />
          {t("marketing.routing_rule.active")}
        </label>
        <label className="flex items-center gap-1.5">
          {t("marketing.routing_rule.followup_profile")}
          <Select
            value={draft.followup_profile}
            onChange={(e) =>
              setDraft((d) => ({ ...d, followup_profile: e.target.value }))
            }
            aria-label="rule-followup"
            className="rounded border  bg-white px-2 py-1 text-[11px]"
          >
            <option value="">
              {t("marketing.routing_rule.followup_default")}
            </option>
            {availableFollowupProfiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-text-secondary">
          {t("marketing.routing_rule.conditions_title")}
        </p>
        {draft.conditions.length === 0 && (
          <p className="text-[11px] italic text-text-meta">
            {t("marketing.routing_rule.no_conditions")}
          </p>
        )}
        <ol className="space-y-1.5">
          {draft.conditions.map((c, idx) => (
            <PredicateRow
              key={idx}
              idx={idx}
              value={c}
              onChange={(next) => updateCondition(idx, next)}
              onRemove={() => removeCondition(idx)}
            />
          ))}
        </ol>
        <Button
          variant="secondary"
          size="sm"
          onClick={addCondition}
          aria-label="predicate-add"
        >
          <Plus size={11} />
          {t("marketing.routing_rule.add_condition")}
        </Button>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-text-secondary">
          {t("marketing.routing_rule.assigns_to")}
        </p>
        <AssignTargetPicker
          value={draft.assigns_to}
          onChange={(next) => setDraft((d) => ({ ...d, assigns_to: next }))}
          availableSellerIds={availableSellerIds}
          testidPrefix="rule-assigns-to"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSave(draft)}
          disabled={!canSave}
        >
          {t("common.save")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>
            {t("marketing.routing_rule.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
