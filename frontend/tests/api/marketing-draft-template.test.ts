// Coverage for `getDraftTemplate` + `saveDraftTemplate`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDraftTemplate,
  previewDraftTemplate,
  saveDraftTemplate,
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

describe("getDraftTemplate", () => {
  it("GETs /config/draft_template and returns the typed config", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          template: "Hola {{lead.subject}}",
          source: "tenant",
          default_template: "DEFAULT BODY",
        },
      }),
    );
    const out = await getDraftTemplate();
    expect(out.template).toBe("Hola {{lead.subject}}");
    expect(out.source).toBe("tenant");
    expect(out.default_template).toBe("DEFAULT BODY");
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/config/draft_template");
  });

  it("throws HttpError on 503 disabled", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, {
        ok: false,
        error: { code: "draft_template_disabled" },
      }),
    );
    const err = await getDraftTemplate().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "draft_template_disabled",
    );
  });
});

describe("saveDraftTemplate", () => {
  it("PUTs the template body and returns the result", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          template: "Hola {{seller.name}}",
          source: "tenant",
          reloaded: true,
        },
      }),
    );
    const out = await saveDraftTemplate("Hola {{seller.name}}");
    expect(out.reloaded).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/config/draft_template");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({
      template: "Hola {{seller.name}}",
    });
  });

  it("surfaces 400 invalid_template as HttpError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        ok: false,
        error: { code: "invalid_template", message: "parse error" },
      }),
    );
    const err = await saveDraftTemplate("{{#if x}}").catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).status).toBe(400);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "invalid_template",
    );
  });

  it("surfaces 400 empty_template", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        ok: false,
        error: { code: "empty_template" },
      }),
    );
    const err = await saveDraftTemplate("   ").catch((e: unknown) => e);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "empty_template",
    );
  });
});

describe("previewDraftTemplate", () => {
  it("POSTs the template body and returns the rendered text", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          rendered: "Hola Seller Preview — Subject preview",
          fixture_summary: "lead.subject=Subject preview",
        },
      }),
    );
    const out = await previewDraftTemplate({
      template: "Hola {{seller.name}} — {{lead.subject}}",
    });
    expect(out.rendered).toContain("Seller Preview");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/marketing/config/draft_template/preview");
    expect(init?.method).toBe("POST");
  });

  it("forwards operator_hint when provided", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        result: {
          rendered: "Hint: Mencionar promo",
          fixture_summary: "...",
        },
      }),
    );
    await previewDraftTemplate({
      template: "Hint: {{operator_hint}}",
      operator_hint: "Mencionar promo",
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({
      template: "Hint: {{operator_hint}}",
      operator_hint: "Mencionar promo",
    });
  });

  it("surfaces 400 invalid_template as HttpError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        ok: false,
        error: { code: "invalid_template", message: "parse error" },
      }),
    );
    const err = await previewDraftTemplate({
      template: "{{#if bad",
    }).catch((e: unknown) => e);
    expect(((err as HttpError).body as { code: string }).code).toBe(
      "invalid_template",
    );
  });
});
