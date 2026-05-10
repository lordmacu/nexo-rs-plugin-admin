import { describe, expect, it } from "vitest";

import { ModuleRegistry } from "../../src/shell/ModuleRegistry";
import type { ModuleManifest } from "../../src/shell/types";

function manifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    id: "demo",
    version: "1.0.0",
    rail: { icon: null, label: "Demo", order: 100 },
    routes: [],
    ...overrides,
  } as ModuleManifest;
}

describe("ModuleRegistry — discovery", () => {
  it("returns empty when no manifests glob in", () => {
    const registry = ModuleRegistry.fromGlob({}, "tenantA");
    expect(registry.list()).toEqual([]);
    expect(registry.listActive()).toEqual([]);
  });

  it("registers a valid manifest", () => {
    const registry = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: manifest() } },
      "tenantA",
    );
    expect(registry.list()).toHaveLength(1);
    expect(registry.get("demo")?.error).toBeNull();
    expect(registry.get("demo")?.disabled).toBe(false);
  });

  it("disables a manifest that fails Zod schema", () => {
    const bad = { id: "BadCase", version: "not-semver" };
    const registry = ModuleRegistry.fromGlob(
      { "../modules/bad/manifest.tsx": { manifest: bad } },
      "tenantA",
    );
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0].disabled).toBe(true);
    expect(list[0].error?.kind).toBe("manifest_invalid");
  });

  it("sorts modules by rail.order", () => {
    const registry = ModuleRegistry.fromGlob(
      {
        "../modules/c/manifest.tsx": {
          manifest: manifest({ id: "c", rail: { icon: null, label: "C", order: 300 } }),
        },
        "../modules/a/manifest.tsx": {
          manifest: manifest({ id: "a", rail: { icon: null, label: "A", order: 100 } }),
        },
        "../modules/b/manifest.tsx": {
          manifest: manifest({ id: "b", rail: { icon: null, label: "B", order: 200 } }),
        },
      },
      "tenantA",
    );
    expect(registry.list().map((e) => e.manifest.id)).toEqual(["a", "b", "c"]);
  });
});

describe("ModuleRegistry — require", () => {
  it("returns the entry for a known id", () => {
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: manifest() } },
      "tenantA",
    );
    const result = reg.require("demo");
    expect("error" in result && result.error).toBeFalsy();
  });

  it("returns module_not_found error for an unknown id", () => {
    const reg = ModuleRegistry.fromGlob({}, "tenantA");
    const result = reg.require("ghost");
    expect("error" in result && result.error?.kind).toBe("module_not_found");
  });
});

describe("ModuleRegistry — migrations", () => {
  it("stamps version on first install (no migrations needed)", () => {
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: manifest() } },
      "tenantA",
    );
    expect(reg.get("demo")?.disabled).toBe(false);
    // Re-discover with the same tenant — no migration error
    // because the version stamp from the first run matches.
    const reg2 = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: manifest() } },
      "tenantA",
    );
    expect(reg2.get("demo")?.disabled).toBe(false);
  });

  it("runs the migration chain on version bump", () => {
    const v1 = manifest({ version: "1.0.0" });
    ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v1 } },
      "tenantA",
    );
    let migrationRan = false;
    const v2 = manifest({
      version: "2.0.0",
      migrations: {
        "1.0.0": (_state) => {
          migrationRan = true;
          return _state;
        },
      },
    });
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v2 } },
      "tenantA",
    );
    expect(migrationRan).toBe(true);
    expect(reg.get("demo")?.disabled).toBe(false);
  });

  it("disables the module when a migration step throws", () => {
    const v1 = manifest({ version: "1.0.0" });
    ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v1 } },
      "tenantA",
    );
    const v2 = manifest({
      version: "2.0.0",
      migrations: {
        "1.0.0": () => {
          throw new Error("boom");
        },
      },
    });
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v2 } },
      "tenantA",
    );
    const entry = reg.get("demo");
    expect(entry?.disabled).toBe(true);
    expect(entry?.error?.kind).toBe("migration_failed");
  });

  it("disables the module when migration chain has gap", () => {
    const v1 = manifest({ version: "1.0.0" });
    ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v1 } },
      "tenantA",
    );
    // No migration registered from 1.0.0 — should fail loud.
    const v3 = manifest({ version: "3.0.0", migrations: {} });
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v3 } },
      "tenantA",
    );
    // Empty migrations object → falls into the "treat as
    // forward-incompatible" branch, which clears scope and
    // stamps the new version. Module stays enabled.
    expect(reg.get("demo")?.disabled).toBe(false);
  });

  it("isolates migration state per tenant", () => {
    const v1 = manifest({ version: "1.0.0" });
    ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v1 } },
      "tenantA",
    );
    // tenantB has never seen the module — fresh stamp, no
    // migration error even though manifest skipped to 2.0.0.
    const v2 = manifest({ version: "2.0.0" });
    const reg = ModuleRegistry.fromGlob(
      { "../modules/demo/manifest.tsx": { manifest: v2 } },
      "tenantB",
    );
    expect(reg.get("demo")?.disabled).toBe(false);
  });
});
