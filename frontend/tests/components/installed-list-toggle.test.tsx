// Phase 98 follow-up — InstalledList enable/disable toggle coverage.
//
// Verifies:
//   - Loaded plugins render with a disable toggle → click calls
//     onToggleEnabled(id, false).
//   - Disabled plugins (extracted from the report's
//     `kind: { Disabled: { id } }` diagnostics) render in a
//     dedicated section with an enable toggle → click calls
//     onToggleEnabled(id, true).

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import InstalledList from "../../src/modules/plugins/InstalledList";
import type { PluginsDoctorResponse } from "../../src/api/plugin_doctor";

function doctorData(): PluginsDoctorResponse {
  return {
    report: {
      loaded_ids: ["nexo-plugin-telegram"],
      scanned: 2,
      invalid: 0,
      disabled: 1,
      init_outcomes: { "nexo-plugin-telegram": "Spawned" },
      diagnostics: [
        {
          level: "Info",
          path: "/plugins/whatsapp",
          // Externally-tagged serde enum: Disabled { id }.
          kind: { Disabled: { id: "nexo-plugin-whatsapp" } },
        } as never,
      ],
    },
    generated_at_ms: Date.now(),
  };
}

describe("InstalledList enable/disable toggle", () => {
  it("renders loaded plugin with disable toggle that fires (id,false)", () => {
    const onToggle = vi.fn();
    render(
      <InstalledList
        data={doctorData()}
        isLoading={false}
        onRequestRestart={() => {}}
        onRequestUninstall={() => {}}
        onToggleEnabled={onToggle}
      />,
    );
    expect(screen.getByText("nexo-plugin-telegram")).toBeTruthy();
    // The disable toggle has the EN/ES title.
    const disableBtn = screen.getByTitle(
      /Disable \(stop, keeps binary on disk\)|Desactivar/,
    );
    fireEvent.click(disableBtn);
    expect(onToggle).toHaveBeenCalledWith("nexo-plugin-telegram", false);
  });

  it("surfaces disabled plugin from diagnostics with enable toggle", () => {
    const onToggle = vi.fn();
    render(
      <InstalledList
        data={doctorData()}
        isLoading={false}
        onRequestRestart={() => {}}
        onRequestUninstall={() => {}}
        onToggleEnabled={onToggle}
      />,
    );
    // Disabled plugin id surfaces in its own section.
    expect(screen.getByText("nexo-plugin-whatsapp")).toBeTruthy();
    const enableBtn = screen.getByTitle(
      /Enable \(re-spawn, keeps binary\)|Activar/,
    );
    fireEvent.click(enableBtn);
    expect(onToggle).toHaveBeenCalledWith("nexo-plugin-whatsapp", true);
  });

  it("no disabled section when report has no Disabled diagnostics", () => {
    const data = doctorData();
    data.report.diagnostics = [];
    render(
      <InstalledList
        data={data}
        isLoading={false}
        onRequestRestart={() => {}}
        onRequestUninstall={() => {}}
        onToggleEnabled={() => {}}
      />,
    );
    expect(screen.queryByText("nexo-plugin-whatsapp")).toBeNull();
  });
});
