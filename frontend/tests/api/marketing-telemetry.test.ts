// M15.24 — coverage for `getTelemetry`. Mirrors the
// existing draft-API test pattern: stub fetch, assert
// wire path / query string / envelope unwrap / typed
// HttpError on refusal.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTelemetry } from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(status: number, body: unknown): Response {
  const res = {
    ok: status >= 200 && status < 400,
    status,
    json: () => Promise.resolve(body),
  };
  return res as unknown as Response;
}

const fixture = {
  tenant_id: "acme",
  now_ms: 1_700_000_000_000,
  window_hours: 24,
  since_ms: 1_699_913_600_000,
  leads_by_state: {
    cold: 2,
    engaged: 1,
    meeting_scheduled: 0,
    qualified: 0,
    lost: 0,
  },
  drafts_pending: 2,
  inbound_messages: 1,
  outbound_messages: 1,
};

describe("getTelemetry", () => {
  it("GETs /telemetry without query when window omitted", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, result: fixture }),
    );
    const out = await getTelemetry();
    expect(out.drafts_pending).toBe(2);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/telemetry");
  });

  it("forwards window_hours via query string", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, result: { ...fixture, window_hours: 168 } }),
    );
    await getTelemetry({ window_hours: 168 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/telemetry?window_hours=168");
  });

  it("returns the typed snapshot", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, result: fixture }),
    );
    const out = await getTelemetry();
    expect(out.leads_by_state.cold).toBe(2);
    expect(out.leads_by_state.engaged).toBe(1);
    expect(out.tenant_id).toBe("acme");
  });

  it("throws HttpError on envelope refusal", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        ok: false,
        error: { code: "store_missing" },
      }),
    );
    const err = await getTelemetry().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "store_missing",
    );
  });
});
