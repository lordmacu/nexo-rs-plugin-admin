// M15.21.b — coverage for `getPerson` + `confirmEnrichment`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmEnrichment,
  getPerson,
} from "../../src/api/marketing";
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

const personFixture = {
  id: "juan",
  tenant_id: "acme",
  primary_name: "Juan G",
  primary_email: "juan@acme.com",
  alt_emails: [],
  company_id: null,
  enrichment_status: "signature_parsed" as const,
  enrichment_confidence: 0.62,
  tags: [],
  created_at_ms: 1,
  last_seen_at_ms: 1,
};

describe("getPerson", () => {
  it("GETs the person + company envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { person: personFixture, company: null },
      }),
    );
    const out = await getPerson("juan");
    expect(out.person.id).toBe("juan");
    expect(out.company).toBeNull();
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/persons/juan");
  });

  it("encodeURIComponents the id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { person: personFixture, company: null },
      }),
    );
    await getPerson("juan/x y");
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/persons/juan%2Fx%20y");
  });

  it("throws HttpError on 404 person_not_found", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, {
        ok: false,
        error: { code: "person_not_found" },
      }),
    );
    const err = await getPerson("ghost").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "person_not_found",
    );
  });
});

describe("confirmEnrichment", () => {
  it("POSTs empty body when no overrides", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          person: { ...personFixture, enrichment_status: "manual", enrichment_confidence: 1.0 },
          company: null,
        },
      }),
    );
    const out = await confirmEnrichment("juan");
    expect(out.person.enrichment_status).toBe("manual");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/persons/juan/confirm-enrichment");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({});
  });

  it("forwards primary_name + company_name + company_domain", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: { person: personFixture, company: null },
      }),
    );
    await confirmEnrichment("juan", {
      primary_name: "Juan García",
      company_name: "Acme Corp",
      company_domain: "acme.com",
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({
      primary_name: "Juan García",
      company_name: "Acme Corp",
      company_domain: "acme.com",
    });
  });

  it("surfaces 503 companies_not_loaded", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, {
        ok: false,
        error: { code: "companies_not_loaded" },
      }),
    );
    const err = await confirmEnrichment("juan", {
      company_name: "X",
    }).catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(503);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "companies_not_loaded",
    );
  });
});
