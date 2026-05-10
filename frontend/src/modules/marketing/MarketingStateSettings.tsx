// Settings tab — global on/off toggle for the marketing
// extension. Pausing halts every automated effect (AI drafts,
// notifications, follow-ups) without losing inbound traffic.

import { useEffect, useState } from "react";

import { Button, Card, Checkbox, Input } from "../../components/ui";
import { HttpError } from "../../api/client";
import { useT } from "../../i18n";
import { useMarketingState } from "../../store/marketingStateStore";

export default function MarketingStateSettings() {
  const t = useT();
  const state = useMarketingState((s) => s.state);
  const fetch = useMarketingState((s) => s.fetch);
  const setEnabledStore = useMarketingState((s) => s.setEnabled);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await fetch();
        if (cancelled) return;
        // Hydrate the form from the store after fetch.
        const cur = useMarketingState.getState().state;
        if (cur) {
          setEnabled(cur.enabled);
          setReason(cur.paused_reason ?? "");
        }
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetch]);

  async function save() {
    setSaving(true);
    setHint(null);
    setError(null);
    try {
      await setEnabledStore(enabled, enabled ? undefined : reason);
      setHint(t("marketing.state.save_ok"));
    } catch (e) {
      setError(t("marketing.state.save_failed", { message: formatErr(e) }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">…</div>;
  }
  if (!state) {
    return <div className="p-4 text-sm text-danger">{error ?? "—"}</div>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold text-text-primary">
          {t("marketing.state.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-text-secondary">
          {t("marketing.state.subtitle")}
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
          <Checkbox
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          >
            {enabled
              ? t("marketing.state.toggle_enabled")
              : t("marketing.state.toggle_disabled")}
          </Checkbox>

          <label className="block text-xs">
            <span className="block text-text-secondary">
              {t("marketing.state.reason_label")}
            </span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("marketing.state.reason_placeholder")}
              disabled={enabled}
            />
          </label>

          <div>
            <Button
              type="button"
              variant="primary"
              onClick={save}
              disabled={saving}
            >
              {t("marketing.state.save_button")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
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
