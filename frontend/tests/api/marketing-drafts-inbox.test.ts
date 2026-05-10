// Coverage for `listDraftsInbox` — the tenant-wide
// pending draft queue helper. Wire path / query string /
// envelope unwrap / typed HttpError on refusal.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listDraftsInbox } from "../../src/api/marketing";
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

describe("listDraftsInbox", () => {
  it("GETs /drafts without query when limit omitted", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { drafts: [], count: 0, limit: 50 },
      }),
    );
    const out = await listDraftsInbox();
    expect(out.count).toBe(0);
    expect(out.limit).toBe(50);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/drafts");
  });

  it("forwards limit via query string", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { drafts: [], count: 0, limit: 10 },
      }),
    );
    await listDraftsInbox({ limit: 10 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/drafts?limit=10");
  });

  it("returns the typed pending draft rows", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          drafts: [
            {
              lead_id: "l-1",
              message_id: "d-1",
              from_label: "AI",
              body: "Hola",
              at_ms: 100,
              lead_subject: "Cot",
              lead_seller_id: "pedro",
              lead_person_id: "juan@acme.com",
              lead_state: "engaged",
            },
          ],
          count: 1,
          limit: 50,
        },
      }),
    );
    const out = await listDraftsInbox();
    expect(out.drafts[0]?.lead_subject).toBe("Cot");
    expect(out.drafts[0]?.lead_seller_id).toBe("pedro");
  });

  it("throws HttpError on envelope refusal", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        ok: false,
        error: { code: "store_missing" },
      }),
    );
    const err = await listDraftsInbox().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "store_missing",
    );
  });
});
