// Phase 90 audit fix coverage — HttpError must surface the daemon's
// error string via `.message` so consumers (every store does
// `e instanceof Error ? e.message : String(e)`) see the real reason
// instead of the literal "HTTP 500". Examples that previously
// collapsed to a useless status string:
//   • "plugin handles not yet populated; daemon still booting"
//   • "restart timed out, plugin may be in degraded state"
//   • "snapshot {id} belongs to tenant `staging`, request specified `prod`"
//   • "encryption requested but no recipients configured"

import { describe, expect, it } from "vitest";

import { HttpError } from "../../src/api/client";

describe("HttpError", () => {
  it("uses string body verbatim as the message", () => {
    const e = new HttpError(
      500,
      "plugin handles not yet populated; daemon still booting",
    );
    expect(e.message).toBe(
      "plugin handles not yet populated; daemon still booting",
    );
    expect(e.status).toBe(500);
  });

  it("extracts `message` field from object body", () => {
    const e = new HttpError(400, {
      message: "encryption requested but no recipients configured",
    });
    expect(e.message).toBe(
      "encryption requested but no recipients configured",
    );
  });

  it("extracts `error` field when no `message`", () => {
    const e = new HttpError(404, { error: "snapshot xyz not found" });
    expect(e.message).toBe("snapshot xyz not found");
  });

  it("falls back to `HTTP <status>` for empty string body", () => {
    const e = new HttpError(503, "");
    expect(e.message).toBe("HTTP 503");
  });

  it("falls back to `HTTP <status>` for undefined body", () => {
    const e = new HttpError(502, undefined);
    expect(e.message).toBe("HTTP 502");
  });

  it("falls back to `HTTP <status>` for non-string `message` field", () => {
    const e = new HttpError(500, { message: 42, code: "x" });
    expect(e.message).toBe("HTTP 500");
  });

  it("preserves the raw body for callers that need it", () => {
    const body = { message: "hi", extra: 1 };
    const e = new HttpError(500, body);
    expect(e.body).toBe(body);
  });

  it("is an `instanceof Error`", () => {
    const e = new HttpError(500, "x");
    expect(e instanceof Error).toBe(true);
  });
});
