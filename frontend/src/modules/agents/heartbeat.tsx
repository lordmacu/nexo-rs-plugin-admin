// M15.18.d — heartbeat tick config field for the agent edit
// drawer. Off by default (mirrors the framework default for
// back-compat agents). When the operator flips the toggle on, the
// rung selector exposes humantime presets + a `custom` escape
// hatch.
//
// Wire shape mirrors `nexo_tool_meta::admin::agents::HeartbeatWire`:
//   { enabled: bool, interval: humantime literal }
// Empty `interval` on save means "keep the existing yaml block"
// — the daemon's `upsert_yaml` no-ops the write to avoid bricking
// the next boot's humantime parse.

import { Checkbox, Chip, Code, Input } from "../../components/ui";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

export interface HeartbeatWire {
  enabled: boolean;
  /** humantime literal — `"5m"`, `"30s"`, `"1h"`. Empty = keep
   *  the existing yaml value on save. */
  interval: string;
}

/** Preset rungs for the slider. `interval` strings are the exact
 *  humantime literals shipped to the daemon. */
export const HEARTBEAT_PRESETS: ReadonlyArray<{
  label_key: CatalogKey;
  interval: string;
}> = [
  { label_key: "agents.heartbeat.preset_15m", interval: "15m" },
  { label_key: "agents.heartbeat.preset_30m", interval: "30m" },
  { label_key: "agents.heartbeat.preset_1h", interval: "1h" },
  { label_key: "agents.heartbeat.preset_4h", interval: "4h" },
  { label_key: "agents.heartbeat.preset_1d", interval: "1d" },
];

export function HeartbeatField({
  value,
  onChange,
}: {
  value: HeartbeatWire | undefined;
  onChange: (hb: HeartbeatWire) => void;
}) {
  const t = useT();
  const enabled = value?.enabled ?? false;
  // Default to 5m for the slider when the operator first flips
  // enabled; mirrors `HeartbeatConfig::default` on the daemon.
  const interval =
    value?.interval && value.interval.length > 0 ? value.interval : "5m";
  const matchedPreset = HEARTBEAT_PRESETS.find((p) => p.interval === interval);
  const isCustom = enabled && !matchedPreset;
  return (
    <div>
      <span className="block text-xs font-medium text-text-secondary mb-1">
        {t("agents.heartbeat.label")}
      </span>
      <div className="space-y-2 rounded border  bg-panel-alt px-3 py-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={enabled}
            onChange={(e) =>
              onChange({
                enabled: e.target.checked,
                // Preserve the existing interval when toggling
                // off so flipping back on doesn't reset to 5m.
                interval,
              })
            }
            data-testid="heartbeat-enabled"
          />
          <span>{t("agents.heartbeat.toggle")}</span>
        </label>
        {!enabled && (
          <p className="text-[11px] text-text-meta">
            {t("agents.heartbeat.off_help")}
          </p>
        )}
        {enabled && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {HEARTBEAT_PRESETS.map((preset) => {
                const active = matchedPreset?.interval === preset.interval;
                return (
                  <Chip
                    key={preset.interval}
                    active={active}
                    onClick={() =>
                      onChange({ enabled: true, interval: preset.interval })
                    }
                    data-testid={`heartbeat-preset-${preset.interval}`}
                  >
                    {t(preset.label_key)}
                  </Chip>
                );
              })}
              <Chip
                active={isCustom}
                onClick={() =>
                  onChange({
                    enabled: true,
                    // Seed the custom field with the current value so
                    // operators don't lose it when clicking `custom`.
                    interval: isCustom ? interval : "",
                  })
                }
                data-testid="heartbeat-preset-custom"
              >
                {t("agents.heartbeat.preset_custom")}
              </Chip>
            </div>
            {isCustom && (
              <div>
                <Input
                  value={interval}
                  placeholder={t("agents.heartbeat.custom_placeholder")}
                  onChange={(e) =>
                    onChange({ enabled: true, interval: e.target.value })
                  }
                  className="w-full rounded border px-3 py-1.5 text-sm"
                  data-testid="heartbeat-custom-input"
                />
                <p className="mt-1 text-[11px] text-text-meta">
                  {t("agents.heartbeat.custom_help_prefix")}
                  <Code>s</Code>
                  {t("agents.heartbeat.custom_help_minutes")}
                  <Code>m</Code>
                  {t("agents.heartbeat.custom_help_hours")}
                  <Code>h</Code>
                  {t("agents.heartbeat.custom_help_days")}
                  <Code>d</Code>
                  {t("agents.heartbeat.custom_help_suffix")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
