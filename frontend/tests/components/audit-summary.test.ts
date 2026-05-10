// F27 — `summarizeAuditEvent` coverage. The audit-tab
// table cell renders the function's output as a one-line
// summary; every event variant must distill into a useful
// human-readable string.

import { describe, expect, it } from "vitest";

import { summarizeAuditEvent } from "../../src/modules/marketing/SettingsView";
import type { MarketingAuditEvent } from "../../src/api/marketing";

describe("summarizeAuditEvent", () => {
  it("routing_decided shows seller arrow + score when a seller was chosen", () => {
    const e: MarketingAuditEvent = {
      kind: "routing_decided",
      tenant_id: "acme",
      lead_id: "l-1",
      from_email: "juan@acme.com",
      chosen_seller_id: "pedro",
      rule_id: "warm-corp",
      why: [],
      score: 65,
      score_reasons: [],
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toContain("→ pedro");
    expect(out).toContain("juan@acme.com");
    expect(out).toContain("rule:warm-corp");
    expect(out).toContain("score 65");
  });

  it("routing_decided drops the rule label when no rule matched", () => {
    const e: MarketingAuditEvent = {
      kind: "routing_decided",
      tenant_id: "acme",
      lead_id: "l-1",
      from_email: "juan@acme.com",
      chosen_seller_id: "pedro",
      rule_id: null,
      why: [],
      score: 0,
      score_reasons: [],
      at_ms: 1,
    };
    expect(summarizeAuditEvent(e)).not.toContain("rule:");
  });

  it("routing_decided shows `dropped` when no seller was chosen", () => {
    const e: MarketingAuditEvent = {
      kind: "routing_decided",
      tenant_id: "acme",
      lead_id: null,
      from_email: "spam@x.com",
      chosen_seller_id: null,
      rule_id: "drop-disposable",
      why: [],
      score: 0,
      score_reasons: [],
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toMatch(/^dropped/);
    expect(out).toContain("spam@x.com");
  });

  it("lead_transitioned shows from → to + reason", () => {
    const e: MarketingAuditEvent = {
      kind: "lead_transitioned",
      tenant_id: "acme",
      lead_id: "l-1",
      from: "engaged",
      to: "qualified",
      reason: "demo agendada",
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toContain("engaged → qualified");
    expect(out).toContain("demo agendada");
  });

  it("lead_transitioned drops reason suffix when empty", () => {
    const e: MarketingAuditEvent = {
      kind: "lead_transitioned",
      tenant_id: "acme",
      lead_id: "l-1",
      from: "cold",
      to: "engaged",
      reason: "",
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toBe("cold → engaged");
  });

  it("notification_published shows kind + channel + seller", () => {
    const e: MarketingAuditEvent = {
      kind: "notification_published",
      tenant_id: "acme",
      lead_id: "l-1",
      seller_id: "pedro",
      notification_kind: "lead_created",
      channel: "whatsapp",
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toContain("lead_created");
    expect(out).toContain("whatsapp");
    expect(out).toContain("pedro");
  });

  it("notification_published surfaces deduped channel", () => {
    const e: MarketingAuditEvent = {
      kind: "notification_published",
      tenant_id: "acme",
      lead_id: "l-1",
      seller_id: "pedro",
      notification_kind: "lead_replied",
      channel: "deduped",
      at_ms: 1,
    };
    expect(summarizeAuditEvent(e)).toContain("deduped");
  });

  it("topic_guardrail_fired shows rule_name + action + excerpt", () => {
    const e: MarketingAuditEvent = {
      kind: "topic_guardrail_fired",
      tenant_id: "acme",
      lead_id: "l-1",
      from_email: "juan@x.com",
      rule_id: "pricing_quotes",
      rule_name: "Pricing quotes",
      action: "force_approval",
      excerpt: "el precio que ofrecen",
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toContain("Pricing quotes");
    expect(out).toContain("force_approval");
    expect(out).toContain("el precio que ofrecen");
  });

  it("duplicate_person_detected shows percent + signal + detail", () => {
    const e: MarketingAuditEvent = {
      kind: "duplicate_person_detected",
      tenant_id: "acme",
      lead_id: "l-1",
      candidate_person_id: "juan-existing",
      resolved_person_id: "juan-new",
      signal: "email_match",
      confidence: 1.0,
      detail: "matched email `juan@globex.io`",
      at_ms: 1,
    };
    const out = summarizeAuditEvent(e);
    expect(out).toContain("100%");
    expect(out).toContain("email_match");
    expect(out).toContain("matched email");
  });

  it("duplicate_person_detected rounds confidence to whole percent", () => {
    const e: MarketingAuditEvent = {
      kind: "duplicate_person_detected",
      tenant_id: "acme",
      lead_id: "l-1",
      candidate_person_id: "x",
      resolved_person_id: "y",
      signal: "name_company_fuzzy",
      // 0.534 → 53%.
      confidence: 0.534,
      detail: "name match",
      at_ms: 1,
    };
    expect(summarizeAuditEvent(e)).toContain("53%");
  });
});
