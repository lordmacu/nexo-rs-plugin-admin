// M15.21.followup-override — coverage for the Skip /
// Postpone bypass card embedded in the lead drawer's
// Followup section.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/api/marketing")
  >("../../src/api/marketing");
  return {
    ...actual,
    followupOverride: vi.fn(),
  };
});

import FollowupOverride from "../../src/modules/marketing/components/FollowupOverride";
import { followupOverride } from "../../src/api/marketing";

const followupOverrideMock = vi.mocked(followupOverride);

beforeEach(() => {
  vi.clearAllMocks();
  followupOverrideMock.mockResolvedValue({
    lead: {} as never,
    action: "skip",
    next_check_at_ms: null,
    reason: "operator override",
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("FollowupOverride — M15.21", () => {
  it("disables Skip when there is no pending followup", () => {
    render(
      <FollowupOverride leadId="l-1" nextCheckAtMs={null} attempts={0} />,
    );
    const skip = screen.getByTestId("followup-skip") as HTMLButtonElement;
    expect(skip.disabled).toBe(true);
  });

  it("Skip dispatches `action: skip` and stamps onApplied with null", async () => {
    const onApplied = vi.fn();
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 86_400_000}
        attempts={1}
        onApplied={onApplied}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-skip"));
    await waitFor(() => {
      expect(followupOverrideMock).toHaveBeenCalledWith("l-1", {
        action: "skip",
      });
    });
    expect(onApplied).toHaveBeenCalledWith(null);
  });

  it("opens the postpone picker on click", () => {
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 86_400_000}
        attempts={1}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-postpone-open"));
    expect(screen.getByTestId("followup-postpone-picker")).toBeTruthy();
    expect(screen.getByTestId("followup-postpone-preset-24h")).toBeTruthy();
    expect(screen.getByTestId("followup-postpone-preset-72h")).toBeTruthy();
    expect(screen.getByTestId("followup-postpone-preset-168h")).toBeTruthy();
  });

  it("preset click sends `action: postpone` with until_ms in the future", async () => {
    const before = Date.now();
    const onApplied = vi.fn();
    followupOverrideMock.mockImplementationOnce(async (_id, body) => ({
      lead: {} as never,
      action: "postpone",
      next_check_at_ms:
        body.action === "postpone" ? body.until_ms : null,
      reason: "operator override",
    }));
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 60_000}
        attempts={0}
        onApplied={onApplied}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-postpone-open"));
    fireEvent.click(screen.getByTestId("followup-postpone-preset-24h"));
    await waitFor(() => {
      expect(followupOverrideMock).toHaveBeenCalled();
    });
    const call = followupOverrideMock.mock.calls[0];
    const [leadId, body] = call;
    expect(leadId).toBe("l-1");
    expect(body.action).toBe("postpone");
    if (body.action === "postpone") {
      // Roughly 24h forward (allow ±5s for test clock drift).
      expect(body.until_ms).toBeGreaterThanOrEqual(
        before + 24 * 3_600_000 - 5_000,
      );
      expect(body.until_ms).toBeLessThanOrEqual(
        Date.now() + 24 * 3_600_000 + 5_000,
      );
    }
    expect(onApplied).toHaveBeenCalled();
  });

  it("custom datetime picker closes the picker on success", async () => {
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 60_000}
        attempts={0}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-postpone-open"));
    // The default custom value is set on mount — fire submit
    // directly. The mock resolves successfully so the
    // component returns to idle.
    fireEvent.click(screen.getByTestId("followup-postpone-custom-submit"));
    await waitFor(() => {
      expect(followupOverrideMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("followup-postpone-picker")).toBeNull();
    });
    expect(screen.getByTestId("followup-skip")).toBeTruthy();
  });

  it("Cancel button restores the idle row without calling the API", () => {
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 60_000}
        attempts={0}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-postpone-open"));
    fireEvent.click(screen.getByTestId("followup-postpone-cancel"));
    expect(screen.queryByTestId("followup-postpone-picker")).toBeNull();
    expect(followupOverrideMock).not.toHaveBeenCalled();
  });

  it("surfaces an API error inline (404 lead_not_found)", async () => {
    followupOverrideMock.mockRejectedValueOnce(
      new Error("404 lead_not_found"),
    );
    render(
      <FollowupOverride
        leadId="l-1"
        nextCheckAtMs={Date.now() + 60_000}
        attempts={0}
      />,
    );
    fireEvent.click(screen.getByTestId("followup-skip"));
    await waitFor(() => {
      expect(
        screen.getByTestId("followup-override-error").textContent,
      ).toContain("404 lead_not_found");
    });
  });
});
