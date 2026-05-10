// Coverage for the live-only leads store:
//
// - successful fetch flips source to "api" with the API payload;
// - empty API list returns an empty leads array (operator
//   sees the empty-state banner instead of mock fixtures);
// - network failure flips source to "error" + records the
//   message so the sidebar banner can render "extension off".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/marketing", () => ({
  listLeads: vi.fn(),
  subscribeMarketingStream: vi.fn(),
}));

import {
  listLeads,
  subscribeMarketingStream,
  type MarketingFirehoseEvent,
  type MarketingStreamHandlers,
} from "../../src/api/marketing";
import { useMarketingLeads } from "../../src/store/marketingLeads";

const listLeadsMock = listLeads as unknown as ReturnType<typeof vi.fn>;
const subscribeMock = subscribeMarketingStream as unknown as ReturnType<
  typeof vi.fn
>;

const sampleLead = {
  id: "lead-real-1",
  tenant_id: "default",
  thread_id: "th-1",
  subject: "Demo enterprise pricing",
  person_id: "p-1",
  seller_id: "v-1",
  state: "engaged" as const,
  score: 72,
  sentiment: "positive" as const,
  intent: "comparing" as const,
  topic_tags: ["pricing"],
  last_activity_ms: 1_700_000_000_000,
  next_check_at_ms: null,
  followup_attempts: 0,
  why_routed: ["industry=saas"],
};

beforeEach(() => {
  // Reset the singleton store to its initial empty state.
  useMarketingLeads.setState({
    leads: [],
    source: "loading",
    error: null,
    last_synced_at_ms: null,
    live_status: "off",
    lagged_dropped_total: 0,
  });
  listLeadsMock.mockReset();
  subscribeMock.mockReset();
});

afterEach(() => {
  listLeadsMock.mockReset();
  subscribeMock.mockReset();
});

describe("marketing leads store — fetch", () => {
  it("flips source to 'api' and replaces leads on success", async () => {
    listLeadsMock.mockResolvedValueOnce({ leads: [sampleLead] });
    await useMarketingLeads.getState().fetch();
    const s = useMarketingLeads.getState();
    expect(s.source).toBe("api");
    expect(s.leads).toHaveLength(1);
    expect(s.leads[0]?.id).toBe("lead-real-1");
    expect(s.error).toBeNull();
    expect(s.last_synced_at_ms).not.toBeNull();
  });

  it("returns empty leads array when API returns empty list", async () => {
    listLeadsMock.mockResolvedValueOnce({ leads: [] });
    await useMarketingLeads.getState().fetch();
    const s = useMarketingLeads.getState();
    expect(s.source).toBe("api");
    expect(s.leads).toHaveLength(0);
    expect(s.last_synced_at_ms).not.toBeNull();
  });

  it("flips source to 'error' + records message on network failure", async () => {
    listLeadsMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await useMarketingLeads.getState().fetch();
    const s = useMarketingLeads.getState();
    expect(s.source).toBe("error");
    expect(s.error).toContain("ECONNREFUSED");
    expect(s.leads).toHaveLength(0);
  });
});

describe("marketing leads store — SSE firehose", () => {
  it("startLive flips status to 'open' on EventSource onOpen", () => {
    let captured: MarketingStreamHandlers | undefined;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      captured = h;
      return () => {};
    });
    const stop = useMarketingLeads.getState().startLive();
    expect(useMarketingLeads.getState().live_status).toBe("connecting");
    captured?.onOpen?.();
    expect(useMarketingLeads.getState().live_status).toBe("open");
    stop();
    expect(useMarketingLeads.getState().live_status).toBe("off");
  });

  it("created event prepends a synthetic lead and flips source to 'api'", () => {
    let captured: MarketingStreamHandlers | undefined;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      captured = h;
      return () => {};
    });
    useMarketingLeads.getState().startLive();
    const ev: MarketingFirehoseEvent = {
      kind: "created",
      tenant_id: "default",
      lead_id: "lead-fh-1",
      thread_id: "th-fh-1",
      subject: "Live demo subject",
      from_email: "live@empresa.com",
      seller_id: "unassigned",
      state: "cold",
      at_ms: 1_700_000_000_000,
      why_routed: ["resolver:display_name"],
    };
    captured?.onEvent(ev);
    const s = useMarketingLeads.getState();
    expect(s.source).toBe("api");
    // Created lead lands at the top of the list.
    expect(s.leads[0]?.id).toBe("lead-fh-1");
    expect(s.leads[0]?.subject).toBe("Live demo subject");
  });

  it("created event with duplicate id is a no-op (broadcast replay safe)", () => {
    let captured: MarketingStreamHandlers | undefined;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      captured = h;
      return () => {};
    });
    useMarketingLeads.getState().startLive();
    const ev: MarketingFirehoseEvent = {
      kind: "created",
      tenant_id: "default",
      lead_id: "lead-fh-dup",
      thread_id: "th-dup",
      subject: "Once",
      from_email: "x@y.com",
      seller_id: "unassigned",
      state: "cold",
      at_ms: 0,
      why_routed: [],
    };
    captured?.onEvent(ev);
    captured?.onEvent(ev);
    const s = useMarketingLeads.getState();
    const matches = s.leads.filter((l) => l.id === "lead-fh-dup");
    expect(matches).toHaveLength(1);
  });

  it("transitioned event updates the matching lead's state in place", () => {
    let captured: MarketingStreamHandlers | undefined;
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      captured = h;
      return () => {};
    });
    useMarketingLeads.getState().startLive();
    captured?.onEvent({
      kind: "created",
      tenant_id: "default",
      lead_id: "lead-trans",
      thread_id: "th-trans",
      subject: "Going to engaged",
      from_email: "t@y.com",
      seller_id: "unassigned",
      state: "cold",
      at_ms: 0,
      why_routed: [],
    });
    captured?.onEvent({
      kind: "transitioned",
      tenant_id: "default",
      lead_id: "lead-trans",
      from: "cold",
      to: "engaged",
      at_ms: 1,
      reason: "manual",
    });
    const lead = useMarketingLeads
      .getState()
      .leads.find((l) => l.id === "lead-trans");
    expect(lead?.state).toBe("engaged");
  });

  it("lagged event records dropped count + triggers REST reconcile", async () => {
    let captured: MarketingStreamHandlers | undefined;
    listLeadsMock.mockResolvedValueOnce({ leads: [] });
    subscribeMock.mockImplementation((h: MarketingStreamHandlers) => {
      captured = h;
      return () => {};
    });
    useMarketingLeads.getState().startLive();
    captured?.onLagged?.(7);
    const s = useMarketingLeads.getState();
    expect(s.live_status).toBe("lagged");
    expect(s.lagged_dropped_total).toBe(7);
    // `fetch` was queued — let the microtask run.
    await Promise.resolve();
    expect(listLeadsMock).toHaveBeenCalled();
  });
});
