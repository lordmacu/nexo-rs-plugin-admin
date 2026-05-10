// F30 — `parseGuardrailCompileDetail` +
// `summarizeGuardrailCompileDetail` coverage. Pure helpers
// driving the SettingsGuardrails compile-error banner +
// rule highlight.

import { describe, expect, it } from "vitest";

import { HttpError } from "../../src/api/client";
import {
  parseGuardrailCompileDetail,
  summarizeGuardrailCompileDetail,
  type GuardrailCompileDetail,
} from "../../src/modules/marketing/SettingsView";

// ── parseGuardrailCompileDetail ──────────────────────────────────

describe("parseGuardrailCompileDetail", () => {
  it("returns null for non-HttpError input", () => {
    expect(parseGuardrailCompileDetail(new Error("boom"))).toBeNull();
    expect(parseGuardrailCompileDetail("string error")).toBeNull();
    expect(parseGuardrailCompileDetail(null)).toBeNull();
  });

  it("returns null when error code does not match", () => {
    const err = new HttpError(400, {
      code: "invalid_payload",
      message: "bad json",
    });
    expect(parseGuardrailCompileDetail(err)).toBeNull();
  });

  it("returns null when detail is missing", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      message: "unknown",
    });
    expect(parseGuardrailCompileDetail(err)).toBeNull();
  });

  it("returns null when detail.kind is unrecognised", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      message: "future variant",
      detail: { kind: "future_variant" },
    });
    expect(parseGuardrailCompileDetail(err)).toBeNull();
  });

  it("parses invalid_pattern detail with all fields", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      message: "regex bad",
      detail: {
        kind: "invalid_pattern",
        rule_id: "pricing",
        pattern_index: 2,
        regex_error: "regex parse error: ...",
      },
    });
    expect(parseGuardrailCompileDetail(err)).toEqual({
      kind: "invalid_pattern",
      rule_id: "pricing",
      pattern_index: 2,
      regex_error: "regex parse error: ...",
    });
  });

  it("parses duplicate_id detail", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      detail: { kind: "duplicate_id", rule_id: "dup" },
    });
    expect(parseGuardrailCompileDetail(err)).toEqual({
      kind: "duplicate_id",
      rule_id: "dup",
      pattern_index: null,
      regex_error: null,
    });
  });

  it("parses empty_rule detail", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      detail: { kind: "empty_rule", rule_id: "x" },
    });
    expect(parseGuardrailCompileDetail(err)).toEqual({
      kind: "empty_rule",
      rule_id: "x",
      pattern_index: null,
      regex_error: null,
    });
  });

  it("survives partial detail with non-string rule_id", () => {
    const err = new HttpError(400, {
      code: "guardrail_compile",
      detail: { kind: "invalid_pattern", rule_id: 42, pattern_index: 0 },
    });
    const out = parseGuardrailCompileDetail(err);
    expect(out?.kind).toBe("invalid_pattern");
    expect(out?.rule_id).toBeNull();
    expect(out?.pattern_index).toBe(0);
  });
});

// ── summarizeGuardrailCompileDetail ──────────────────────────────

describe("summarizeGuardrailCompileDetail", () => {
  it("renders invalid_pattern with rule + index + regex error", () => {
    const d: GuardrailCompileDetail = {
      kind: "invalid_pattern",
      rule_id: "pricing",
      pattern_index: 2,
      regex_error: "unclosed group",
    };
    const out = summarizeGuardrailCompileDetail(d);
    expect(out).toContain("pricing");
    expect(out).toContain("#2");
    expect(out).toContain("unclosed group");
  });

  it("falls back when invalid_pattern lacks rule_id", () => {
    const d: GuardrailCompileDetail = {
      kind: "invalid_pattern",
      rule_id: null,
      pattern_index: null,
      regex_error: null,
    };
    expect(summarizeGuardrailCompileDetail(d)).toBe(
      "Patrón regex inválido",
    );
  });

  it("renders duplicate_id with rule label", () => {
    const d: GuardrailCompileDetail = {
      kind: "duplicate_id",
      rule_id: "dup",
      pattern_index: null,
      regex_error: null,
    };
    expect(summarizeGuardrailCompileDetail(d)).toContain("dup");
    expect(summarizeGuardrailCompileDetail(d)).toContain("duplicada");
  });

  it("renders empty_rule with rule label", () => {
    const d: GuardrailCompileDetail = {
      kind: "empty_rule",
      rule_id: "x",
      pattern_index: null,
      regex_error: null,
    };
    expect(summarizeGuardrailCompileDetail(d)).toContain("x");
    expect(summarizeGuardrailCompileDetail(d)).toContain("patrones");
  });
});
