// Form editor for one mailbox config row. Mirrors
// `nexo-tool-meta::marketing::MailboxConfig` permissive
// shape. Operator edits one mailbox at a time; the
// SettingsMailboxes parent owns the list-level save.
//
// V1 deployment posture is IMAP-only — OAuth flows for
// Gmail / Outlook aren't wired (no UI for the consent
// dance, no token-refresh runtime). The `provider`
// column round-trips for forward compat but the form
// hard-defaults to "imap" on new rows + hides the
// dropdown. Advanced operators experimenting with
// OAuth use the JSON fallback editor.
//
// Fields:
// - id (locked once existing — DB key into mailboxes.yaml)
// - address (operator-facing email address)
// - provider (round-trips, hidden in form; new = imap)
// - mode (idle | adaptive | poll)
// - poll_interval_seconds (15..3600)
// - active (toggle)
// - draft_mode (toggle — true ⇒ Draft + approve;
//   false ⇒ Autonomous)
// - email_plugin_instance (free string, instance id the
//   email plugin uses)
// - active_hours (M15.18.b): optional window with
//   timezone + per-day-segment (mon_fri / saturday /
//   sunday) + off_hours_poll_seconds. Off ⇒ poll-on
//   the configured interval 24/7. On ⇒ extension uses
//   off_hours_poll_seconds outside the windows.

import { useState } from "react";

import type { ConfigMailbox } from "../../../api/marketing";
import {
  Button,
  Checkbox,
  Input,
  RadioGroup,
} from "../../../components/ui";
import { useT } from "../../../i18n";

interface DayWindowPayload {
  start: string;
  end: string;
}

interface ActiveHoursPayload {
  timezone: string;
  mon_fri: DayWindowPayload | null;
  saturday: DayWindowPayload | null;
  sunday: DayWindowPayload | null;
  off_hours_poll_seconds: number;
}

interface DraftMailbox {
  id: string;
  address: string;
  provider: string;
  mode: string;
  poll_interval_seconds: number;
  active: boolean;
  draft_mode: boolean;
  email_plugin_instance: string;
  hours_enabled: boolean;
  hours_timezone: string;
  hours_off_seconds: number;
  hours_mon_fri_enabled: boolean;
  hours_mon_fri_start: string;
  hours_mon_fri_end: string;
  hours_sat_enabled: boolean;
  hours_sat_start: string;
  hours_sat_end: string;
  hours_sun_enabled: boolean;
  hours_sun_start: string;
  hours_sun_end: string;
}

const DEFAULT_HOURS_TIMEZONE = "America/Bogota";
const DEFAULT_DAY_START = "07:00";
const DEFAULT_DAY_END = "20:00";
const DEFAULT_OFF_HOURS_POLL = 300;

/** HH:MM regex — 0-23 hours, 0-59 minutes. Exported for
 *  unit testing. */
export const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Validate a HH:MM range — both ends well-formed AND
 *  start strictly before end (no overnight windows in v1).
 *  Exported for testing. */
export function validHoursRange(start: string, end: string): boolean {
  if (!HHMM_RE.test(start) || !HHMM_RE.test(end)) return false;
  return start < end;
}

function fromConfig(m: ConfigMailbox): DraftMailbox {
  const get = <T,>(key: string, fallback: T): T => {
    const v = (m as Record<string, unknown>)[key];
    return v === undefined ? fallback : (v as T);
  };
  const ah = (m as Record<string, unknown>).active_hours as
    | ActiveHoursPayload
    | null
    | undefined;
  const ahEnabled = !!ah && typeof ah === "object";
  return {
    id: m.id,
    address: m.address ?? "",
    provider: m.provider ?? "imap",
    mode: get("mode", "adaptive"),
    poll_interval_seconds: Math.max(
      15,
      Math.min(3600, get("poll_interval_seconds", 60)),
    ),
    active: get("active", true),
    draft_mode: get("draft_mode", true),
    email_plugin_instance: get("email_plugin_instance", ""),
    hours_enabled: ahEnabled,
    hours_timezone: ah?.timezone ?? DEFAULT_HOURS_TIMEZONE,
    hours_off_seconds: Math.max(
      15,
      Math.min(3600, ah?.off_hours_poll_seconds ?? DEFAULT_OFF_HOURS_POLL),
    ),
    hours_mon_fri_enabled: !!ah?.mon_fri,
    hours_mon_fri_start: ah?.mon_fri?.start ?? DEFAULT_DAY_START,
    hours_mon_fri_end: ah?.mon_fri?.end ?? DEFAULT_DAY_END,
    hours_sat_enabled: !!ah?.saturday,
    hours_sat_start: ah?.saturday?.start ?? DEFAULT_DAY_START,
    hours_sat_end: ah?.saturday?.end ?? DEFAULT_DAY_END,
    hours_sun_enabled: !!ah?.sunday,
    hours_sun_start: ah?.sunday?.start ?? DEFAULT_DAY_START,
    hours_sun_end: ah?.sunday?.end ?? DEFAULT_DAY_END,
  };
}

function toConfig(d: DraftMailbox): ConfigMailbox {
  const out: ConfigMailbox = {
    id: d.id,
    address: d.address,
    provider: d.provider,
    mode: d.mode,
    poll_interval_seconds: d.poll_interval_seconds,
    active: d.active,
    draft_mode: d.draft_mode,
    email_plugin_instance: d.email_plugin_instance,
  };
  if (d.hours_enabled) {
    const block: ActiveHoursPayload = {
      timezone: d.hours_timezone,
      mon_fri: d.hours_mon_fri_enabled
        ? { start: d.hours_mon_fri_start, end: d.hours_mon_fri_end }
        : null,
      saturday: d.hours_sat_enabled
        ? { start: d.hours_sat_start, end: d.hours_sat_end }
        : null,
      sunday: d.hours_sun_enabled
        ? { start: d.hours_sun_start, end: d.hours_sun_end }
        : null,
      off_hours_poll_seconds: d.hours_off_seconds,
    };
    (out as Record<string, unknown>).active_hours = block;
  }
  return out;
}

interface Props {
  readonly initial: ConfigMailbox;
  readonly idLocked: boolean;
  readonly onSave: (next: ConfigMailbox) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
}

export default function MailboxFormEditor({
  initial,
  idLocked,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState<DraftMailbox>(fromConfig(initial));

  const idValid = draft.id.trim().length > 0;
  const addressValid =
    draft.address.includes("@") && draft.address.trim().length > 3;
  const pollValid =
    draft.poll_interval_seconds >= 15 && draft.poll_interval_seconds <= 3600;
  const hoursValid =
    !draft.hours_enabled ||
    ((draft.hours_mon_fri_enabled ||
      draft.hours_sat_enabled ||
      draft.hours_sun_enabled) &&
      (!draft.hours_mon_fri_enabled ||
        validHoursRange(draft.hours_mon_fri_start, draft.hours_mon_fri_end)) &&
      (!draft.hours_sat_enabled ||
        validHoursRange(draft.hours_sat_start, draft.hours_sat_end)) &&
      (!draft.hours_sun_enabled ||
        validHoursRange(draft.hours_sun_start, draft.hours_sun_end)) &&
      draft.hours_off_seconds >= 15 &&
      draft.hours_off_seconds <= 3600);
  const canSave = idValid && addressValid && pollValid && hoursValid;

  return (
    <div
      data-testid="mailbox-form-editor"
      className="space-y-3 rounded border border-indigo-200 bg-indigo-50/30 p-3"
    >
      {/* ID is auto-derived from `address`'s local part on
          create — same sanitisation as the marketing wizard so
          a single tenant ends up with `<address-local>` as the
          stable mailbox id (`yo@x.com` → `yo`). On edit (idLocked)
          the id stays untouched server-side; we just hide the
          field entirely instead of surfacing a disabled input
          the operator can't act on. */}
      <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
        {t("marketing.mailbox_form.address")}
        <Input
          type="email"
          value={draft.address}
          onChange={(e) =>
            setDraft((d) => {
              const next = e.target.value;
              if (idLocked) return { ...d, address: next };
              const at = next.lastIndexOf("@");
              const local = at > 0 ? next.slice(0, at) : "";
              const derivedId =
                local
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "") || "primary";
              return { ...d, address: next, id: derivedId };
            })
          }
          placeholder={t("marketing.mailbox_form.address_placeholder")}
          aria-label="mailbox-address"
          className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400"
        />
      </label>

      <div>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          {t("marketing.mailbox_form.email_plugin_instance")}
          <Input
            value={draft.email_plugin_instance}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                email_plugin_instance: e.target.value,
              }))
            }
            placeholder={t("marketing.mailbox_form.email_plugin_placeholder")}
            aria-label="mailbox-instance"
            className="rounded border  bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-indigo-400"
          />
        </label>
        <p className="mt-1 text-[10px] text-text-meta">
          {t("marketing.mailbox_form.email_plugin_hint")}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold text-text-secondary">
          {t("marketing.mailbox_form.inbound_polling")}
        </p>
        <RadioGroup
          name="mailbox-mode"
          layout="horizontal"
          value={draft.mode}
          onChange={(v) =>
            setDraft((d) => ({ ...d, mode: v as typeof d.mode }))
          }
          options={[
            { value: "idle", label: t("marketing.mailbox_form.mode_idle") },
            {
              value: "adaptive",
              label: t("marketing.mailbox_form.mode_adaptive"),
            },
            { value: "poll", label: t("marketing.mailbox_form.mode_poll") },
          ]}
        />
        <label className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
          {t("marketing.mailbox_form.poll_interval")}
          <Input
            type="number"
            min={15}
            max={3600}
            value={draft.poll_interval_seconds}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                poll_interval_seconds: Math.max(
                  15,
                  Math.min(3600, Number(e.target.value) || 60),
                ),
              }))
            }
            aria-label="mailbox-poll-interval"
            className="w-20 rounded border  bg-white px-2 py-1 text-xs"
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
            aria-label="mailbox-active"
          />
          {t("marketing.mailbox_form.active")}
        </label>
        <label className="flex items-center gap-1">
          <Checkbox
            checked={draft.draft_mode}
            onChange={(e) =>
              setDraft((d) => ({ ...d, draft_mode: e.target.checked }))
            }
            aria-label="mailbox-draft-mode"
          />
          {t("marketing.mailbox_form.draft_mode")}
        </label>
      </div>

      {/* M15.18.b — active_hours window. Off ⇒ poll
          24/7 on the configured interval. On ⇒ extension
          uses off_hours_poll_seconds outside the windows
          (weekends / nights cost less). */}
      <div className="rounded border  bg-white p-3">
        <label className="flex items-center gap-2 text-[11px] text-text-secondary">
          <Checkbox
            checked={draft.hours_enabled}
            onChange={(e) =>
              setDraft((d) => {
                const next = { ...d, hours_enabled: e.target.checked };
                // First-toggle convenience: enable mon_fri when
                // the operator flips the section on without any
                // day previously selected. Saves a click for
                // the common "9-to-5 weekdays" config.
                if (
                  e.target.checked &&
                  !d.hours_mon_fri_enabled &&
                  !d.hours_sat_enabled &&
                  !d.hours_sun_enabled
                ) {
                  next.hours_mon_fri_enabled = true;
                }
                return next;
              })
            }
            aria-label="mailbox-hours-enabled"
          />
          <span className="font-semibold text-text-primary">
            {t("marketing.mailbox_form.hours_enabled")}
          </span>
        </label>
        {draft.hours_enabled && (
          <div
            data-testid="mailbox-active-hours"
            className="mt-3 space-y-2 text-[11px] text-text-secondary"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                {t("marketing.mailbox_form.timezone_label")}
                <Input
                  value={draft.hours_timezone}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      hours_timezone: e.target.value,
                    }))
                  }
                  placeholder={t("marketing.mailbox_form.timezone_placeholder")}
                  aria-label="mailbox-hours-tz"
                  className="rounded border  bg-white px-2 py-1 text-[11px]"
                />
              </label>
              <label className="flex flex-col gap-1">
                {t("marketing.mailbox_form.off_hours_poll")}
                <Input
                  type="number"
                  min={15}
                  max={3600}
                  value={draft.hours_off_seconds}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      hours_off_seconds: Math.max(
                        15,
                        Math.min(3600, Number(e.target.value) || 300),
                      ),
                    }))
                  }
                  aria-label="mailbox-hours-off"
                  className="rounded border  bg-white px-2 py-1 text-[11px]"
                />
              </label>
            </div>
            <DayWindowRow
              dayLabel={t("marketing.mailbox_form.day_mon_fri")}
              testidKey="mon_fri"
              enabled={draft.hours_mon_fri_enabled}
              start={draft.hours_mon_fri_start}
              end={draft.hours_mon_fri_end}
              onToggle={(v) =>
                setDraft((d) => ({ ...d, hours_mon_fri_enabled: v }))
              }
              onStart={(v) =>
                setDraft((d) => ({ ...d, hours_mon_fri_start: v }))
              }
              onEnd={(v) => setDraft((d) => ({ ...d, hours_mon_fri_end: v }))}
            />
            <DayWindowRow
              dayLabel={t("marketing.mailbox_form.day_saturday")}
              testidKey="saturday"
              enabled={draft.hours_sat_enabled}
              start={draft.hours_sat_start}
              end={draft.hours_sat_end}
              onToggle={(v) =>
                setDraft((d) => ({ ...d, hours_sat_enabled: v }))
              }
              onStart={(v) => setDraft((d) => ({ ...d, hours_sat_start: v }))}
              onEnd={(v) => setDraft((d) => ({ ...d, hours_sat_end: v }))}
            />
            <DayWindowRow
              dayLabel={t("marketing.mailbox_form.day_sunday")}
              testidKey="sunday"
              enabled={draft.hours_sun_enabled}
              start={draft.hours_sun_start}
              end={draft.hours_sun_end}
              onToggle={(v) =>
                setDraft((d) => ({ ...d, hours_sun_enabled: v }))
              }
              onStart={(v) => setDraft((d) => ({ ...d, hours_sun_start: v }))}
              onEnd={(v) => setDraft((d) => ({ ...d, hours_sun_end: v }))}
            />
            {!hoursValid && (
              <p
                role="alert"
                className="rounded bg-rose-50 px-2 py-1 text-[10px] text-rose-700 ring-1 ring-rose-200"
              >
                {t("marketing.mailbox_form.hours_invalid")}
              </p>
            )}
          </div>
        )}
      </div>

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
            {t("marketing.mailbox_form.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

function DayWindowRow({
  dayLabel,
  testidKey,
  enabled,
  start,
  end,
  onToggle,
  onStart,
  onEnd,
}: {
  dayLabel: string;
  testidKey: string;
  enabled: boolean;
  start: string;
  end: string;
  onToggle: (v: boolean) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  const valid = !enabled || validHoursRange(start, end);
  return (
    <div
      data-testid={`mailbox-day-${testidKey}`}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="flex items-center gap-1">
        <Checkbox
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`mailbox-day-${testidKey}-enabled`}
        />
        <span className="w-16 text-text-primary">{dayLabel}</span>
      </label>
      <Input
        type="time"
        value={start}
        onChange={(e) => onStart(e.target.value)}
        disabled={!enabled}
        aria-label={`mailbox-day-${testidKey}-start`}
        className={`rounded border bg-white px-2 py-1 text-[11px] ${
          valid ? "" : "border-rose-300"
        } disabled:opacity-50`}
      />
      <span className="text-text-meta">→</span>
      <Input
        type="time"
        value={end}
        onChange={(e) => onEnd(e.target.value)}
        disabled={!enabled}
        aria-label={`mailbox-day-${testidKey}-end`}
        className={`rounded border bg-white px-2 py-1 text-[11px] ${
          valid ? "" : "border-rose-300"
        } disabled:opacity-50`}
      />
    </div>
  );
}
