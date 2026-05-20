// Phase 99.7 — parity tests for the `visible_when` TS DSL. Mirrors
// the Rust suite (`crates/plugin-manifest/src/visible_when.rs`) so
// client + server visibility stay in lock-step.

import { describe, it, expect } from "vitest";
import {
  parse,
  evaluate,
  isVisible,
  VisibleWhenError,
  MAX_LEN,
} from "../../src/lib/visibleWhenDsl";

const ctx = () => ({
  plugin: { installed: true, enabled: true, healthy: false },
  config: { use_tls: true, port: 587, name: "smtp", tags: [] as unknown[] },
  tenant: { id: "acme" },
  user: { role: "admin" },
});

const ev = (src: string) => evaluate(parse(src), ctx());

describe("parse — happy", () => {
  it("single var / bools / numbers / strings", () => {
    expect(() => parse("plugin.enabled")).not.toThrow();
    expect(() => parse("true")).not.toThrow();
    expect(() => parse("false")).not.toThrow();
    expect(() => parse("42")).not.toThrow();
    expect(() => parse("-3")).not.toThrow();
    expect(() => parse("12.5")).not.toThrow();
    expect(() => parse('"admin"')).not.toThrow();
    expect(() => parse("'admin'")).not.toThrow();
  });

  it("and / or / not / parens", () => {
    for (const s of ["a && b", "a || b", "!a", "!(a && b)", "(a || b) && c"]) {
      expect(() => parse(s), s).not.toThrow();
    }
  });

  it("all comparison ops", () => {
    for (const op of ["==", "!=", "<", ">", "<=", ">="]) {
      expect(() => parse(`config.port ${op} 500`), op).not.toThrow();
    }
  });

  it("|| lower precedence than &&", () => {
    expect(parse("a || b && c").t).toBe("or");
  });
});

describe("parse — errors", () => {
  const bad = [
    "",
    "(a && b",
    "a && b)",
    "a b",
    "a & b",
    "a | b",
    "a = b",
    "plugin.",
    ".enabled",
    "a..b",
    '"abc',
    "1.2.3",
    "-x",
    "a @ b",
    "!!a", // stacked not — grammar allows only single `!`
  ];
  for (const s of bad) {
    it(`rejects ${JSON.stringify(s)}`, () => {
      expect(() => parse(s)).toThrow(VisibleWhenError);
    });
  }

  it("too long", () => {
    expect(() => parse("a".repeat(MAX_LEN + 1))).toThrow(/exceeds/);
  });

  it("too deep (&&-chain depth 6)", () => {
    expect(() => parse("a&&b&&c&&d&&e&&f")).toThrow(/depth/);
  });

  it("at max depth ok (&&-chain depth 5)", () => {
    expect(() => parse("a&&b&&c&&d&&e")).not.toThrow();
  });

  it("stacked not via parens ok", () => {
    expect(() => parse("!(!a)")).not.toThrow();
  });
});

describe("eval — truthiness", () => {
  it("var bools", () => {
    expect(ev("plugin.enabled")).toBe(true);
    expect(ev("plugin.healthy")).toBe(false);
  });
  it("missing var is false", () => {
    expect(ev("plugin.nope")).toBe(false);
    expect(ev("ghost.deep.path")).toBe(false);
  });
  it("string / array / number truthiness", () => {
    expect(ev("config.name")).toBe(true);
    expect(ev("config.tags")).toBe(false);
    expect(ev("config.port")).toBe(true);
  });
  it("bool literals", () => {
    expect(ev("true")).toBe(true);
    expect(ev("false")).toBe(false);
  });
});

describe("eval — logic", () => {
  it("and / or / not", () => {
    expect(ev("plugin.installed && plugin.enabled")).toBe(true);
    expect(ev("plugin.enabled && plugin.healthy")).toBe(false);
    expect(ev("plugin.healthy || plugin.enabled")).toBe(true);
    expect(ev("!plugin.healthy")).toBe(true);
  });
  it("parens override precedence", () => {
    expect(ev("!(plugin.enabled && plugin.installed)")).toBe(false);
    expect(ev("(plugin.healthy || plugin.enabled) && plugin.installed")).toBe(
      true,
    );
  });
});

describe("eval — comparisons", () => {
  it("numeric eq / ne / relational", () => {
    expect(ev("config.port == 587")).toBe(true);
    expect(ev("config.port == 25")).toBe(false);
    expect(ev("config.port == 587.0")).toBe(true);
    expect(ev("config.port != 25")).toBe(true);
    expect(ev("config.port > 500")).toBe(true);
    expect(ev("config.port < 1000")).toBe(true);
    expect(ev("config.port >= 587")).toBe(true);
    expect(ev("config.port <= 587")).toBe(true);
    expect(ev("config.port < 100")).toBe(false);
  });
  it("string eq + lexicographic", () => {
    expect(ev('user.role == "admin"')).toBe(true);
    expect(ev('user.role == "viewer"')).toBe(false);
    expect(ev('tenant.id < "zzz"')).toBe(true);
  });
  it("bool compared to literal", () => {
    expect(ev("config.use_tls == true")).toBe(true);
    expect(ev("config.use_tls == false")).toBe(false);
  });
  it("type mismatch relational is false", () => {
    expect(ev("user.role < 5")).toBe(false);
    expect(ev("config.use_tls > 1")).toBe(false);
  });
  it("missing var comparison", () => {
    expect(ev("config.missing == 1")).toBe(false);
    expect(ev("config.missing != 1")).toBe(true);
  });
  it("complex expression", () => {
    expect(
      ev(
        'plugin.enabled && (user.role == "admin" || user.role == "owner") && config.port >= 25',
      ),
    ).toBe(true);
    expect(ev("plugin.healthy && config.port == 587")).toBe(false);
  });
});

describe("isVisible helper", () => {
  it("absent expression is visible", () => {
    expect(isVisible(undefined, ctx())).toBe(true);
    expect(isVisible(null, ctx())).toBe(true);
    expect(isVisible("", ctx())).toBe(true);
  });
  it("valid expression evaluated", () => {
    expect(isVisible("plugin.enabled", ctx())).toBe(true);
    expect(isVisible("plugin.healthy", ctx())).toBe(false);
  });
  it("invalid expression is hidden (false)", () => {
    expect(isVisible("a &", ctx())).toBe(false);
  });
  it("empty context never throws", () => {
    expect(isVisible("plugin.enabled", {})).toBe(false);
  });
});
