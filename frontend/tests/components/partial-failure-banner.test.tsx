// Phase 98.14 — `<PartialFailureBanner>` render coverage.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import PartialFailureBanner from "../../src/modules/plugins/PartialFailureBanner";
import type { SourceError } from "../../src/api/plugin_discovery";

beforeEach(() => {
  // Clear the dismiss record between tests so dismissals don't
  // leak across the suite.
  try {
    sessionStorage.removeItem("plugins.partial_failure_dismiss");
  } catch {
    // jsdom may not expose sessionStorage in every config; the
    // banner has its own try/catch so the missing storage path
    // already works without setup.
  }
});

afterEach(() => {
  try {
    sessionStorage.removeItem("plugins.partial_failure_dismiss");
  } catch {
    /* no-op */
  }
});

describe("PartialFailureBanner", () => {
  it("renders nothing when failures list is empty", () => {
    const { container } = render(<PartialFailureBanner failures={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one row per failure with source + message", () => {
    const failures: SourceError[] = [
      { source: "github_topic", message: "rate-limited (set GITHUB_TOKEN…)" },
      { source: "curated_index", message: "index not found (Phase 98.16)" },
    ];
    render(<PartialFailureBanner failures={failures} />);
    expect(screen.getByText("github_topic")).toBeTruthy();
    expect(screen.getByText("curated_index")).toBeTruthy();
    expect(
      screen.getByText(/rate-limited \(set GITHUB_TOKEN…\)/),
    ).toBeTruthy();
  });

  it("disappears after dismissing same failure set", () => {
    const failures: SourceError[] = [
      { source: "github_topic", message: "rate-limited" },
    ];
    const { rerender, container } = render(
      <PartialFailureBanner failures={failures} />,
    );
    // Banner visible initially.
    expect(container.firstChild).not.toBeNull();
    // Click dismiss (X button with `aria-label`).
    const dismiss = screen.getByRole("button");
    fireEvent.click(dismiss);
    // Re-render with the SAME failures → banner stays hidden.
    rerender(<PartialFailureBanner failures={failures} />);
    expect(container.firstChild).toBeNull();
  });

  it("re-appears when a NEW failure joins the set after dismiss", () => {
    const f1: SourceError[] = [
      { source: "github_topic", message: "rate-limited" },
    ];
    const f2: SourceError[] = [
      ...f1,
      { source: "curated_index", message: "404" },
    ];
    const { rerender, container } = render(
      <PartialFailureBanner failures={f1} />,
    );
    fireEvent.click(screen.getByRole("button"));
    rerender(<PartialFailureBanner failures={f1} />);
    expect(container.firstChild).toBeNull();
    // New failure → signature changes → banner re-appears.
    rerender(<PartialFailureBanner failures={f2} />);
    expect(container.firstChild).not.toBeNull();
  });
});
