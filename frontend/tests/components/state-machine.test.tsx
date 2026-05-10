// Render + interaction coverage for `StateMachine`.
// Read-only mode (no leadId) renders the ladder without
// click affordances; live mode (leadId set) exposes
// "Mover →" buttons + "Marcar lost".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    transitionLead: vi.fn(),
  };
});

import StateMachine from "../../src/modules/marketing/components/StateMachine";
import { transitionLead } from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

const transitionMock = transitionLead as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  transitionMock.mockReset();
});

afterEach(() => {
  transitionMock.mockReset();
});

describe("StateMachine read-only mode", () => {
  it("renders ladder without click buttons when leadId omitted", () => {
    render(<StateMachine state="cold" />);
    expect(screen.getByText("cold")).toBeInTheDocument();
    expect(screen.getByText("engaged")).toBeInTheDocument();
    expect(screen.queryByLabelText(/transition-to-/)).toBeNull();
  });

  it("marks the active state with `actual` chip", () => {
    render(<StateMachine state="engaged" />);
    expect(screen.getByText("actual")).toBeInTheDocument();
  });

  it("renders lost row when state is lost", () => {
    render(<StateMachine state="lost" />);
    expect(screen.getByText("lost")).toBeInTheDocument();
  });
});

describe("StateMachine live mode", () => {
  it("renders Mover → buttons for non-active states", () => {
    render(<StateMachine state="cold" leadId="l-1" />);
    expect(screen.getByLabelText("transition-to-engaged")).toBeInTheDocument();
    expect(
      screen.getByLabelText("transition-to-meeting_scheduled"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("transition-to-lost")).toBeInTheDocument();
    // Active row has no transition button.
    expect(
      screen.queryByLabelText("transition-to-cold"),
    ).toBeNull();
  });

  it("fires transitionLead with reason from prompt", async () => {
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValue("first reply");
    transitionMock.mockResolvedValue({
      lead: {},
      from: "cold",
      to: "engaged",
      reason: "first reply",
    });
    const onTransitioned = vi.fn();
    render(
      <StateMachine
        state="cold"
        leadId="l-1"
        onTransitioned={onTransitioned}
      />,
    );
    fireEvent.click(screen.getByLabelText("transition-to-engaged"));
    await waitFor(() => {
      expect(transitionMock).toHaveBeenCalledWith("l-1", {
        to: "engaged",
        reason: "first reply",
      });
    });
    expect(onTransitioned).toHaveBeenCalledTimes(1);
    promptSpy.mockRestore();
  });

  it("skips reason field when prompt returns empty string", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("");
    transitionMock.mockResolvedValue({
      lead: {},
      from: "cold",
      to: "engaged",
      reason: "operator override",
    });
    render(<StateMachine state="cold" leadId="l-1" />);
    fireEvent.click(screen.getByLabelText("transition-to-engaged"));
    await waitFor(() => {
      expect(transitionMock).toHaveBeenCalledWith("l-1", { to: "engaged" });
    });
    promptSpy.mockRestore();
  });

  it("aborts when prompt returns null (cancel)", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<StateMachine state="cold" leadId="l-1" />);
    fireEvent.click(screen.getByLabelText("transition-to-engaged"));
    expect(transitionMock).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("surfaces server error inline", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("");
    transitionMock.mockRejectedValue(
      new HttpError(422, {
        code: "illegal_transition",
        message: "cold → qualified",
      }),
    );
    render(<StateMachine state="cold" leadId="l-1" />);
    fireEvent.click(screen.getByLabelText("transition-to-qualified"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/illegal_transition/i);
    });
    promptSpy.mockRestore();
  });
});
