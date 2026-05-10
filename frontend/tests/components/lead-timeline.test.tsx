// M15.22 — `LeadTimeline` coverage. Two surfaces: pure
// `mergeRows` helper + the component's render path.
//
// Network seam: `getAudit` + `subscribeMarketingStream` both
// stubbed at the `api/marketing` import boundary so the
// test never hits fetch / EventSource.

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
    subscribeMarketingStream: vi.fn(),
  };
});

import LeadTimeline, {
  mergeRows,
} from "../../src/modules/marketing/components/LeadTimeline";
import {
  getAudit,
  subscribeMarketingStream,
  type MarketingFirehoseEvent,
  type MarketingStreamHandlers,
} from "../../src/api/marketing";

const getAuditMock = getAudit as unknown as ReturnType<typeof vi.fn>;
const subscribeMock = subscribeMarketingStream as unknown as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  getAuditMock.mockReset();
  subscribeMock.mockReset();
  subscribeMock.mockReturnValue(() => {});
});

afterEach(() => {
  getAuditMock.mockReset();
  subscribeMock.mockReset();
});

describe("mergeRows", () => {
  it("appends a fresh row and re-sorts ascending", () => {
    const out = mergeRows(
      [{ kind: "thread_bumped", at_ms: 200 }],
      { kind: "thread_bumped", at_ms: 100 },
    );
    expect(out.map((r) => r.at_ms)).toEqual([100, 200]);
  });

  it("dedupes by (kind, at_ms)", () => {
    const out = mergeRows(
      [{ kind: "thread_bumped", at_ms: 100 }],
      { kind: "thread_bumped", at_ms: 100 },
    );
    expect(out).toHaveLength(1);
  });

  it("keeps two rows with same at_ms when kinds differ", () => {
    const out = mergeRows(
      [{ kind: "thread_bumped", at_ms: 100 }],
      {
        kind: "lead_transitioned",
        at_ms: 100,
        from: "cold",
        to: "engaged",
        reason: "demo",
      },
    );
    expect(out).toHaveLength(2);
  });
});

describe("LeadTimeline render", () => {
  it("shows loading state while audit is in-flight", () => {
    getAuditMock.mockReturnValue(new Promise(() => {}));
    render(<LeadTimeline leadId="l-1" />);
    expect(screen.getByText(/Cargando timeline/i)).toBeInTheDocument();
  });

  it("renders empty-state when no audit events return", async () => {
    getAuditMock.mockResolvedValue({ events: [], count: 0 });
    render(<LeadTimeline leadId="l-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Sin eventos auditados/i)).toBeInTheDocument();
    });
  });

  it("renders chronological audit rows after backfill", async () => {
    getAuditMock.mockResolvedValue({
      events: [
        {
          kind: "lead_transitioned",
          tenant_id: "acme",
          lead_id: "l-1",
          from: "cold",
          to: "engaged",
          reason: "first reply",
          at_ms: 200,
        },
        {
          kind: "routing_decided",
          tenant_id: "acme",
          lead_id: "l-1",
          from_email: "juan@acme.com",
          chosen_seller_id: "pedro",
          rule_id: "warm",
          why: [],
          score: 65,
          score_reasons: [],
          at_ms: 100,
        },
      ],
      count: 2,
    });
    render(<LeadTimeline leadId="l-1" />);
    const list = await screen.findByTestId("lead-timeline-list");
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(2);
    // Ordered ascending — routing (100) before transition (200).
    expect(items[0]?.textContent).toMatch(/Ruteado · score 65/);
    expect(items[1]?.textContent).toMatch(/cold → engaged/);
  });

  it("renders error banner when audit fetch fails", async () => {
    getAuditMock.mockRejectedValue(new Error("network blip"));
    render(<LeadTimeline leadId="l-1" />);
    await waitFor(() => {
      expect(
        screen.getByText(/Timeline no disponible · network blip/i),
      ).toBeInTheDocument();
    });
  });

  it("merges live firehose events for the same lead", async () => {
    getAuditMock.mockResolvedValue({
      events: [
        {
          kind: "lead_transitioned",
          tenant_id: "acme",
          lead_id: "l-1",
          from: "cold",
          to: "engaged",
          reason: "first reply",
          at_ms: 100,
        },
      ],
      count: 1,
    });
    let pushedHandlers: MarketingStreamHandlers | null = null;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      pushedHandlers = h;
      return () => {};
    });
    render(<LeadTimeline leadId="l-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("lead-timeline-list")).toBeInTheDocument();
    });
    // Inject a fresh firehose event for the same lead.
    const live: MarketingFirehoseEvent = {
      kind: "thread_bumped",
      tenant_id: "acme",
      lead_id: "l-1",
      thread_id: "th-1",
      at_ms: 200,
    };
    pushedHandlers!.onEvent(live);
    await waitFor(() => {
      const list = screen.getByTestId("lead-timeline-list");
      expect(list.querySelectorAll("li").length).toBe(2);
    });
  });

  it("ignores firehose events for other leads", async () => {
    getAuditMock.mockResolvedValue({ events: [], count: 0 });
    let pushedHandlers: MarketingStreamHandlers | null = null;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      pushedHandlers = h;
      return () => {};
    });
    render(<LeadTimeline leadId="l-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Sin eventos auditados/i)).toBeInTheDocument();
    });
    pushedHandlers!.onEvent({
      kind: "thread_bumped",
      tenant_id: "acme",
      lead_id: "OTHER",
      thread_id: "th",
      at_ms: 200,
    });
    // Still empty — the cross-lead event was filtered out.
    expect(screen.getByText(/Sin eventos auditados/i)).toBeInTheDocument();
  });
});
