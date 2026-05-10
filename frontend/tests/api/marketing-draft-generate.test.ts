// M15.21 slice 4 — coverage for the `generateDraft` helper.
// Mirrors the slice-3 draft-API tests: verify wire path /
// method / body shape, envelope unwrap, and `HttpError`
// surface for the typed error codes the lead drawer uses
// to render the inline alert.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateDraft } from "../../src/api/marketing";
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

describe("generateDraft", () => {
  it("POSTs an empty body when no operator_hint is provided", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        ok: true,
        result: {
          draft: {
            id: "draft-1",
            direction: "draft",
            from_label: "AI",
            body: "Hola Juan,",
            at_ms: 1,
            draft_status: "pending",
          },
        },
      }),
    );
    const out = await generateDraft("lead-1");
    expect(out.draft.id).toBe("draft-1");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/leads/lead-1/drafts/generate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({});
  });

  it("forwards operator_hint + from_label verbatim", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        ok: true,
        result: {
          draft: {
            id: "draft-1",
            direction: "draft",
            from_label: "Pedro auto",
            body: "...",
            at_ms: 1,
            draft_status: "pending",
          },
        },
      }),
    );
    await generateDraft("lead-1", {
      operator_hint: "Mencionar promo",
      from_label: "Pedro auto",
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({
      operator_hint: "Mencionar promo",
      from_label: "Pedro auto",
    });
  });

  it("encodeURIComponents the lead id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        ok: true,
        result: { draft: { id: "x", direction: "draft", from_label: "AI", body: "x", at_ms: 0, draft_status: "pending" } },
      }),
    );
    await generateDraft("lead 1/x");
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "/api/marketing/leads/lead%201%2Fx/drafts/generate",
    );
  });

  it("surfaces 503 draft_generator_disabled as HttpError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, {
        ok: false,
        error: { code: "draft_generator_disabled", message: "no gen" },
      }),
    );
    const err = await generateDraft("lead-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(503);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "draft_generator_disabled",
    );
  });

  it("surfaces 422 generator_empty_body as HttpError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        ok: false,
        error: { code: "generator_empty_body" },
      }),
    );
    const err = await generateDraft("lead-1").catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(422);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "generator_empty_body",
    );
  });

  it("surfaces 502 generator_unavailable for backend refusals", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, {
        ok: false,
        error: { code: "generator_unavailable", message: "agent timeout" },
      }),
    );
    const err = await generateDraft("lead-1").catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(502);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "generator_unavailable",
    );
  });
});
