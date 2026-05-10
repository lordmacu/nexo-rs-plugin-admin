// M15.23.e — `collapseAudit` helper coverage.
//
// The helper takes a list of `duplicate_person_detected`
// audit rows the marketing extension recorded for one
// lead and produces per-candidate prompt entries the lead-
// drawer banner renders. Pure logic — no DOM / network.

import { describe, expect, it } from "vitest";

import {
  collapseAudit,
  type PromptCandidate,
} from "../../src/modules/marketing/components/DuplicateMergePrompt";
import type { MarketingAuditEvent } from "../../src/api/marketing";

function dup(
  candidate: string,
  signal: string,
  confidence: number,
  at_ms: number,
  detail = "matched",
): MarketingAuditEvent {
  return {
    kind: "duplicate_person_detected",
    tenant_id: "acme",
    lead_id: "l1",
    candidate_person_id: candidate,
    resolved_person_id: "resolved-1",
    signal,
    confidence,
    detail,
    at_ms,
  };
}

describe("collapseAudit", () => {
  it("returns empty when no duplicate events present", () => {
    const out = collapseAudit([]);
    expect(out).toEqual([]);
  });

  it("filters non-duplicate audit kinds", () => {
    const out = collapseAudit([
      {
        kind: "lead_transitioned",
        tenant_id: "acme",
        lead_id: "l1",
        from: "engaged",
        to: "qualified",
        reason: "demo",
        at_ms: 1,
      },
    ]);
    expect(out).toEqual([]);
  });

  it("collapses multiple signals on same candidate", () => {
    const rows = [
      dup("juan", "email_match", 1.0, 10),
      dup("juan", "phone_match", 1.0, 11),
    ];
    const out = collapseAudit(rows);
    expect(out).toHaveLength(1);
    expect(out[0]!.candidate_person_id).toBe("juan");
    expect(out[0]!.signals).toEqual(["email_match", "phone_match"]);
    expect(out[0]!.best_confidence).toBe(1.0);
  });

  it("uses detail from highest-confidence row", () => {
    const rows = [
      dup("juan", "name_company_fuzzy", 0.45, 10, "weak match"),
      dup("juan", "email_match", 1.0, 11, "strong match"),
    ];
    const out = collapseAudit(rows);
    expect(out[0]!.detail).toBe("strong match");
  });

  it("dedupes identical signal across multiple rows", () => {
    const rows = [
      dup("juan", "email_match", 1.0, 10),
      dup("juan", "email_match", 1.0, 11),
    ];
    const out = collapseAudit(rows);
    expect(out[0]!.signals).toEqual(["email_match"]);
  });

  it("sorts candidates desc by best confidence", () => {
    const rows = [
      dup("low", "name_company_fuzzy", 0.45, 10),
      dup("high", "email_match", 1.0, 11),
      dup("mid", "phone_match", 0.85, 12),
    ];
    const out: readonly PromptCandidate[] = collapseAudit(rows);
    expect(out.map((c) => c.candidate_person_id)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("preserves the earliest at_ms across collapsed rows", () => {
    const rows = [
      dup("juan", "email_match", 1.0, 50),
      dup("juan", "phone_match", 1.0, 10),
    ];
    const out = collapseAudit(rows);
    expect(out[0]!.first_seen_at_ms).toBe(10);
  });
});
