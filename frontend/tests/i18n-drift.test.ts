// Phase 90 audit fix coverage — runtime i18n drift guard.
//
// The TypeScript `Catalog` type enforces key parity at compile
// time, but type widening (e.g. `Record<string, string>`) or a
// future refactor that drops the strict signature would break
// the guard silently. This test diffs the runtime objects so any
// key drift fails CI immediately.
//
// Specifically catches:
//   - Key added only to `en.ts` (Spanish operator falls back to
//     the key name itself in the UI).
//   - Key added only to `es.ts` (English operator sees the same).
//   - Catalog growth that crosses the type boundary without
//     touching the canonical `Catalog` declaration.

import { describe, expect, it } from "vitest";

import enCatalog from "../src/i18n/catalogs/en";
import esCatalog from "../src/i18n/catalogs/es";

describe("i18n catalogs — en/es parity", () => {
  it("contain the exact same keys (zero drift)", () => {
    const enKeys = new Set(Object.keys(enCatalog));
    const esKeys = new Set(Object.keys(esCatalog));

    const onlyInEn = [...enKeys].filter((k) => !esKeys.has(k)).sort();
    const onlyInEs = [...esKeys].filter((k) => !enKeys.has(k)).sort();

    expect(onlyInEn).toEqual([]);
    expect(onlyInEs).toEqual([]);
  });

  it("have identical key counts", () => {
    expect(Object.keys(enCatalog).length).toBe(Object.keys(esCatalog).length);
  });

  it("expose at least the wave 90.x audit-fix keys", () => {
    // Smoke check — guards against accidental deletion of the
    // keys shipped in the P1 wave (restore Done view +
    // lastRestartReport banner).
    const required = [
      "memory.snapshots.restore.done_title",
      "memory.snapshots.restore.done_intro",
      "memory.snapshots.restore.close",
      "plugins.restart.report.banner",
      "plugins.restart.report.previous_uptime",
      "plugins.restart.report.new_pid",
      "plugins.restart.report.restarted_at",
      "plugins.restart.report.dismiss",
    ];
    for (const k of required) {
      expect(enCatalog).toHaveProperty(k);
      expect(esCatalog).toHaveProperty(k);
    }
  });

  it("have non-empty values for every key (no placeholder gaps)", () => {
    for (const [k, v] of Object.entries(enCatalog)) {
      expect(typeof v).toBe("string");
      expect((v as string).length, `en[${k}] must not be empty`).toBeGreaterThan(
        0,
      );
    }
    for (const [k, v] of Object.entries(esCatalog)) {
      expect(typeof v).toBe("string");
      expect((v as string).length, `es[${k}] must not be empty`).toBeGreaterThan(
        0,
      );
    }
  });
});
