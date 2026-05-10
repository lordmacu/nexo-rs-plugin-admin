// Coverage for `summarise` (pure helper) +
// `ScoreExplainer` render path.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    getAudit: vi.fn(),
  };
});

import ScoreExplainer, {
  summarise,
} from "../../src/modules/marketing/components/ScoreExplainer";
import {
  getAudit,
  type MarketingAuditEvent,
} from "../../src/api/marketing";

const getAuditMock = getAudit as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getAuditMock.mockReset();
});

afterEach(() => {
  getAuditMock.mockReset();
});

const routingDecided = (overrides: Partial<MarketingAuditEvent> = {}): MarketingAuditEvent =>
  ({
    kind: "routing_decided",
    tenant_id: "acme",
    lead_id: "l-1",
    from_email: "juan@acme.com",
    chosen_seller_id: "pedro",
    rule_id: "warm-corp",
    why: [],
    score: 65,
    score_reasons: [
      { label: "Corporate domain", delta: 15 },
      { label: "Replied within 1h", delta: 10, detail: "fast follow-up" },
      { label: "Negative sentiment", delta: -5 },
    ],
    at_ms: 1700000000000,
    ...overrides,
  }) as MarketingAuditEvent;

describe("summarise", () => {
  it("returns null when no routing_decided row present", () => {
    expect(summarise([])).toBeNull();
    expect(
      summarise([
        {
          kind: "lead_transitioned",
          tenant_id: "acme",
          lead_id: "l-1",
          from: "cold",
          to: "engaged",
          reason: "x",
          at_ms: 1,
        },
      ]),
    ).toBeNull();
  });

  it("projects the first routing_decided row", () => {
    const out = summarise([routingDecided()]);
    expect(out?.score).toBe(65);
    expect(out?.rule_id).toBe("warm-corp");
    expect(out?.reasons).toHaveLength(3);
  });

  it("preserves delta + detail through the projection", () => {
    const out = summarise([routingDecided()]);
    expect(out?.reasons[1]?.delta).toBe(10);
    expect(out?.reasons[1]?.detail).toBe("fast follow-up");
  });
});

describe("ScoreExplainer render", () => {
  it("renders nothing while loading", () => {
    getAuditMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ScoreExplainer leadId="l-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no routing_decided row exists", async () => {
    getAuditMock.mockResolvedValue({ events: [], count: 0 });
    const { container } = render(<ScoreExplainer leadId="l-1" />);
    await waitFor(() => {
      expect(getAuditMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders score header + ordered reasons", async () => {
    getAuditMock.mockResolvedValue({
      events: [routingDecided()],
      count: 1,
    });
    render(<ScoreExplainer leadId="l-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("score-explainer")).toBeInTheDocument();
    });
    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.getByText(/warm-corp/)).toBeInTheDocument();
    expect(screen.getByText("Corporate domain")).toBeInTheDocument();
    expect(screen.getByText("+15")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();
    expect(screen.getByText("-5")).toBeInTheDocument();
    expect(screen.getByText(/fast follow-up/)).toBeInTheDocument();
  });

  it("hides on audit fetch error", async () => {
    getAuditMock.mockRejectedValue(new Error("blip"));
    const { container } = render(<ScoreExplainer leadId="l-1" />);
    await waitFor(() => {
      expect(getAuditMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("forwards limit=1 + kind filter to getAudit", async () => {
    getAuditMock.mockResolvedValue({ events: [], count: 0 });
    render(<ScoreExplainer leadId="l-1" />);
    await waitFor(() => {
      expect(getAuditMock).toHaveBeenCalledWith({
        lead_id: "l-1",
        kind: "routing_decided",
        limit: 1,
      });
    });
  });
});
