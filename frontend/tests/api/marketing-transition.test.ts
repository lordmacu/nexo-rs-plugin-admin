// Coverage for `transitionLead`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { transitionLead } from "../../src/api/marketing";
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

describe("transitionLead", () => {
  it("POSTs to /transition with target state", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          lead: { id: "l-1", state: "engaged" },
          from: "cold",
          to: "engaged",
          reason: "first reply",
        },
      }),
    );
    const out = await transitionLead("l-1", {
      to: "engaged",
      reason: "first reply",
    });
    expect(out.from).toBe("cold");
    expect(out.to).toBe("engaged");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/l-1/transition");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      to: "engaged",
      reason: "first reply",
    });
  });

  it("encodeURIComponents the lead id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { lead: {}, from: "cold", to: "lost", reason: "x" },
      }),
    );
    await transitionLead("lead 1/x", { to: "lost" });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead%201%2Fx/transition");
  });

  it("surfaces 422 illegal_transition as HttpError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        ok: false,
        error: {
          code: "illegal_transition",
          message: "lead state machine refuses cold → qualified",
        },
      }),
    );
    const err = await transitionLead("l-1", { to: "qualified" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(422);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "illegal_transition",
    );
  });

  it("surfaces 404 lead_not_found", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        ok: false,
        error: { code: "lead_not_found" },
      }),
    );
    const err = await transitionLead("ghost", { to: "engaged" }).catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).status).toBe(404);
  });
});
