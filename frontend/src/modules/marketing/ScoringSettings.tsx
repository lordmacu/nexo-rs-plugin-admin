// Settings tab — tenant-tunable lead scoring weights +
// keyword lists. Pure form over `ScoringConfig`.

import { useEffect, useState } from "react";

import {
  getScoringConfig,
  putScoringConfig,
  resetScoringConfig,
  type ScoringConfig,
} from "../../api/marketingState";
import { Button, Card, Input, Textarea } from "../../components/ui";
import { HttpError } from "../../api/client";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

export default function ScoringSettings() {
  const t = useT();
  const [cfg, setCfg] = useState<ScoringConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getScoringConfig();
        if (!cancelled) setCfg(r.config);
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

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setHint(null);
    setError(null);
    try {
      const r = await putScoringConfig(cfg);
      setCfg(r.config);
      setHint(t("marketing.scoring.save_ok"));
    } catch (e) {
      setError(t("marketing.scoring.save_failed", { message: formatErr(e) }));
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!confirm(t("marketing.scoring.reset_confirm"))) return;
    setSaving(true);
    setHint(null);
    setError(null);
    try {
      const r = await resetScoringConfig();
      setCfg(r.config);
      setHint(t("marketing.scoring.save_ok"));
    } catch (e) {
      setError(t("marketing.scoring.save_failed", { message: formatErr(e) }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">…</div>;
  }
  if (!cfg) {
    return <div className="p-4 text-sm text-danger">{error ?? "—"}</div>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold text-text-primary">
          {t("marketing.scoring.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-text-secondary">
          {t("marketing.scoring.subtitle")}
        </p>
      </header>

      {(error || hint) && (
        <div
          className={`rounded border px-3 py-2 text-xs ${
            error
              ? "border-danger bg-danger/10 text-danger"
              : "border-success bg-success/10 text-success"
          }`}
        >
          {error ?? hint}
        </div>
      )}

      <Card>
        <div className="space-y-3 px-4 py-3">
          <NumberRow
            label={t("marketing.scoring.weight.corporate_domain")}
            value={cfg.corporate_domain_boost}
            onChange={(v) => setCfg({ ...cfg, corporate_domain_boost: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.personal_domain")}
            value={cfg.personal_domain_penalty}
            onChange={(v) => setCfg({ ...cfg, personal_domain_penalty: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.substantive_min")}
            value={cfg.substantive_body_min_words}
            min={1}
            onChange={(v) => setCfg({ ...cfg, substantive_body_min_words: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.substantive_boost")}
            value={cfg.substantive_body_boost}
            onChange={(v) => setCfg({ ...cfg, substantive_body_boost: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.brief_max")}
            value={cfg.brief_body_max_words}
            min={1}
            onChange={(v) => setCfg({ ...cfg, brief_body_max_words: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.brief_penalty")}
            value={cfg.brief_body_penalty}
            onChange={(v) => setCfg({ ...cfg, brief_body_penalty: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.purchase_intent")}
            value={cfg.purchase_intent_boost}
            onChange={(v) => setCfg({ ...cfg, purchase_intent_boost: v })}
          />
          <NumberRow
            label={t("marketing.scoring.weight.senior_signature")}
            value={cfg.senior_signature_boost}
            onChange={(v) => setCfg({ ...cfg, senior_signature_boost: v })}
          />
        </div>
      </Card>

      <Card>
        <div className="space-y-3 px-4 py-3">
          <KeywordList
            labelKey="marketing.scoring.keywords.purchase"
            hintKey="marketing.scoring.keywords.purchase_hint"
            value={cfg.purchase_intent_keywords}
            onChange={(v) => setCfg({ ...cfg, purchase_intent_keywords: v })}
          />
          <KeywordList
            labelKey="marketing.scoring.keywords.senior"
            hintKey="marketing.scoring.keywords.senior_hint"
            value={cfg.senior_tokens}
            onChange={(v) => setCfg({ ...cfg, senior_tokens: v })}
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={save}
          disabled={saving}
        >
          {t("marketing.scoring.save_button")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={resetDefaults}
          disabled={saving}
        >
          {t("marketing.scoring.reset_button")}
        </Button>
      </div>
    </div>
  );
}

function NumberRow(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="flex-1 text-sm text-text-primary">{props.label}</span>
      <Input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) props.onChange(v);
        }}
        className="w-24"
      />
    </label>
  );
}

function KeywordList(props: {
  labelKey: CatalogKey;
  hintKey: CatalogKey;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useT();
  const text = props.value.join("\n");
  return (
    <label className="block text-xs">
      <span className="block text-sm font-semibold text-text-primary">
        {t(props.labelKey)}
      </span>
      <span className="block text-text-secondary">{t(props.hintKey)}</span>
      <Textarea
        value={text}
        rows={6}
        onChange={(e) => {
          const next = e.target.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          props.onChange(next);
        }}
      />
    </label>
  );
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
