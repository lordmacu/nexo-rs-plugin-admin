// Phase 99.7 — tests for the runtime plugin-contributions store.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../src/api/client";

const adminCall = vi.fn();
const subscribeStream = vi.fn();

vi.mock("../../src/api/admin", () => ({
  adminCall: (...a: unknown[]) => adminCall(...a),
}));
vi.mock("../../src/api/firehose", () => ({
  subscribeStream: (...a: unknown[]) => subscribeStream(...a),
}));

import { usePluginContributions } from "../../src/store/pluginContributions";

const sampleList = {
  plugins: [
    {
      id: "google",
      name: "Google",
      trust_tier: "official",
      contributions: [],
      screens: [],
      hidden_count: 0,
    },
  ],
  etag: "abc",
};

beforeEach(() => {
  adminCall.mockReset();
  subscribeStream.mockReset();
  usePluginContributions.setState({
    entries: [],
    etag: "",
    status: "idle",
    error: null,
  });
});

describe("usePluginContributions", () => {
  it("fetch populates entries + etag + ready", async () => {
    adminCall.mockResolvedValueOnce(sampleList);
    await usePluginContributions.getState().fetch();
    const s = usePluginContributions.getState();
    expect(s.status).toBe("ready");
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].id).toBe("google");
    expect(s.etag).toBe("abc");
    expect(adminCall).toHaveBeenCalledWith("nexo/admin/plugin_ui/list");
  });

  it("capability denial degrades to empty `denied`", async () => {
    adminCall.mockRejectedValueOnce(
      new HttpError(403, { code: "capability_not_granted" }),
    );
    await usePluginContributions.getState().fetch();
    const s = usePluginContributions.getState();
    expect(s.status).toBe("denied");
    expect(s.entries).toHaveLength(0);
    expect(s.error).toBeNull();
  });

  it("other error surfaces as `error`", async () => {
    adminCall.mockRejectedValueOnce(new Error("boom"));
    await usePluginContributions.getState().fetch();
    const s = usePluginContributions.getState();
    expect(s.status).toBe("error");
    expect(s.error).toContain("boom");
  });

  it("handleEvent re-fetches on plugin_ui_changed", async () => {
    adminCall.mockResolvedValue(sampleList);
    usePluginContributions.getState().handleEvent({
      kind: "plugin_ui_changed",
      event_kind: "installed",
      plugin_id: "google",
      admin_ui_present: true,
      trust_tier: "official",
      at_ms: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // microtask flush
    await Promise.resolve();
    await Promise.resolve();
    expect(adminCall).toHaveBeenCalledWith("nexo/admin/plugin_ui/list");
  });

  it("handleEvent ignores unrelated kinds", () => {
    usePluginContributions.getState().handleEvent({
      kind: "peer_typing",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(adminCall).not.toHaveBeenCalled();
  });

  it("subscribe fetches + returns unsubscribe", () => {
    adminCall.mockResolvedValue(sampleList);
    const unsub = vi.fn();
    subscribeStream.mockReturnValueOnce(unsub);
    const off = usePluginContributions.getState().subscribe();
    expect(adminCall).toHaveBeenCalled();
    expect(subscribeStream).toHaveBeenCalled();
    off();
    expect(unsub).toHaveBeenCalled();
  });
});
