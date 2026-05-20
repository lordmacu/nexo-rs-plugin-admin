// Phase 98.12 — `PluginsTabs` render coverage. Pure component
// (no API calls); we render it inside a thin harness and assert:
//   - The active tab's content renders; the other's doesn't.
//   - Clicking the inactive tab invokes `onChange` with the right key.
//   - Optional badge counts render when provided.
//
// `useT` falls back to passing the key through unchanged when the
// i18n catalog isn't initialised in the test harness, so the
// assertions match the underlying translation keys.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import PluginsTabs, {
  type PluginsTabKey,
} from "../../src/modules/plugins/PluginsTabs";

function Harness({
  initial = "installed",
  installedCount,
  availableCount,
}: {
  initial?: PluginsTabKey;
  installedCount?: number;
  availableCount?: number;
}) {
  const [tab, setTab] = useState<PluginsTabKey>(initial);
  return (
    <PluginsTabs
      active={tab}
      onChange={setTab}
      installedCount={installedCount}
      availableCount={availableCount}
    >
      {tab === "installed" ? (
        <div>installed-child</div>
      ) : (
        <div>available-child</div>
      )}
    </PluginsTabs>
  );
}

describe("PluginsTabs", () => {
  it("renders the active tab's content", () => {
    render(<Harness initial="installed" />);
    expect(screen.getByText("installed-child")).toBeTruthy();
    expect(screen.queryByText("available-child")).toBeNull();
  });

  it("switches tabs on click + re-renders new content", () => {
    render(<Harness initial="installed" />);
    expect(screen.getByText("installed-child")).toBeTruthy();
    // Find the Available tab. `useT` echoes the key in the test
    // harness so we look for the i18n key text directly.
    const availTab = screen.getAllByRole("tab").find((b) => {
      return b.getAttribute("aria-selected") === "false";
    });
    expect(availTab).toBeTruthy();
    fireEvent.click(availTab as HTMLElement);
    expect(screen.getByText("available-child")).toBeTruthy();
    expect(screen.queryByText("installed-child")).toBeNull();
  });

  it("invokes onChange with the inactive tab's key", () => {
    const onChange = vi.fn();
    render(
      <PluginsTabs active="installed" onChange={onChange}>
        <span>kid</span>
      </PluginsTabs>,
    );
    const tabs = screen.getAllByRole("tab");
    // active=installed → second tab is available
    fireEvent.click(tabs[1]);
    expect(onChange).toHaveBeenCalledWith("available");
  });

  it("renders badge counts when supplied", () => {
    render(<Harness installedCount={3} availableCount={7} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("omits badge spans when counts are absent", () => {
    const { container } = render(<Harness />);
    // Each TabButton renders the badge as a `<span>` only when the
    // count prop is a number. With both omitted, there should be no
    // numeric badge children inside tab buttons.
    const tabs = container.querySelectorAll("[role='tab']");
    expect(tabs.length).toBe(2);
    tabs.forEach((t) => {
      // No numeric child text → badge wasn't rendered.
      const badge = t.querySelector("span");
      expect(badge).toBeNull();
    });
  });
});
