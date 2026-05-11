// Phase 90 audit fix coverage — `confirmPrefix` is the safety
// gate that destructive modals (RestartPlugin, RestoreSnapshot)
// rely on. A regression here would silently let an operator
// confirm with the wrong text, defeating the typed-confirmation
// UX. Worth exhaustive coverage despite being a 4-line helper.

import { describe, expect, it } from "vitest";

import { confirmPrefix, confirmPrefixMatches } from "../../src/lib/confirmPrefix";

describe("confirmPrefix", () => {
  it("returns first 8 chars by default for long ids", () => {
    expect(confirmPrefix("abcdef0123456789-uuid")).toBe("abcdef01");
  });

  it("respects an explicit prefix length", () => {
    expect(confirmPrefix("abcdef0123456789-uuid", 4)).toBe("abcd");
    expect(confirmPrefix("abcdef0123456789-uuid", 16)).toBe("abcdef0123456789");
  });

  it("caps at id.length when n > id.length (defensive against short ids)", () => {
    expect(confirmPrefix("ab", 8)).toBe("ab");
    expect(confirmPrefix("plugin", 8)).toBe("plugin");
  });

  it("returns empty string for empty id (caller's gate handles it)", () => {
    expect(confirmPrefix("")).toBe("");
    expect(confirmPrefix("", 8)).toBe("");
  });
});

describe("confirmPrefixMatches", () => {
  it("matches when typed equals the prefix exactly", () => {
    expect(confirmPrefixMatches("abcdef01", "abcdef0123456789-uuid")).toBe(true);
  });

  it("trims whitespace from typed input", () => {
    expect(confirmPrefixMatches("  abcdef01  ", "abcdef0123456789-uuid")).toBe(
      true,
    );
    expect(confirmPrefixMatches("\tabcdef01\n", "abcdef0123456789-uuid")).toBe(
      true,
    );
  });

  it("rejects partial matches (typed shorter than prefix)", () => {
    expect(confirmPrefixMatches("abcdef0", "abcdef0123456789-uuid")).toBe(false);
  });

  it("rejects when typed includes extra chars past the prefix", () => {
    expect(confirmPrefixMatches("abcdef012", "abcdef0123456789-uuid")).toBe(
      false,
    );
  });

  it("rejects empty input regardless of id", () => {
    expect(confirmPrefixMatches("", "abcdef01")).toBe(false);
    expect(confirmPrefixMatches("   ", "abcdef01")).toBe(false);
  });

  it("rejects when id is empty (the empty prefix never matches)", () => {
    expect(confirmPrefixMatches("", "")).toBe(false);
    expect(confirmPrefixMatches("anything", "")).toBe(false);
  });

  it("respects custom prefix length", () => {
    expect(confirmPrefixMatches("abcd", "abcdef01", 4)).toBe(true);
    expect(confirmPrefixMatches("abcdef01", "abcdef01", 4)).toBe(false);
  });
});
