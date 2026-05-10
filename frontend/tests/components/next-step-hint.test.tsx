// Coverage for `suggestNextStep` (pure heuristic) +
// `NextStepHint` render + click flow.

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

import NextStepHint, {
  suggestNextStep,
} from "../../src/modules/marketing/components/NextStepHint";
import { transitionLead } from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

const transitionMock = transitionLead as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  transitionMock.mockReset();
});

afterEach(() => {
  transitionMock.mockReset();
});

describe("suggestNextStep", () => {
  it("returns null for terminal states", () => {
    expect(
      suggestNextStep({
        state: "qualified",
        intent: "ready_to_buy",
        sentiment: "positive",
      }),
    ).toBeNull();
    expect(
      suggestNextStep({
        state: "lost",
        intent: "browsing",
        sentiment: "neutral",
      }),
    ).toBeNull();
  });

  it("recommends lost when intent is out_of_scope from any pre-terminal state", () => {
    const out = suggestNextStep({
      state: "engaged",
      intent: "out_of_scope",
      sentiment: "neutral",
    });
    expect(out?.to).toBe("lost");
    expect(out?.tone).toBe("lost");
  });

  it("cold + ready_to_buy + positive ⇒ engaged advance", () => {
    const out = suggestNextStep({
      state: "cold",
      intent: "ready_to_buy",
      sentiment: "positive",
    });
    expect(out?.to).toBe("engaged");
    expect(out?.tone).toBe("advance");
  });

  it("cold + browsing ⇒ engaged regardless of sentiment", () => {
    const out = suggestNextStep({
      state: "cold",
      intent: "browsing",
      sentiment: "neutral",
    });
    expect(out?.to).toBe("engaged");
  });

  it("cold + support_request ⇒ engaged caution", () => {
    const out = suggestNextStep({
      state: "cold",
      intent: "support_request",
      sentiment: "neutral",
    });
    expect(out?.to).toBe("engaged");
    expect(out?.tone).toBe("caution");
  });

  it("engaged + ready_to_buy + very_positive ⇒ meeting_scheduled", () => {
    const out = suggestNextStep({
      state: "engaged",
      intent: "ready_to_buy",
      sentiment: "very_positive",
    });
    expect(out?.to).toBe("meeting_scheduled");
    expect(out?.tone).toBe("advance");
  });

  it("engaged + objecting + negative ⇒ lost", () => {
    const out = suggestNextStep({
      state: "engaged",
      intent: "objecting",
      sentiment: "negative",
    });
    expect(out?.to).toBe("lost");
  });

  it("meeting_scheduled + ready_to_buy ⇒ qualified", () => {
    const out = suggestNextStep({
      state: "meeting_scheduled",
      intent: "ready_to_buy",
      sentiment: "neutral",
    });
    expect(out?.to).toBe("qualified");
  });

  it("returns null when no rule matches", () => {
    expect(
      suggestNextStep({
        state: "cold",
        intent: "objecting",
        sentiment: "neutral",
      }),
    ).toBeNull();
    expect(
      suggestNextStep({
        state: "meeting_scheduled",
        intent: "browsing",
        sentiment: "neutral",
      }),
    ).toBeNull();
  });
});

describe("NextStepHint render", () => {
  it("renders nothing for terminal states", () => {
    const { container } = render(
      <NextStepHint
        leadId="l-1"
        state="qualified"
        intent="ready_to_buy"
        sentiment="positive"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the suggestion card with reason + action button", () => {
    render(
      <NextStepHint
        leadId="l-1"
        state="cold"
        intent="ready_to_buy"
        sentiment="positive"
      />,
    );
    expect(screen.getByTestId("next-step-hint")).toBeInTheDocument();
    expect(screen.getByText(/ready_to_buy/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText("apply-next-step-engaged"),
    ).toBeInTheDocument();
  });

  it("fires transitionLead on click with prefilled reason", async () => {
    transitionMock.mockResolvedValue({
      lead: {},
      from: "cold",
      to: "engaged",
      reason: "ready_to_buy + sentiment positivo",
    });
    const onTransitioned = vi.fn();
    render(
      <NextStepHint
        leadId="l-1"
        state="cold"
        intent="ready_to_buy"
        sentiment="positive"
        onTransitioned={onTransitioned}
      />,
    );
    fireEvent.click(screen.getByLabelText("apply-next-step-engaged"));
    await waitFor(() => {
      expect(transitionMock).toHaveBeenCalledWith("l-1", {
        to: "engaged",
        reason: "ready_to_buy + sentiment positivo",
      });
    });
    expect(onTransitioned).toHaveBeenCalledTimes(1);
  });

  it("surfaces server error inline without removing the card", async () => {
    transitionMock.mockRejectedValue(
      new HttpError(422, {
        code: "illegal_transition",
        message: "cold → meeting_scheduled",
      }),
    );
    render(
      <NextStepHint
        leadId="l-1"
        state="engaged"
        intent="ready_to_buy"
        sentiment="very_positive"
      />,
    );
    fireEvent.click(
      screen.getByLabelText("apply-next-step-meeting_scheduled"),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /illegal_transition/i,
      );
    });
    expect(screen.getByTestId("next-step-hint")).toBeInTheDocument();
  });
});
