// Coverage for the tenant-switch cache reset wiring.
//
// Each marketing store subscribes to `useTenantStore` and
// wipes its in-memory state when `activeTenantId` flips.
// Verifies persons / leads / config slices reset together
// so empresa A's data never bleeds into empresa B's UI
// after a tenant switch.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/marketing", () => ({
  getPerson: vi.fn(),
  listLeads: vi.fn(),
  subscribeMarketingStream: vi.fn(),
  getMailboxes: vi.fn(),
  getSellers: vi.fn(),
  getRules: vi.fn(),
  getFollowupProfiles: vi.fn(),
  saveMailboxes: vi.fn(),
  saveSellers: vi.fn(),
  saveRules: vi.fn(),
  saveFollowupProfiles: vi.fn(),
}));
vi.mock("../../src/api/agents", () => ({
  reconcileAgentMarketingBindings: vi.fn(),
}));

import { useMarketingConfig } from "../../src/store/marketingConfig";
import { useMarketingLeads } from "../../src/store/marketingLeads";
import { useMarketingPersons } from "../../src/store/marketingPersons";
import { useTenantStore } from "../../src/store/tenant";

beforeEach(() => {
  // Pretend the store hydrated with tenant A.
  useTenantStore.setState({ activeTenantId: "acme" });
  // Seed each marketing store with non-empty state.
  useMarketingPersons.setState({
    byId: {
      "p-1": {
        status: "ok",
        person: {
          id: "p-1",
          tenant_id: "acme",
          primary_name: "Juan",
          primary_email: "juan@acme.com",
          alt_emails: [],
          company_id: null,
          enrichment_status: "manual",
          enrichment_confidence: 1,
          tags: [],
          created_at_ms: 1,
          last_seen_at_ms: 1,
        },
        company: null,
        fetched_at_ms: 100,
      },
    },
  });
  useMarketingLeads.setState({
    leads: [
      {
        id: "lead-1",
        tenant_id: "acme",
        thread_id: "th-1",
        subject: "x",
        person_id: "p-1",
        seller_id: "v-1",
        state: "engaged",
        score: 50,
        sentiment: "neutral",
        intent: "browsing",
        topic_tags: [],
        last_activity_ms: 1,
        next_check_at_ms: null,
        followup_attempts: 0,
        why_routed: [],
      },
    ],
    source: "api",
    error: null,
    last_synced_at_ms: 100,
    live_status: "open",
    lagged_dropped_total: 0,
  });
  useMarketingConfig.setState({
    mailboxes: {
      data: [{ id: "mb-1", address: "ventas@acme.com", provider: "imap" }],
      source: "api",
      error: null,
    },
  });
});

afterEach(() => {
  // Restore tenant store + clear marketing stores so cross-
  // suite leakage doesn't break unrelated specs.
  useTenantStore.setState({ activeTenantId: null });
});

describe("tenant cache reset", () => {
  it("clears useMarketingPersons.byId on tenant switch", () => {
    expect(Object.keys(useMarketingPersons.getState().byId)).toHaveLength(1);
    useTenantStore.setState({ activeTenantId: "globex" });
    expect(useMarketingPersons.getState().byId).toEqual({});
  });

  it("clears useMarketingLeads on tenant switch", () => {
    expect(useMarketingLeads.getState().leads).toHaveLength(1);
    useTenantStore.setState({ activeTenantId: "globex" });
    const s = useMarketingLeads.getState();
    expect(s.leads).toHaveLength(0);
    expect(s.source).toBe("loading");
    expect(s.last_synced_at_ms).toBeNull();
  });

  it("clears useMarketingConfig slices on tenant switch", () => {
    expect(useMarketingConfig.getState().mailboxes.data).toHaveLength(1);
    useTenantStore.setState({ activeTenantId: "globex" });
    const s = useMarketingConfig.getState();
    expect(s.mailboxes.data).toHaveLength(0);
    expect(s.sellers.data).toHaveLength(0);
    expect(s.followups.data).toHaveLength(0);
    expect(s.rules.data).toBeNull();
  });

  it("does not reset when activeTenantId stays the same", () => {
    useTenantStore.setState({
      activeTenantId: "acme",
      tenants: [{ tenant_id: "acme", active: true }],
    });
    // tenants list bumped but activeTenantId unchanged ⇒ no reset
    expect(useMarketingLeads.getState().leads).toHaveLength(1);
    expect(useMarketingPersons.getState().byId["p-1"]).toBeDefined();
  });

  it("resets even when tenant goes from set to null (logout)", () => {
    useTenantStore.setState({ activeTenantId: null });
    expect(useMarketingPersons.getState().byId).toEqual({});
    expect(useMarketingLeads.getState().leads).toHaveLength(0);
  });
});
