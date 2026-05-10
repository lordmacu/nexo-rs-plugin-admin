import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { Rail } from "../../src/shell/Rail";
import type { ModuleEntry } from "../../src/shell/ModuleRegistry";
import type { ModuleManifest } from "../../src/shell/types";

function entry(
  id: string,
  order: number,
  opts: { disabled?: boolean; badge?: () => React.ReactNode | null } = {},
): ModuleEntry {
  return {
    manifest: {
      id,
      version: "1.0.0",
      rail: { icon: <span data-testid={`icon-${id}`}>{id}</span>, label: id, order, badge: opts.badge },
      routes: [],
    } as unknown as ModuleManifest,
    error: opts.disabled ? { kind: "manifest_invalid", module: id, cause: null } : null,
    disabled: opts.disabled ?? false,
  };
}

function renderRail(entries: ModuleEntry[], path = "/m/chats") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/m/*" element={<Rail entries={entries} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Rail", () => {
  it("renders one tab per enabled entry, sorted by order", () => {
    renderRail([
      entry("chats", 100),
      entry("agents", 200),
    ]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-label", "chats");
    expect(tabs[1]).toHaveAttribute("aria-label", "agents");
  });

  it("marks the route-matched module as selected", () => {
    renderRail([entry("chats", 100), entry("agents", 200)], "/m/agents");
    expect(screen.getByTestId("rail-icon-chats")).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByTestId("rail-icon-agents")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders disabled entries below a separator with a reason tooltip", () => {
    renderRail([
      entry("chats", 100),
      entry("broken", 300, { disabled: true }),
    ]);
    const broken = screen.getByTestId("rail-icon-broken-disabled");
    expect(broken).toHaveAttribute("aria-disabled", "true");
    expect(broken).toHaveAttribute(
      "title",
      expect.stringContaining("Manifest invalid"),
    );
  });

  it("renders the badge when manifest.rail.badge returns a value", () => {
    renderRail([
      entry("chats", 100, { badge: () => 7 }),
    ]);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("ArrowDown moves focus to the next enabled tab", () => {
    renderRail([entry("chats", 100), entry("agents", 200)]);
    const first = screen.getByTestId("rail-icon-chats");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("rail-icon-agents"));
  });
});
