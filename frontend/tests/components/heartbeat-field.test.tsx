// M15.18.d — coverage for the heartbeat field embedded in the
// agent edit drawer. Toggle off by default; flipping it on
// reveals the preset rungs; preset clicks emit the canonical
// humantime literal; `Custom` opens a free-form text input.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  HEARTBEAT_PRESETS,
  HeartbeatField,
  type HeartbeatWire,
} from "../../src/modules/agents/heartbeat";

function setup(initial: HeartbeatWire | undefined) {
  const onChange = vi.fn();
  const utils = render(
    <HeartbeatField value={initial} onChange={onChange} />,
  );
  return { onChange, ...utils };
}

describe("HeartbeatField — M15.18.d", () => {
  it("renders OFF when value is undefined (yaml block absent)", () => {
    setup(undefined);
    const toggle = screen.getByTestId(
      "heartbeat-enabled",
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    // Slider rungs only appear when enabled = true.
    expect(screen.queryByTestId("heartbeat-preset-15m")).toBeNull();
  });

  it("flipping the toggle emits enabled=true with the existing interval", () => {
    const { onChange } = setup({ enabled: false, interval: "1h" });
    fireEvent.click(screen.getByTestId("heartbeat-enabled"));
    expect(onChange).toHaveBeenCalledWith({ enabled: true, interval: "1h" });
  });

  it("renders preset rungs when enabled and highlights the current interval", () => {
    setup({ enabled: true, interval: "30m" });
    for (const p of HEARTBEAT_PRESETS) {
      expect(screen.getByTestId(`heartbeat-preset-${p.interval}`)).toBeTruthy();
    }
    // The 30m chip carries the active class (`bg-accent`).
    const chip = screen.getByTestId("heartbeat-preset-30m");
    expect(chip.className).toContain("bg-accent");
  });

  it("clicking a preset emits the canonical humantime literal", () => {
    const { onChange } = setup({ enabled: true, interval: "5m" });
    fireEvent.click(screen.getByTestId("heartbeat-preset-1h"));
    expect(onChange).toHaveBeenCalledWith({ enabled: true, interval: "1h" });
  });

  it("Custom opens a humantime text input seeded with the current value", () => {
    setup({ enabled: true, interval: "90m" });
    // `90m` matches no preset → custom input renders by default.
    const input = screen.getByTestId(
      "heartbeat-custom-input",
    ) as HTMLInputElement;
    expect(input.value).toBe("90m");
  });

  it("typing into the custom input forwards the literal verbatim", () => {
    const { onChange } = setup({ enabled: true, interval: "" });
    const input = screen.getByTestId(
      "heartbeat-custom-input",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12h" } });
    expect(onChange).toHaveBeenCalledWith({ enabled: true, interval: "12h" });
  });

  it("falls back to 5m default when value.interval is empty", () => {
    setup({ enabled: true, interval: "" });
    // The preset 5m chip is highlighted because the default fallback
    // matches the 15m? No — fallback is 5m. 5m is not a preset, so
    // `Custom` is highlighted instead.
    const custom = screen.getByTestId("heartbeat-preset-custom");
    expect(custom.className).toContain("bg-accent");
  });
});
