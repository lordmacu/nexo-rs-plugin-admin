// M15.54 / F13 — coverage for `bindSellerToAgent` /
// `unbindSellerFromAgent`:
//
// - `bindSellerToAgent` patches the matching seller's `agent_id`
//   + leaves the rest untouched + runs the reconciler.
// - `unbindSellerFromAgent` strips `agent_id` +
//   `notification_settings` + `model_override` from the matching
//   seller + leaves the rest untouched + runs the reconciler.
// - Both bubble errors from the underlying `getSellers` /
//   `saveSellers` calls.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/marketing", () => ({
  getSellers: vi.fn(),
  saveSellers: vi.fn(),
}));

vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn().mockImplementation(async (method: string) => {
    if (method === "nexo/admin/agents/list") return { agents: [] };
    return {};
  }),
}));

import { getSellers, saveSellers } from "../../src/api/marketing";
import { bindSellerToAgent, unbindSellerFromAgent } from "../../src/api/agents";

const getSellersMock = getSellers as unknown as ReturnType<typeof vi.fn>;
const saveSellersMock = saveSellers as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getSellersMock.mockReset();
  saveSellersMock.mockReset();
});

afterEach(() => {
  getSellersMock.mockReset();
  saveSellersMock.mockReset();
});

describe("bindSellerToAgent", () => {
  it("patches agent_id on the matching seller and saves", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [
        { id: "pedro", outbound_email: "p@x.com" },
        { id: "ana", outbound_email: "a@x.com", agent_id: "ana-agent" },
      ],
    });
    saveSellersMock.mockResolvedValue({ sellers: [], count: 0 });

    await bindSellerToAgent("pedro", "pedro-agent");

    expect(saveSellersMock).toHaveBeenCalledTimes(1);
    const arg = saveSellersMock.mock.calls[0]![0] as Array<{
      id: string;
      agent_id?: string;
    }>;
    expect(arg).toHaveLength(2);
    expect(arg[0]).toMatchObject({ id: "pedro", agent_id: "pedro-agent" });
    expect(arg[1]).toMatchObject({ id: "ana", agent_id: "ana-agent" });
  });

  it("moves the binding when seller already has a different agent_id", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [
        { id: "pedro", agent_id: "old-agent", outbound_email: "p@x.com" },
      ],
    });
    saveSellersMock.mockResolvedValue({ sellers: [], count: 0 });

    await bindSellerToAgent("pedro", "new-agent");

    const arg = saveSellersMock.mock.calls[0]![0] as Array<{
      id: string;
      agent_id?: string;
    }>;
    expect(arg[0]).toMatchObject({ id: "pedro", agent_id: "new-agent" });
  });

  it("bubbles errors from saveSellers", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [{ id: "pedro" }],
    });
    saveSellersMock.mockRejectedValue(new Error("network"));

    await expect(bindSellerToAgent("pedro", "p-agent")).rejects.toThrow(
      "network",
    );
  });
});

describe("unbindSellerFromAgent", () => {
  it("strips agent_id + notification_settings + model_override", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [
        {
          id: "pedro",
          agent_id: "pedro-agent",
          notification_settings: { on_lead_created: true },
          model_override: { provider: "anthropic", model: "claude" },
          outbound_email: "p@x.com",
        },
        { id: "ana", agent_id: "ana-agent" },
      ],
    });
    saveSellersMock.mockResolvedValue({ sellers: [], count: 0 });

    await unbindSellerFromAgent("pedro");

    const arg = saveSellersMock.mock.calls[0]![0] as Array<
      Record<string, unknown>
    >;
    expect(arg[0]!.id).toBe("pedro");
    expect(arg[0]!.agent_id).toBeUndefined();
    expect(arg[0]!.notification_settings).toBeUndefined();
    expect(arg[0]!.model_override).toBeUndefined();
    // Untouched field preserved.
    expect(arg[0]!.outbound_email).toBe("p@x.com");
    // Other sellers untouched.
    expect(arg[1]).toMatchObject({ id: "ana", agent_id: "ana-agent" });
  });

  it("is a no-op (still saves) when seller_id matches none", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [{ id: "pedro", agent_id: "pedro-agent" }],
    });
    saveSellersMock.mockResolvedValue({ sellers: [], count: 0 });

    await unbindSellerFromAgent("ghost");

    const arg = saveSellersMock.mock.calls[0]![0] as Array<{
      id: string;
      agent_id?: string;
    }>;
    expect(arg[0]).toMatchObject({ id: "pedro", agent_id: "pedro-agent" });
  });

  it("bubbles errors from saveSellers", async () => {
    getSellersMock.mockResolvedValue({
      sellers: [{ id: "pedro", agent_id: "pedro-agent" }],
    });
    saveSellersMock.mockRejectedValue(new Error("save fail"));

    await expect(unbindSellerFromAgent("pedro")).rejects.toThrow("save fail");
  });
});
