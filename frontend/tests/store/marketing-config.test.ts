// Coverage for the read-only config store:
//
// - per-slice fetch flips source api / mock / error correctly;
// - empty list from API stays as 'mock' so the tab keeps its
//   demo fixture banner (rather than a blank screen);
// - error path captures the message + falls back to empty data;
// - fetchAll triggers all four slice fetches in parallel.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M15.37 — saveSellers triggers a reconciliation pass over
// agents admin RPC. Mock adminCall so the reconciler returns
// an empty list cleanly + every test gets a deterministic
// outcome.
vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn().mockImplementation(async (method: string) => {
    if (method === "nexo/admin/agents/list") return { agents: [] };
    return {};
  }),
}));

import { adminCall } from "../../src/api/admin";
const adminCallMock = adminCall as unknown as ReturnType<typeof vi.fn>;

vi.mock("../../src/api/marketing", () => ({
  getMailboxes: vi.fn(),
  getSellers: vi.fn(),
  getRules: vi.fn(),
  getFollowupProfiles: vi.fn(),
  saveMailboxes: vi.fn(),
  saveSellers: vi.fn(),
  saveRules: vi.fn(),
  saveFollowupProfiles: vi.fn(),
}));

import {
  getFollowupProfiles,
  getMailboxes,
  getRules,
  getSellers,
  saveFollowupProfiles,
  saveMailboxes,
  saveRules,
  saveSellers,
} from "../../src/api/marketing";
import { useMarketingConfig } from "../../src/store/marketingConfig";

const mailboxesMock = getMailboxes as unknown as ReturnType<typeof vi.fn>;
const sellersMock = getSellers as unknown as ReturnType<typeof vi.fn>;
const rulesMock = getRules as unknown as ReturnType<typeof vi.fn>;
const followupsMock = getFollowupProfiles as unknown as ReturnType<typeof vi.fn>;
const saveMailboxesMock = saveMailboxes as unknown as ReturnType<typeof vi.fn>;
const saveSellersMock = saveSellers as unknown as ReturnType<typeof vi.fn>;
const saveRulesMock = saveRules as unknown as ReturnType<typeof vi.fn>;
const saveFollowupProfilesMock = saveFollowupProfiles as unknown as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  // Reset zustand store to defaults via setState so we don't
  // need an explicit reset action on the store.
  useMarketingConfig.setState({
    mailboxes: { data: [], source: "mock", error: null },
    sellers: { data: [], source: "mock", error: null },
    followups: { data: [], source: "mock", error: null },
    rules: { data: null, source: "mock", error: null },
  });
  mailboxesMock.mockReset();
  sellersMock.mockReset();
  rulesMock.mockReset();
  followupsMock.mockReset();
  saveMailboxesMock.mockReset();
  saveSellersMock.mockReset();
  saveRulesMock.mockReset();
  saveFollowupProfilesMock.mockReset();
});

afterEach(() => {
  mailboxesMock.mockReset();
  sellersMock.mockReset();
  rulesMock.mockReset();
  followupsMock.mockReset();
  saveMailboxesMock.mockReset();
  saveSellersMock.mockReset();
  saveRulesMock.mockReset();
  saveFollowupProfilesMock.mockReset();
});

describe("marketing config store — per-slice fetch", () => {
  it("flips mailboxes source to 'api' when API returns rows", async () => {
    mailboxesMock.mockResolvedValueOnce({
      mailboxes: [{ id: "mb-1", address: "a@b", provider: "gmail" }],
      count: 1,
    });
    await useMarketingConfig.getState().fetchMailboxes();
    const s = useMarketingConfig.getState().mailboxes;
    expect(s.source).toBe("api");
    expect(s.data).toHaveLength(1);
    expect(s.error).toBeNull();
  });

  it("keeps mailboxes source as 'mock' when API returns empty list", async () => {
    mailboxesMock.mockResolvedValueOnce({ mailboxes: [], count: 0 });
    await useMarketingConfig.getState().fetchMailboxes();
    const s = useMarketingConfig.getState().mailboxes;
    expect(s.source).toBe("mock");
    expect(s.data).toEqual([]);
  });

  it("captures error message on network failure", async () => {
    mailboxesMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await useMarketingConfig.getState().fetchMailboxes();
    const s = useMarketingConfig.getState().mailboxes;
    expect(s.source).toBe("error");
    expect(s.error).toContain("ECONNREFUSED");
  });

  it("rules source flips to 'api' only when at least one rule is present", async () => {
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [{ id: "r1" }], default_target: { kind: "drop" } },
    });
    await useMarketingConfig.getState().fetchRules();
    expect(useMarketingConfig.getState().rules.source).toBe("api");
  });

  it("rules source stays 'mock' when rule_set has zero rules", async () => {
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
    });
    await useMarketingConfig.getState().fetchRules();
    expect(useMarketingConfig.getState().rules.source).toBe("mock");
  });
});

describe("marketing config store — fetchAll", () => {
  it("triggers all four slice fetches", async () => {
    mailboxesMock.mockResolvedValueOnce({ mailboxes: [], count: 0 });
    sellersMock.mockResolvedValueOnce({ sellers: [], count: 0 });
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
    });
    followupsMock.mockResolvedValueOnce({ profiles: [], count: 0 });
    await useMarketingConfig.getState().fetchAll();
    expect(mailboxesMock).toHaveBeenCalledTimes(1);
    expect(sellersMock).toHaveBeenCalledTimes(1);
    expect(rulesMock).toHaveBeenCalledTimes(1);
    expect(followupsMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't crash when one slice fails — others still hydrate", async () => {
    mailboxesMock.mockRejectedValueOnce(new Error("boom"));
    sellersMock.mockResolvedValueOnce({
      sellers: [{ id: "v1", name: "V", primary_email: "v@v" }],
      count: 1,
    });
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
    });
    followupsMock.mockResolvedValueOnce({ profiles: [], count: 0 });
    await useMarketingConfig.getState().fetchAll();
    const s = useMarketingConfig.getState();
    expect(s.mailboxes.source).toBe("error");
    expect(s.sellers.source).toBe("api");
    expect(s.sellers.data).toHaveLength(1);
  });
});

describe("marketing config store — save actions", () => {
  it("saveSellers returns ok and re-fetches on success", async () => {
    saveSellersMock.mockResolvedValueOnce({
      sellers: [{ id: "v1", name: "V", primary_email: "v@v" }],
      count: 1,
    });
    sellersMock.mockResolvedValueOnce({
      sellers: [{ id: "v1", name: "V", primary_email: "v@v" }],
      count: 1,
    });
    const out = await useMarketingConfig
      .getState()
      .saveSellers([{ id: "v1", name: "V", primary_email: "v@v" }]);
    expect(out.kind).toBe("ok");
    expect(saveSellersMock).toHaveBeenCalledTimes(1);
    expect(sellersMock).toHaveBeenCalledTimes(1);
    expect(useMarketingConfig.getState().sellers.source).toBe("api");
  });

  it("saveMailboxes propagates server validation error", async () => {
    saveMailboxesMock.mockRejectedValueOnce(
      new Error("invalid_payload: 'mode' missing"),
    );
    const out = await useMarketingConfig.getState().saveMailboxes([]);
    expect(out.kind).toBe("error");
    if (out.kind === "error") {
      expect(out.message).toContain("invalid_payload");
    }
  });

  it("saveRules with restart_required=false maps to ok", async () => {
    saveRulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
      reloaded: true,
      restart_required: false,
    });
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
    });
    const out = await useMarketingConfig.getState().saveRules({
      rules: [],
    } as unknown as Parameters<
      ReturnType<typeof useMarketingConfig.getState>["saveRules"]
    >[0]);
    expect(out.kind).toBe("ok");
  });

  it("saveRules with restart_required=true maps to ok_restart_required", async () => {
    saveRulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
      reloaded: false,
      restart_required: true,
    });
    rulesMock.mockResolvedValueOnce({
      rule_set: { rules: [], default_target: { kind: "drop" } },
    });
    const out = await useMarketingConfig.getState().saveRules({
      rules: [],
    } as unknown as Parameters<
      ReturnType<typeof useMarketingConfig.getState>["saveRules"]
    >[0]);
    expect(out.kind).toBe("ok_restart_required");
    if (out.kind === "ok_restart_required") {
      expect(out.note).toContain("Reinicia");
    }
  });

  it("saveSellers returns ok_with_partial_warning when reconcile fails", async () => {
    saveSellersMock.mockResolvedValueOnce({
      sellers: [{ id: "v1", name: "V", primary_email: "v@v", agent_id: "a1" }],
      count: 1,
    });
    sellersMock.mockResolvedValueOnce({
      sellers: [{ id: "v1", name: "V", primary_email: "v@v", agent_id: "a1" }],
      count: 1,
    });
    // Override adminCall: list returns 1 agent, get returns
    // detail with empty bindings, upsert fails. Reconciler
    // captures the failure → store yields partial-warning.
    adminCallMock.mockImplementationOnce(async () => ({
      agents: [
        {
          id: "a1",
          active: true,
          model_provider: "anthropic",
          bindings_count: 0,
        },
      ],
    }));
    adminCallMock.mockImplementationOnce(async () => ({
      id: "a1",
      active: true,
      model: { provider: "anthropic", model: "claude-opus-4-7" },
      allowed_tools: ["*"],
      inbound_bindings: [],
      system_prompt: "x",
    }));
    adminCallMock.mockImplementationOnce(async () => {
      throw new Error("daemon down");
    });
    const out = await useMarketingConfig
      .getState()
      .saveSellers([
        {
          id: "v1",
          name: "V",
          primary_email: "v@v",
          agent_id: "a1",
        } as never,
      ]);
    expect(out.kind).toBe("ok_with_partial_warning");
    if (out.kind === "ok_with_partial_warning") {
      expect(out.note).toContain("a1");
      expect(out.note).toContain("daemon down");
    }
  });

  it("saveFollowups round-trips through fetchFollowups", async () => {
    saveFollowupProfilesMock.mockResolvedValueOnce({
      profiles: [{ id: "default", cadence: ["1d"], max_attempts: 1 }],
      count: 1,
    });
    followupsMock.mockResolvedValueOnce({
      profiles: [{ id: "default", cadence: ["1d"], max_attempts: 1 }],
      count: 1,
    });
    const out = await useMarketingConfig
      .getState()
      .saveFollowups([
        { id: "default", cadence: ["1d"], max_attempts: 1 },
      ]);
    expect(out.kind).toBe("ok");
    expect(useMarketingConfig.getState().followups.source).toBe("api");
  });
});
