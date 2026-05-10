// F20 — coverage for the `getEngagement` helper. The
// engagement endpoint renders flat (no `{ ok, result }`
// envelope) so this client deserialises a raw aggregate
// shape rather than going through the marketing
// `call()` helper.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getEngagement } from "../../src/api/marketing";
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

describe("getEngagement", () => {
  it("GETs the per-msg endpoint and returns the flat aggregate", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        msg_id: "m1",
        tenant_id: "acme",
        opens: 3,
        clicks_by_link: [
          { link_id: "L0", count: 2 },
          { link_id: "L1", count: 1 },
        ],
      }),
    );
    const out = await getEngagement("m1");
    expect(out.opens).toBe(3);
    expect(out.clicks_by_link).toHaveLength(2);
    expect(out.clicks_by_link[0]?.count).toBe(2);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/tracking/msg/m1/engagement");
  });

  it("encodeURIComponents the msg id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        msg_id: "m/1",
        tenant_id: "acme",
        opens: 0,
        clicks_by_link: [],
      }),
    );
    await getEngagement("m/1 abc");
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/tracking/msg/m%2F1%20abc/engagement");
  });

  it("returns the empty aggregate without throwing on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        msg_id: "m1",
        tenant_id: "acme",
        opens: 0,
        clicks_by_link: [],
      }),
    );
    const out = await getEngagement("m1");
    expect(out.opens).toBe(0);
    expect(out.clicks_by_link).toEqual([]);
  });

  it("throws HttpError on 404 tracking_disabled", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        error: { code: "tracking_disabled" },
      }),
    );
    const err = await getEngagement("m1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
  });

  it("throws HttpError on 500 store error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { error: { code: "store" } }),
    );
    const err = await getEngagement("m1").catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(500);
  });
});
