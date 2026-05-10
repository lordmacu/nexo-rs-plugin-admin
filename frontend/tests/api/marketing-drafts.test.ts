// M15.21 slice 3 — coverage for the draft API helpers in
// `src/api/marketing.ts`. Verifies wire path/method, body
// serialisation, envelope unwrap, and `HttpError` surface
// when the server returns a typed error code (so the lead
// drawer can render an actionable banner).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveDraft,
  createDraft,
  deleteDraft,
  listDrafts,
  rejectDraft,
  updateDraft,
} from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

// `authedFetch` is the network seam — stub it per test.
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  fetchMock.mockReset();
});

/** Build a minimal Response polyfill for the JSON envelope
 *  the marketing helpers expect. `ok` defaults to `status < 400`
 *  to mirror the real `fetch` behaviour. */
function jsonResponse(status: number, body: unknown): Response {
  const res = {
    ok: status >= 200 && status < 400,
    status,
    json: () => Promise.resolve(body),
  };
  return res as unknown as Response;
}

describe("listDrafts", () => {
  it("GETs /leads/:id/drafts without status filter", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { lead_id: "lead-1", drafts: [], count: 0 },
      }),
    );
    const out = await listDrafts("lead 1");
    expect(out.count).toBe(0);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead%201/drafts");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("appends ?status=pending when filter passed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { lead_id: "lead-1", drafts: [], count: 0 },
      }),
    );
    await listDrafts("lead-1", { status: "pending" });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts?status=pending");
  });

  it("throws HttpError with body code on envelope error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        ok: false,
        error: { code: "lead_not_found", message: "no lead" },
      }),
    );
    let caught: unknown;
    try {
      await listDrafts("ghost");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(HttpError);
    const err = caught as HttpError;
    expect(err.status).toBe(404);
    expect((err.body as { code: string }).code).toBe("lead_not_found");
  });
});

describe("createDraft", () => {
  it("POSTs JSON body and returns the canonical draft row", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        ok: true,
        result: {
          draft: {
            id: "draft-abc",
            direction: "draft",
            from_label: "AI",
            body: "Hola",
            at_ms: 1,
            draft_status: "pending",
          },
        },
      }),
    );
    const out = await createDraft("lead-1", { body: "Hola" });
    expect(out.draft.id).toBe("draft-abc");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ body: "Hola" });
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.["Content-Type"] ?? (init?.headers as Headers).get?.("Content-Type"))
      .toBeTruthy();
  });
});

describe("updateDraft", () => {
  it("PUTs the new body keyed by draft id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { draft_id: "draft-abc" },
      }),
    );
    const out = await updateDraft("lead-1", "draft abc", "edit");
    expect(out.draft_id).toBe("draft-abc");
    const [url, init] = fetchMock.mock.calls[0]!;
    // Both lead id and message id pass through encodeURIComponent.
    expect(url).toBe("/api/marketing/leads/lead-1/drafts/draft%20abc");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({ body: "edit" });
  });

  it("returns HttpError 409 with code draft_locked when server refuses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        ok: false,
        error: { code: "draft_locked" },
      }),
    );
    const err = await updateDraft("lead-1", "draft-1", "x").catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(409);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "draft_locked",
    );
  });
});

describe("rejectDraft", () => {
  it("POSTs to /reject and returns rejected status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { draft_id: "draft-abc", status: "rejected" },
      }),
    );
    const out = await rejectDraft("lead-1", "draft-abc");
    expect(out.status).toBe("rejected");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts/draft-abc/reject");
    expect(init?.method).toBe("POST");
  });
});

describe("approveDraft", () => {
  it("POSTs to /approve and returns broker topic + msg ids", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          draft_id: "draft-abc",
          status: "approved",
          topic: "plugin.outbound.email.acme",
          outbound_message_id: "out-1",
          tracking_msg_id: "trk-9",
        },
      }),
    );
    const out = await approveDraft("lead-1", "draft-abc");
    expect(out.topic).toBe("plugin.outbound.email.acme");
    expect(out.outbound_message_id).toBe("out-1");
    expect(out.tracking_msg_id).toBe("trk-9");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts/draft-abc/approve");
    expect(init?.method).toBe("POST");
  });

  it("surfaces typed compliance block as HttpError 412", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(412, {
        ok: false,
        error: { code: "compliance_blocked", message: "anti-loop" },
      }),
    );
    const err = await approveDraft("lead-1", "draft-abc").catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).status).toBe(412);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "compliance_blocked",
    );
  });
});

describe("deleteDraft", () => {
  it("DELETEs and returns the deleted flag", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { draft_id: "draft-abc", deleted: true },
      }),
    );
    const out = await deleteDraft("lead-1", "draft-abc");
    expect(out.deleted).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts/draft-abc");
    expect(init?.method).toBe("DELETE");
  });
});
