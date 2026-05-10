// Visual editor for one followup cadence profile. Inputs:
// id (locked once existing), max_attempts, stop_on_reply,
// + an ordered list of cadence intervals each with a value
// + unit (h / d) picker. Add / remove rows in place; save
// hands the canonical row back to the parent.
//
// The cadence string format ('24h' / '3d') round-trips
// through `parseInterval` / `formatInterval` so operator
// edits never lose precision (the SDK's followup poller
// re-parses these into Duration via humantime).

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { ConfigFollowupProfile } from "../../../api/marketing";
import { Button, Checkbox, Input, Select } from "../../../components/ui";
import { t as tStatic, useT } from "../../../i18n";

interface ParsedInterval {
  value: number;
  unit: "h" | "d";
}

/** Parse a cadence interval like `"24h"` / `"3d"` into a
 *  typed pair. Caller-defined fallback when the string is
 *  malformed (operator edited the YAML directly + typo'd
 *  the unit). Exported for unit testing. */
export function parseInterval(raw: string): ParsedInterval {
  const m = /^(\d+)\s*([hd])$/i.exec(raw.trim());
  if (!m) return { value: 1, unit: "d" };
  return {
    value: Math.max(1, Number(m[1])),
    unit: m[2]!.toLowerCase() === "h" ? "h" : "d",
  };
}

/** Inverse of `parseInterval`. */
export function formatInterval(p: ParsedInterval): string {
  return `${p.value}${p.unit}`;
}

interface DraftProfile {
  id: string;
  cadence: ParsedInterval[];
  max_attempts: number;
  stop_on_reply: boolean;
}

function fromConfig(p: ConfigFollowupProfile): DraftProfile {
  return {
    id: p.id,
    cadence: (p.cadence ?? []).map(parseInterval),
    max_attempts: Number(p.max_attempts ?? 3),
    stop_on_reply: (p as { stop_on_reply?: boolean }).stop_on_reply ?? true,
  };
}

function toConfig(p: DraftProfile): ConfigFollowupProfile {
  return {
    id: p.id,
    cadence: p.cadence.map(formatInterval),
    max_attempts: p.max_attempts,
    stop_on_reply: p.stop_on_reply,
  };
}

interface Props {
  readonly initial: ConfigFollowupProfile;
  /** Locked when the profile id already exists; new profiles
   *  let the operator type a fresh id. */
  readonly idLocked: boolean;
  readonly onSave: (next: ConfigFollowupProfile) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export default function FollowupProfileEditor({
  initial,
  idLocked,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState<DraftProfile>(fromConfig(initial));

  const updateInterval = (idx: number, patch: Partial<ParsedInterval>) => {
    setDraft((d) => ({
      ...d,
      cadence: d.cadence.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };

  const removeInterval = (idx: number) => {
    setDraft((d) => ({
      ...d,
      cadence: d.cadence.filter((_, i) => i !== idx),
    }));
  };

  const addInterval = () => {
    setDraft((d) => ({
      ...d,
      cadence: [...d.cadence, { value: 1, unit: "d" }],
    }));
  };

  const idValid = draft.id.trim().length > 0;
  const cadenceValid = draft.cadence.length > 0;
  const canSave = idValid && cadenceValid;

  return (
    <div
      data-testid="followup-profile-editor"
      className="space-y-3 rounded border border-indigo-200 bg-indigo-50/30 p-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.followup_profile.id")}
          <Input
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            disabled={idLocked}
            aria-label="profile-id"
            className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.followup_profile.max_attempts")}
          <Input
            type="number"
            min={1}
            max={20}
            value={draft.max_attempts}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                max_attempts: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            aria-label="max-attempts"
            className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-text-secondary">
        <Checkbox
          checked={draft.stop_on_reply}
          onChange={(e) =>
            setDraft((d) => ({ ...d, stop_on_reply: e.target.checked }))
          }
          aria-label="stop-on-reply"
          className="h-3.5 w-3.5"
        />
        {t("marketing.followup_profile.stop_on_reply")}
      </label>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-text-secondary">
          {t("marketing.followup_profile.cadence")}
        </p>
        {draft.cadence.length === 0 && (
          <p className="text-[11px] italic text-text-meta">
            {t("marketing.followup_profile.no_intervals")}
          </p>
        )}
        <ol className="space-y-1.5">
          {draft.cadence.map((c, idx) => (
            <li
              key={idx}
              data-testid={`cadence-row-${idx}`}
              className="flex items-center gap-2 text-[11px]"
            >
              <span className="w-12 text-text-meta">#{idx + 1}</span>
              <Input
                type="number"
                min={1}
                value={c.value}
                onChange={(e) =>
                  updateInterval(idx, {
                    value: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                aria-label={`cadence-value-${idx}`}
                className="w-16 rounded border  bg-white px-2 py-1 text-xs outline-none focus:border-indigo-400"
              />
              <Select
                value={c.unit}
                onChange={(e) =>
                  updateInterval(idx, {
                    unit: e.target.value === "h" ? "h" : "d",
                  })
                }
                aria-label={`cadence-unit-${idx}`}
                className="rounded border  bg-white px-2 py-1 text-xs"
              >
                <option value="h">{t("marketing.followup_profile.unit_hours")}</option>
                <option value="d">{t("marketing.followup_profile.unit_days")}</option>
              </Select>
              <Button
                variant="secondary"
                size="md"
                onClick={() => removeInterval(idx)}
                aria-label={`cadence-remove-${idx}`}
              >
                <Trash2 size={12} />
              </Button>
            </li>
          ))}
        </ol>
        <Button
          variant="secondary"
          size="sm"
          onClick={addInterval}
          aria-label="cadence-add"
        >
          <Plus size={11} />
          {t("marketing.followup_profile.add_interval")}
        </Button>
      </div>

      {/* Live timeline preview — Day 0 → Day +N rolling sum
          across the cadence intervals. */}
      <CadenceTimeline cadence={draft.cadence} />

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSave(toConfig(draft))}
          disabled={!canSave}
        >
          {t("common.save")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>
            {t("marketing.followup_profile.delete_profile")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Live preview of when each followup fires relative to
 *  Day 0. Rolling sum over the intervals; renders a flat
 *  list operator can scan to make sure cadence makes
 *  sense. Exported helper `cadencePreview` for tests. */
export function cadencePreview(
  cadence: ReadonlyArray<ParsedInterval>,
): { stepIdx: number; absHours: number; label: string }[] {
  let acc = 0;
  return cadence.map((c, idx) => {
    const hours = c.unit === "d" ? c.value * 24 : c.value;
    acc += hours;
    return {
      stepIdx: idx + 1,
      absHours: acc,
      label:
        acc % 24 === 0
          ? tStatic("marketing.followup_profile.cadence_day", { n: acc / 24 })
          : tStatic("marketing.followup_profile.cadence_hour", { n: acc }),
    };
  });
}

function CadenceTimeline({
  cadence,
}: {
  cadence: ReadonlyArray<ParsedInterval>;
}) {
  const t = useT();
  if (cadence.length === 0) return null;
  const steps = cadencePreview(cadence);
  return (
    <div
      data-testid="cadence-timeline"
      className="rounded border border-emerald-200 bg-emerald-50/40 p-2 text-[10px] text-emerald-900"
    >
      <p className="font-semibold">
        {t("marketing.followup_profile.timeline_preview")}
      </p>
      <ol className="mt-1 space-y-0.5">
        <li>● {t("marketing.followup_profile.day_zero")}</li>
        {steps.map((s) => (
          <li key={s.stepIdx}>
            ● {s.label} →{" "}
            {t("marketing.followup_profile.followup_step", { step: s.stepIdx })}
          </li>
        ))}
      </ol>
    </div>
  );
}
