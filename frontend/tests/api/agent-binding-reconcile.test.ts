// Coverage for the M15.37 reconciliation loop:
//
// - Idempotent: agents already in desired state are skipped.
// - Adds new marketing bindings via agents/upsert.
// - Removes stale marketing bindings (seller unbound).
// - Preserves non-marketing bindings (whatsapp, telegram, …).
// - Per-agent failures captured in `failed[]`, never thrown.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn(),
}));

import { adminCall } from "../../src/api/admin";
import { reconcileAgentMarketingBindings } from "../../src/api/agents";

const adminCallMock = adminCall as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  adminCallMock.mockReset();
});

afterEach(() => {
  adminCallMock.mockReset();
});

/** Wires up the canonical 3-call sequence the reconciler uses
 *  per agent: list → get(a) → get(b) → … → optional upsert(s).
 *  Caller passes a sequence of `(method, response)` and the
 *  helper resolves them in order. */
function mockSequence(
  steps: Array<{ method: string; response: unknown }>,
): void {
  let i = 0;
  adminCallMock.mockImplementation((method: string, _params: unknown) => {
    const step = steps[i++];
    if (!step) {
      return Promise.reject(
        new Error(`unexpected adminCall: ${method} (step ${i})`),
      );
    }
    if (step.method !== method) {
      return Promise.reject(
        new Error(
          `expected ${step.method} at step ${i}, got ${method}`,
        ),
      );
    }
    return Promise.resolve(step.response);
  });
}

describe("reconcileAgentMarketingBindings", () => {
  it("upserts the marketing binding when the agent is missing it", async () => {
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 1,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [
            { plugin: "whatsapp", instance: "personal" },
          ],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "pedro-agent" },
      },
    ]);
    const r = await reconcileAgentMarketingBindings([
      { id: "pedro", agent_id: "pedro-agent" },
    ]);
    expect(r.synced).toEqual(["pedro-agent"]);
    expect(r.skipped).toEqual([]);
    expect(r.failed).toEqual([]);
    // Verify the upsert kept the whatsapp row + added marketing.
    const upsertCall = adminCallMock.mock.calls.find(
      ([m]) => m === "nexo/admin/agents/upsert",
    );
    expect(upsertCall).toBeDefined();
    const params = upsertCall?.[1] as {
      inbound_bindings: Array<{ plugin: string; instance?: string }>;
    };
    expect(params.inbound_bindings).toContainEqual({
      plugin: "whatsapp",
      instance: "personal",
    });
    expect(params.inbound_bindings).toContainEqual({
      plugin: "marketing",
      instance: "pedro",
    });
  });

  it("skips agents already in the desired state (idempotent)", async () => {
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 2,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [
            { plugin: "whatsapp", instance: "personal" },
            { plugin: "marketing", instance: "pedro" },
          ],
          system_prompt: "x",
        },
      },
    ]);
    const r = await reconcileAgentMarketingBindings([
      { id: "pedro", agent_id: "pedro-agent" },
    ]);
    expect(r.skipped).toEqual(["pedro-agent"]);
    expect(r.synced).toEqual([]);
    // No upsert call should have been issued.
    const upserts = adminCallMock.mock.calls.filter(
      ([m]) => m === "nexo/admin/agents/upsert",
    );
    expect(upserts).toHaveLength(0);
  });

  it("removes stale marketing bindings when seller unbinds", async () => {
    // Agent currently has a marketing binding to "pedro" but
    // the post-edit sellers list no longer references this
    // agent.
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 2,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [
            { plugin: "whatsapp", instance: "personal" },
            { plugin: "marketing", instance: "pedro" },
          ],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "pedro-agent" },
      },
    ]);
    // Empty sellers list → marketing binding for pedro
    // should be dropped.
    const r = await reconcileAgentMarketingBindings([]);
    expect(r.synced).toEqual(["pedro-agent"]);
    const upsertCall = adminCallMock.mock.calls.find(
      ([m]) => m === "nexo/admin/agents/upsert",
    );
    const params = upsertCall?.[1] as {
      inbound_bindings: Array<{ plugin: string; instance?: string }>;
    };
    // Marketing row gone, whatsapp preserved.
    expect(params.inbound_bindings).toEqual([
      { plugin: "whatsapp", instance: "personal" },
    ]);
  });

  it("captures per-agent upsert failures without throwing", async () => {
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 1,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [],
          system_prompt: "x",
        },
      },
      // Simulate a transient upsert failure.
      {
        method: "nexo/admin/agents/upsert",
        response: Promise.reject(new Error("daemon timeout")),
      },
    ]);
    const r = await reconcileAgentMarketingBindings([
      { id: "pedro", agent_id: "pedro-agent" },
    ]);
    expect(r.synced).toEqual([]);
    expect(r.failed).toHaveLength(1);
    expect(r.failed[0]).toMatchObject({
      agent_id: "pedro-agent",
      error: expect.stringContaining("daemon timeout"),
    });
  });

  it("returns synthetic failure when agents/list itself errors", async () => {
    adminCallMock.mockImplementationOnce(() =>
      Promise.reject(new Error("admin RPC unreachable")),
    );
    const r = await reconcileAgentMarketingBindings([
      { id: "pedro", agent_id: "pedro-agent" },
    ]);
    expect(r.synced).toEqual([]);
    expect(r.skipped).toEqual([]);
    expect(r.failed).toHaveLength(1);
    expect(r.failed[0].agent_id).toBe("(list)");
  });

  it("preserves non-marketing bindings when adding marketing rows", async () => {
    // Agent has whatsapp + telegram. Adding a marketing
    // binding must not touch them.
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "ana-agent",
              active: true,
              model_provider: "minimax",
              bindings_count: 2,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "ana-agent",
          active: true,
          model: { provider: "minimax", model: "MiniMax-M2.5" },
          allowed_tools: ["*"],
          inbound_bindings: [
            { plugin: "whatsapp", instance: "business" },
            { plugin: "telegram" },
          ],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "ana-agent" },
      },
    ]);
    await reconcileAgentMarketingBindings([
      { id: "ana", agent_id: "ana-agent" },
    ]);
    const upsertCall = adminCallMock.mock.calls.find(
      ([m]) => m === "nexo/admin/agents/upsert",
    );
    const params = upsertCall?.[1] as {
      inbound_bindings: Array<{ plugin: string; instance?: string }>;
    };
    expect(params.inbound_bindings).toContainEqual({
      plugin: "whatsapp",
      instance: "business",
    });
    expect(params.inbound_bindings).toContainEqual({
      plugin: "telegram",
    });
    expect(params.inbound_bindings).toContainEqual({
      plugin: "marketing",
      instance: "ana",
    });
  });

  // M15.52 / F6 — perf path coverage. When the caller passes
  // `previousSellers`, the reconciler skips agents outside
  // the (previous.agent_id ∪ next.agent_id) union.

  it("F6 fast path skips agents not in old∪new agent_id union", async () => {
    // Deployment with 3 agents. Operator only edits a seller
    // bound to pedro-agent. ana-agent + carla-agent stay
    // untouched in both old + new lists. The reconciler
    // should NOT call agents/get for them.
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 1,
            },
            {
              id: "ana-agent",
              active: true,
              model_provider: "minimax",
              bindings_count: 1,
            },
            {
              id: "carla-agent",
              active: true,
              model_provider: "openai",
              bindings_count: 1,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "pedro-agent" },
      },
    ]);
    const r = await reconcileAgentMarketingBindings(
      [{ id: "pedro", agent_id: "pedro-agent" }],
      [{ id: "pedro", agent_id: "pedro-agent" }],
    );
    expect(r.synced).toEqual(["pedro-agent"]);
    expect(r.failed).toEqual([]);
    // Only one agents/get call — ana + carla skipped because
    // neither appears in old ∪ new.
    const getCalls = adminCallMock.mock.calls.filter(
      ([m]) => m === "nexo/admin/agents/get",
    );
    expect(getCalls).toHaveLength(1);
    expect((getCalls[0]![1] as { agent_id: string }).agent_id).toBe(
      "pedro-agent",
    );
  });

  it("F6 fast path includes both old + new agent ids when binding moves", async () => {
    // Operator unbinds pedro-agent + binds ana-agent to the
    // same seller. Both must be processed.
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 1,
            },
            {
              id: "ana-agent",
              active: true,
              model_provider: "minimax",
              bindings_count: 0,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [
            { plugin: "marketing", instance: "pedro" },
          ],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "pedro-agent" },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "ana-agent",
          active: true,
          model: { provider: "minimax", model: "MiniMax-M2.5" },
          allowed_tools: ["*"],
          inbound_bindings: [],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/upsert",
        response: { id: "ana-agent" },
      },
    ]);
    const r = await reconcileAgentMarketingBindings(
      [{ id: "pedro", agent_id: "ana-agent" }],
      [{ id: "pedro", agent_id: "pedro-agent" }],
    );
    // Both upserts: pedro-agent loses the binding, ana-agent
    // gains it.
    expect(r.synced.sort()).toEqual(["ana-agent", "pedro-agent"]);
    expect(r.failed).toEqual([]);
  });

  it("F6 omitting previousSellers preserves walk-all behaviour", async () => {
    // Backwards-compat: callers that don't pass
    // previousSellers still walk every agent.
    mockSequence([
      {
        method: "nexo/admin/agents/list",
        response: {
          agents: [
            {
              id: "pedro-agent",
              active: true,
              model_provider: "anthropic",
              bindings_count: 0,
            },
            {
              id: "ana-agent",
              active: true,
              model_provider: "minimax",
              bindings_count: 0,
            },
          ],
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "pedro-agent",
          active: true,
          model: { provider: "anthropic", model: "claude-opus-4-7" },
          allowed_tools: ["*"],
          inbound_bindings: [],
          system_prompt: "x",
        },
      },
      {
        method: "nexo/admin/agents/get",
        response: {
          id: "ana-agent",
          active: true,
          model: { provider: "minimax", model: "MiniMax-M2.5" },
          allowed_tools: ["*"],
          inbound_bindings: [],
          system_prompt: "x",
        },
      },
    ]);
    // No bindings to add OR remove → both agents skipped.
    const r = await reconcileAgentMarketingBindings([]);
    expect(r.skipped.sort()).toEqual(["ana-agent", "pedro-agent"]);
    // Both gets ran (legacy walk-all).
    const getCalls = adminCallMock.mock.calls.filter(
      ([m]) => m === "nexo/admin/agents/get",
    );
    expect(getCalls).toHaveLength(2);
  });
});
