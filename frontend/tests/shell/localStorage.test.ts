import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  clearModuleScope,
  clearTenantScope,
  readModuleState,
  readShellState,
  writeModuleState,
  writeShellState,
} from "../../src/shell/localStorage";

const widthSchema = z.number().int().min(200).max(600);

describe("shell/localStorage — shell scope", () => {
  it("roundtrips a valid value", () => {
    writeShellState("sidebar-width", 320);
    expect(readShellState("sidebar-width", widthSchema, 300)).toBe(320);
  });

  it("returns fallback when the key is missing", () => {
    expect(readShellState("missing", widthSchema, 300)).toBe(300);
  });

  it("resets + returns fallback on JSON corruption", () => {
    localStorage.setItem("shell:bad-json", "{not-json");
    expect(readShellState("bad-json", widthSchema, 300)).toBe(300);
    expect(localStorage.getItem("shell:bad-json")).toBeNull();
  });

  it("resets + returns fallback on schema mismatch", () => {
    localStorage.setItem("shell:bad-shape", JSON.stringify("string-not-number"));
    expect(readShellState("bad-shape", widthSchema, 300)).toBe(300);
    expect(localStorage.getItem("shell:bad-shape")).toBeNull();
  });
});

describe("shell/localStorage — module + tenant scope", () => {
  it("scopes by tenant id", () => {
    writeModuleState("chats", "tenantA", "filter", "label-x");
    writeModuleState("chats", "tenantB", "filter", "label-y");
    expect(readModuleState("chats", "tenantA", "filter", z.string(), "")).toBe(
      "label-x",
    );
    expect(readModuleState("chats", "tenantB", "filter", z.string(), "")).toBe(
      "label-y",
    );
  });

  it("clearTenantScope purges only that tenant's module keys", () => {
    writeModuleState("chats", "tenantA", "filter", "x");
    writeModuleState("chats", "tenantB", "filter", "y");
    writeModuleState("agents", "tenantA", "view", "list");
    writeShellState("sidebar-width", 320);

    clearTenantScope("tenantA");

    expect(
      readModuleState("chats", "tenantA", "filter", z.string(), "fallback"),
    ).toBe("fallback");
    expect(
      readModuleState("agents", "tenantA", "view", z.string(), "fallback"),
    ).toBe("fallback");
    // Other tenant + shell scope untouched.
    expect(readModuleState("chats", "tenantB", "filter", z.string(), "")).toBe(
      "y",
    );
    expect(readShellState("sidebar-width", widthSchema, 300)).toBe(320);
  });

  it("clearModuleScope purges every tenant of one module", () => {
    writeModuleState("chats", "tenantA", "filter", "x");
    writeModuleState("chats", "tenantB", "filter", "y");
    writeModuleState("agents", "tenantA", "view", "list");

    clearModuleScope("chats");

    expect(readModuleState("chats", "tenantA", "filter", z.string(), "")).toBe(
      "",
    );
    expect(readModuleState("chats", "tenantB", "filter", z.string(), "")).toBe(
      "",
    );
    expect(readModuleState("agents", "tenantA", "view", z.string(), "")).toBe(
      "list",
    );
  });
});
