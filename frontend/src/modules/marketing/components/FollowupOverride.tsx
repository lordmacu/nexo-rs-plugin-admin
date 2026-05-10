// M15.21.followup-override — Skip / Postpone bypass card
// embedded in the lead drawer's Followup section. Wires the
// existing inert Skip / Editar buttons to the extension's
// `/leads/:id/followup/override` endpoint and surfaces a
// preset postpone picker (1d / 3d / 1w / custom datetime).
//
// Phase 6 sample — composes shared `<Card>`, `<Button>`,
// `<Banner>`, `<Input>`, `<Text>` instead of hand-rolled
// styling.

import { useState } from "react";
import { Clock, SkipForward, X } from "lucide-react";

import {
  Banner,
  Button,
  Card,
  Chip,
  Input,
  Text,
} from "../../../components/ui";
import { useT } from "../../../i18n";
import type { CatalogKey } from "../../../i18n/catalogs/es";
import { followupOverride } from "../../../api/marketing";
import { formatRelative } from "../data/formatters";

type Mode = "idle" | "postpone-picker";

const POSTPONE_PRESETS: ReadonlyArray<{
  labelKey: CatalogKey;
  /** Hours forward from now. */
  hours: number;
}> = [
  { labelKey: "lead.followup.preset_1d", hours: 24 },
  { labelKey: "lead.followup.preset_3d", hours: 72 },
  { labelKey: "lead.followup.preset_1w", hours: 168 },
];

export interface FollowupOverrideProps {
  leadId: string;
  /** Current `next_check_at_ms` from the lead row — `null`
   *  when no followup is queued. Drives the "Próximo en" label. */
  nextCheckAtMs: number | null;
  /** `followup_attempts` from the lead row — display only. */
  attempts: number;
  /** Fires after a successful override with the new
   *  `next_check_at_ms` so the parent can stamp the cached
   *  Lead row without a full re-fetch. */
  onApplied?: (nextCheckAtMs: number | null) => void;
}

/** Formats an ISO `datetime-local` string back to ms-since-epoch.
 *  `<input type="datetime-local">` returns the value in the
 *  user's local timezone without a Z suffix; `new Date(str)`
 *  parses it as local time, which is exactly what the operator
 *  expects when they say "postpone until Tuesday at 3pm". */
function localDateTimeToMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Default value for the custom datetime picker — 1h from now,
 *  rounded to the next quarter hour, in `YYYY-MM-DDTHH:MM`
 *  local-time format. */
function defaultCustomValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  // toISOString uses UTC; we want the local-time literal
  // expected by `<input type="datetime-local">`. Subtract the
  // tz offset before converting so the round-trip stays in the
  // operator's wall clock.
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export default function FollowupOverride({
  leadId,
  nextCheckAtMs,
  attempts,
  onApplied,
}: FollowupOverrideProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState<string>(defaultCustomValue);

  async function runSkip() {
    setBusy(true);
    setError(null);
    try {
      const r = await followupOverride(leadId, { action: "skip" });
      onApplied?.(r.next_check_at_ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runPostpone(untilMs: number) {
    setBusy(true);
    setError(null);
    try {
      const r = await followupOverride(leadId, {
        action: "postpone",
        until_ms: untilMs,
      });
      onApplied?.(r.next_check_at_ms);
      setMode("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div data-testid="followup-override">
        <div className="flex items-center justify-between text-[11px]">
          <Text tone="meta" size="xs">
            {t("lead.followup.next_in")}
          </Text>
          <Text
            strong
            size="xs"
            tone="secondary"
            data-testid="followup-next-label"
          >
            {nextCheckAtMs ? formatRelative(nextCheckAtMs) : "—"}
          </Text>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <Text tone="meta" size="xs">
            {t("lead.followup.attempts")}
          </Text>
          <Text size="xs" tone="secondary">
            <span className="font-semibold">{attempts}</span>
            <span className="text-text-meta">{t("lead.followup.attempts_max")}</span>
          </Text>
        </div>

        {error && (
          <div className="mt-2">
            <Banner tone="danger">
              <span data-testid="followup-override-error">{error}</span>
            </Banner>
          </div>
        )}

        {mode === "idle" && (
          <div className="mt-2.5 flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              busy={busy}
              disabled={nextCheckAtMs === null}
              leadingIcon={<SkipForward size={11} />}
              onClick={() => void runSkip()}
              className="flex-1"
              data-testid="followup-skip"
              title={
                nextCheckAtMs === null
                  ? t("lead.followup.no_followup")
                  : t("lead.followup.skip_title")
              }
            >
              {t("lead.followup.skip")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              leadingIcon={<Clock size={11} />}
              onClick={() => setMode("postpone-picker")}
              className="flex-1"
              data-testid="followup-postpone-open"
              title={t("lead.followup.postpone_title")}
            >
              {t("lead.followup.postpone")}
            </Button>
          </div>
        )}

        {mode === "postpone-picker" && (
          <div
            className="mt-2.5 space-y-1.5"
            data-testid="followup-postpone-picker"
          >
            <div className="flex flex-wrap gap-1.5">
              {POSTPONE_PRESETS.map((p) => (
                <Chip
                  key={p.hours}
                  onClick={() =>
                    void runPostpone(Date.now() + p.hours * 3_600_000)
                  }
                  disabled={busy}
                  data-testid={`followup-postpone-preset-${p.hours}h`}
                >
                  +{t(p.labelKey)}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="datetime-local"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                disabled={busy}
                size="sm"
                className="flex-1"
                data-testid="followup-postpone-custom-input"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!customValue}
                busy={busy}
                onClick={() => {
                  const ms = localDateTimeToMs(customValue);
                  if (ms === null) {
                    setError(t("lead.followup.invalid_datetime"));
                    return;
                  }
                  void runPostpone(ms);
                }}
                data-testid="followup-postpone-custom-submit"
              >
                {t("lead.followup.apply")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setMode("idle");
                  setError(null);
                }}
                data-testid="followup-postpone-cancel"
                title={t("lead.followup.cancel_title")}
              >
                <X size={11} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
