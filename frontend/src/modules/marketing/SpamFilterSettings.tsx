// Settings tab — tenant-customizable spam / promo filter.
//
// Sections:
//   1. Sensitivity preset (RadioCards: Lax / Balanced / Strict / Custom).
//   2. Custom thresholds (only visible when Custom is selected).
//   3. Block / allow lists for domains, keywords, senders.
//   4. Dry-run test panel — paste a sample message + see what
//      the active rules would say.
//
// All copy goes through `useT()` against keys in
// `marketing.spamFilter.*` (es + en mirrored).

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  addSpamFilterRule,
  deleteSpamFilterRule,
  getSpamFilter,
  putSpamFilterConfig,
  testSpamFilter,
  type RuleKind,
  type SpamFilterConfig,
  type SpamFilterRule,
  type SpamFilterState,
  type Strictness,
  type TestResult,
  type ThresholdSet,
} from "../../api/spamFilter";
import { Button, Card, Checkbox, Input, RadioCard, Textarea } from "../../components/ui";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";
import { HttpError } from "../../api/client";

export default function SpamFilterSettings() {
  const t = useT();
  const [state, setState] = useState<SpamFilterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await getSpamFilter();
        if (!cancelled) setState(fresh);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">…</div>;
  }
  if (!state) {
    return (
      <div className="p-4 text-sm text-danger">{error ?? "—"}</div>
    );
  }

  const cfg = state.config;
  const rules = state.rules;

  async function saveConfig(next: { strictness: Strictness; thresholds?: ThresholdSet }) {
    setSaving(true);
    setSavedHint(null);
    setError(null);
    try {
      const result = await putSpamFilterConfig(next);
      setState((s) => (s ? { ...s, config: result.config } : s));
      setSavedHint(t("marketing.spamFilter.save_ok"));
    } catch (e) {
      setError(t("marketing.spamFilter.save_failed", { message: formatErr(e) }));
    } finally {
      setSaving(false);
    }
  }

  async function addRule(kind: RuleKind, value: string) {
    if (!value.trim()) return;
    try {
      const { rule } = await addSpamFilterRule({ kind, value });
      setState((s) =>
        s
          ? {
              ...s,
              rules: [rule, ...s.rules.filter((r) => r.id !== rule.id)],
              rule_count: s.rule_count + (s.rules.some((r) => r.id === rule.id) ? 0 : 1),
            }
          : s,
      );
    } catch (e) {
      setError(
        t("marketing.spamFilter.rule_add_failed", { message: formatErr(e) }),
      );
    }
  }

  async function removeRule(rule: SpamFilterRule) {
    try {
      await deleteSpamFilterRule(rule.id);
      setState((s) =>
        s
          ? {
              ...s,
              rules: s.rules.filter((r) => r.id !== rule.id),
              rule_count: Math.max(0, s.rule_count - 1),
            }
          : s,
      );
    } catch (e) {
      setError(
        t("marketing.spamFilter.rule_delete_failed", { message: formatErr(e) }),
      );
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-text-primary">
          {t("marketing.spamFilter.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-text-secondary">
          {t("marketing.spamFilter.subtitle")}
        </p>
      </header>

      {(error || savedHint) && (
        <div
          className={`rounded border px-3 py-2 text-xs ${
            error
              ? "border-danger bg-danger/10 text-danger"
              : "border-success bg-success/10 text-success"
          }`}
        >
          {error ?? savedHint}
        </div>
      )}

      <SensitivityCard cfg={cfg} disabled={saving} onChange={saveConfig} />
      {cfg.strictness === "custom" && (
        <CustomThresholdsCard cfg={cfg} disabled={saving} onChange={saveConfig} />
      )}
      <RulesCard rules={rules} onAdd={addRule} onRemove={removeRule} />
      <TestCard />
    </div>
  );
}

// ── Sensitivity preset card ─────────────────────────────────────

const PRESETS: ReadonlyArray<{
  value: Strictness;
  labelKey: CatalogKey;
  descKey: CatalogKey;
}> = [
  {
    value: "lax",
    labelKey: "marketing.spamFilter.sensitivity.preset.lax",
    descKey: "marketing.spamFilter.sensitivity.preset.lax_desc",
  },
  {
    value: "balanced",
    labelKey: "marketing.spamFilter.sensitivity.preset.balanced",
    descKey: "marketing.spamFilter.sensitivity.preset.balanced_desc",
  },
  {
    value: "strict",
    labelKey: "marketing.spamFilter.sensitivity.preset.strict",
    descKey: "marketing.spamFilter.sensitivity.preset.strict_desc",
  },
  {
    value: "custom",
    labelKey: "marketing.spamFilter.sensitivity.preset.custom",
    descKey: "marketing.spamFilter.sensitivity.preset.custom_desc",
  },
];

function SensitivityCard(props: {
  cfg: SpamFilterConfig;
  disabled: boolean;
  onChange: (next: { strictness: Strictness; thresholds?: ThresholdSet }) => void;
}) {
  const t = useT();
  return (
    <Card>
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          {t("marketing.spamFilter.sensitivity.title")}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {t("marketing.spamFilter.sensitivity.subtitle")}
        </p>
      </div>
      <ul role="radiogroup" className="space-y-2 px-4 py-3">
        {PRESETS.map((p) => (
          <RadioCard
            key={p.value}
            name="spam-strictness"
            selected={props.cfg.strictness === p.value}
            disabled={props.disabled}
            onSelect={() =>
              props.onChange({
                strictness: p.value,
                thresholds: props.cfg.thresholds,
              })
            }
          >
            <span className="block text-sm font-medium text-text-primary">
              {t(p.labelKey)}
            </span>
            <span className="block text-xs text-text-secondary">
              {t(p.descKey)}
            </span>
          </RadioCard>
        ))}
      </ul>
    </Card>
  );
}

// ── Custom thresholds card ──────────────────────────────────────

function CustomThresholdsCard(props: {
  cfg: SpamFilterConfig;
  disabled: boolean;
  onChange: (next: { strictness: Strictness; thresholds?: ThresholdSet }) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<ThresholdSet>(props.cfg.thresholds);

  function commit(next: ThresholdSet) {
    setDraft(next);
    props.onChange({ strictness: "custom", thresholds: next });
  }

  return (
    <Card>
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          {t("marketing.spamFilter.sensitivity.preset.custom")}
        </h2>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <Checkbox
          checked={draft.image_only_drop}
          onChange={(e) =>
            commit({ ...draft, image_only_drop: e.target.checked })
          }
        >
          {t("marketing.spamFilter.thresholds.image_only_drop")}
        </Checkbox>
        <Checkbox
          checked={draft.image_heavy_drop}
          onChange={(e) =>
            commit({ ...draft, image_heavy_drop: e.target.checked })
          }
        >
          {t("marketing.spamFilter.thresholds.image_heavy_drop")}
        </Checkbox>
        <NumberRow
          label={t("marketing.spamFilter.thresholds.image_heavy_min_count")}
          value={draft.image_heavy_min_count}
          min={1}
          max={20}
          disabled={!draft.image_heavy_drop}
          onChange={(v) => commit({ ...draft, image_heavy_min_count: v })}
        />
        <NumberRow
          label={t("marketing.spamFilter.thresholds.image_heavy_max_text_chars")}
          value={draft.image_heavy_max_text_chars}
          min={0}
          max={5000}
          step={50}
          disabled={!draft.image_heavy_drop}
          onChange={(v) => commit({ ...draft, image_heavy_max_text_chars: v })}
        />
        <Checkbox
          checked={draft.role_keyword_drop}
          onChange={(e) =>
            commit({ ...draft, role_keyword_drop: e.target.checked })
          }
        >
          {t("marketing.spamFilter.thresholds.role_keyword_drop")}
        </Checkbox>
        <Checkbox
          checked={draft.multi_weak_drop}
          onChange={(e) =>
            commit({ ...draft, multi_weak_drop: e.target.checked })
          }
        >
          {t("marketing.spamFilter.thresholds.multi_weak_drop")}
        </Checkbox>
        <NumberRow
          label={t("marketing.spamFilter.thresholds.multi_weak_threshold")}
          value={draft.multi_weak_threshold}
          min={1}
          max={5}
          disabled={!draft.multi_weak_drop}
          onChange={(v) => commit({ ...draft, multi_weak_threshold: v })}
        />
      </div>
    </Card>
  );
}

function NumberRow(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span
        className={`flex-1 text-sm ${
          props.disabled ? "text-text-tertiary" : "text-text-primary"
        }`}
      >
        {props.label}
      </span>
      <Input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) props.onChange(v);
        }}
        className="w-24"
      />
    </label>
  );
}

// ── Block / allow lists card ────────────────────────────────────

const RULE_GROUPS: ReadonlyArray<{
  kind: RuleKind;
  labelKey: CatalogKey;
  placeholderKey: CatalogKey;
}> = [
  {
    kind: "domain_block",
    labelKey: "marketing.spamFilter.rules.section.domain_block",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.domain",
  },
  {
    kind: "domain_allow",
    labelKey: "marketing.spamFilter.rules.section.domain_allow",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.domain",
  },
  {
    kind: "keyword_block",
    labelKey: "marketing.spamFilter.rules.section.keyword_block",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.keyword",
  },
  {
    kind: "keyword_allow",
    labelKey: "marketing.spamFilter.rules.section.keyword_allow",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.keyword",
  },
  {
    kind: "sender_block",
    labelKey: "marketing.spamFilter.rules.section.sender_block",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.sender",
  },
  {
    kind: "sender_allow",
    labelKey: "marketing.spamFilter.rules.section.sender_allow",
    placeholderKey: "marketing.spamFilter.rules.add_placeholder.sender",
  },
];

function RulesCard(props: {
  rules: SpamFilterRule[];
  onAdd: (kind: RuleKind, value: string) => void;
  onRemove: (rule: SpamFilterRule) => void;
}) {
  const t = useT();
  const byKind = useMemo(() => {
    const map: Record<string, SpamFilterRule[]> = {};
    for (const r of props.rules) {
      (map[r.kind] ??= []).push(r);
    }
    return map;
  }, [props.rules]);

  return (
    <Card>
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          {t("marketing.spamFilter.rules.title")}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {t("marketing.spamFilter.rules.subtitle")}
        </p>
      </div>
      <div className="grid gap-4 px-4 py-3 md:grid-cols-2">
        {RULE_GROUPS.map((g) => (
          <RuleListEditor
            key={g.kind}
            title={t(g.labelKey)}
            placeholder={t(g.placeholderKey)}
            rules={byKind[g.kind] ?? []}
            onAdd={(v) => props.onAdd(g.kind, v)}
            onRemove={props.onRemove}
            deleteAria={t("marketing.spamFilter.rules.delete_aria")}
            emptyLabel={t("marketing.spamFilter.rules.empty")}
            addLabel={t("marketing.spamFilter.rules.add_button")}
          />
        ))}
      </div>
    </Card>
  );
}

function RuleListEditor(props: {
  title: string;
  placeholder: string;
  rules: SpamFilterRule[];
  onAdd: (value: string) => void;
  onRemove: (r: SpamFilterRule) => void;
  deleteAria: string;
  emptyLabel: string;
  addLabel: string;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const v = value.trim();
    if (!v) return;
    props.onAdd(v);
    setValue("");
  }

  return (
    <div className="rounded border px-3 py-3">
      <h3 className="text-xs font-semibold text-text-primary">{props.title}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-2 flex gap-2"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={props.placeholder}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          leadingIcon={<Plus size={12} />}
          disabled={!value.trim()}
        >
          {props.addLabel}
        </Button>
      </form>
      <ul className="mt-2 space-y-1">
        {props.rules.length === 0 && (
          <li className="text-xs italic text-text-tertiary">
            {props.emptyLabel}
          </li>
        )}
        {props.rules.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded bg-panel-hover px-2 py-1 text-xs"
          >
            <span className="truncate font-mono text-text-primary">
              {r.value}
            </span>
            <button
              type="button"
              onClick={() => props.onRemove(r)}
              aria-label={props.deleteAria}
              className="text-text-tertiary hover:text-danger"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Dry-run test card ───────────────────────────────────────────

function TestCard() {
  const t = useT();
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!from.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const isHtml = body.trimStart().startsWith("<");
      const out = await testSpamFilter({
        from_email: from.trim(),
        subject: subject.trim(),
        ...(isHtml ? { html: body } : { body }),
      });
      setResult(out);
    } catch (e) {
      setError(t("marketing.spamFilter.test_failed", { message: formatErr(e) }));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          {t("marketing.spamFilter.test.title")}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {t("marketing.spamFilter.test.subtitle")}
        </p>
      </div>
      <div className="space-y-3 px-4 py-3">
        <label className="block text-xs">
          <span className="block text-text-secondary">
            {t("marketing.spamFilter.test.from_label")}
          </span>
          <Input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t("marketing.spamFilter.test.from_placeholder")}
          />
        </label>
        <label className="block text-xs">
          <span className="block text-text-secondary">
            {t("marketing.spamFilter.test.subject_label")}
          </span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="block text-text-secondary">
            {t("marketing.spamFilter.test.body_label")}
          </span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
          />
        </label>
        <div>
          <Button
            type="button"
            variant="primary"
            onClick={run}
            disabled={running || !from.trim()}
          >
            {t("marketing.spamFilter.test.run_button")}
          </Button>
        </div>
        {error && (
          <div className="text-xs text-danger">{error}</div>
        )}
        {result && <TestResultView result={result} />}
      </div>
    </Card>
  );
}

function TestResultView(props: { result: TestResult }) {
  const t = useT();
  const v = props.result.verdict;
  const isHuman = v.kind === "human";
  return (
    <div
      className={`rounded border px-3 py-2 text-xs ${
        isHuman
          ? "border-success bg-success/10"
          : "border-danger bg-danger/10"
      }`}
    >
      <p className={`text-sm font-semibold ${isHuman ? "text-success" : "text-danger"}`}>
        {isHuman
          ? t("marketing.spamFilter.test.verdict_human")
          : t("marketing.spamFilter.test.verdict_promo")}
      </p>
      {!isHuman && (
        <p className="mt-1 text-text-secondary">
          {t(reasonKey(v.reason))}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-text-secondary">
        <dt>{t("marketing.spamFilter.test.signal.image_count")}</dt>
        <dd className="text-text-primary">{props.result.signals.image_count}</dd>
        <dt>{t("marketing.spamFilter.test.signal.visible_text_chars")}</dt>
        <dd className="text-text-primary">
          {props.result.signals.visible_text_chars}
        </dd>
        <dt>{t("marketing.spamFilter.test.signal.keyword_hits")}</dt>
        <dd className="text-text-primary">
          {props.result.signals.keyword_hits}
          {props.result.signals.matched_keywords.length > 0 && (
            <span className="ml-1 text-text-tertiary">
              ({props.result.signals.matched_keywords.join(", ")})
            </span>
          )}
        </dd>
        <dt>{t("marketing.spamFilter.test.signal.sender_role")}</dt>
        <dd className="text-text-primary">
          {props.result.signals.sender_role ? "✓" : "—"}
        </dd>
      </dl>
    </div>
  );
}

function reasonKey(reason: string): CatalogKey {
  switch (reason) {
    case "domain_blocklist":
      return "marketing.spamFilter.reason.domain_blocklist";
    case "sender_blocklist":
      return "marketing.spamFilter.reason.sender_blocklist";
    case "image_only":
      return "marketing.spamFilter.reason.image_only";
    case "image_heavy_low_text":
      return "marketing.spamFilter.reason.image_heavy_low_text";
    case "noreply_with_keyword":
      return "marketing.spamFilter.reason.noreply_with_keyword";
    case "multi_weak_signals":
    default:
      return "marketing.spamFilter.reason.multi_weak_signals";
  }
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    if (typeof e.body === "object" && e.body && "message" in e.body) {
      return String((e.body as { message?: string }).message ?? e.body);
    }
    return `HTTP ${e.status}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
