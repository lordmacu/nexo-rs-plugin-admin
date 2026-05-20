// Phase 98 follow-up — `<UninstallPluginModal>` coverage.
//
// The destructive guard: the Uninstall button stays disabled until
// the operator types the plugin-id prefix (first 8 chars). The
// `cargo uninstall` checkbox is opt-in. On confirm the modal calls
// `pluginsUninstall(id, cargoUninstall)` + raises `onApplied`.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/plugin_uninstall", () => ({
  pluginsUninstall: vi.fn().mockResolvedValue({
    plugin_id: "telegram",
    removed: true,
    cargo_uninstalled: false,
  }),
}));

import UninstallPluginModal from "../../src/modules/plugins/UninstallPluginModal";
import { pluginsUninstall } from "../../src/api/plugin_uninstall";

const uninstallMock = pluginsUninstall as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  uninstallMock.mockClear();
});

function uninstallButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: /^(Uninstall|Desinstalar)$/i,
  }) as HTMLButtonElement;
}

function confirmInput(): HTMLInputElement {
  // The confirm field is the only text input in the modal (the
  // other input is the cargo-uninstall checkbox). Placeholder ==
  // the id prefix, which varies per plugin, so locate by type.
  return screen.getByRole("textbox") as HTMLInputElement;
}

describe("UninstallPluginModal", () => {
  it("keeps Uninstall disabled until id prefix typed", () => {
    render(
      <UninstallPluginModal
        pluginId="telegram"
        onClose={() => {}}
        onApplied={() => {}}
      />,
    );
    // "telegram" is 8 chars → prefix is the whole word.
    expect(uninstallButton().disabled).toBe(true);
    fireEvent.change(confirmInput(), { target: { value: "telegram" } });
    expect(uninstallButton().disabled).toBe(false);
  });

  it("calls pluginsUninstall with cargo flag false by default", async () => {
    const onApplied = vi.fn();
    render(
      <UninstallPluginModal
        pluginId="telegram"
        onClose={() => {}}
        onApplied={onApplied}
      />,
    );
    fireEvent.change(confirmInput(), { target: { value: "telegram" } });
    fireEvent.click(uninstallButton());
    await waitFor(() => {
      expect(uninstallMock).toHaveBeenCalledWith("telegram", false);
    });
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
  });

  it("passes cargo_uninstall=true when checkbox ticked", async () => {
    render(
      <UninstallPluginModal
        pluginId="telegram"
        onClose={() => {}}
        onApplied={() => {}}
      />,
    );
    fireEvent.change(confirmInput(), { target: { value: "telegram" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(uninstallButton());
    await waitFor(() => {
      expect(uninstallMock).toHaveBeenCalledWith("telegram", true);
    });
  });

  it("wrong confirm text leaves button disabled", () => {
    render(
      <UninstallPluginModal
        pluginId="nexo-plugin-whatsapp"
        onClose={() => {}}
        onApplied={() => {}}
      />,
    );
    // prefix = first 8 chars = "nexo-plu"
    fireEvent.change(confirmInput(), { target: { value: "wrong" } });
    expect(uninstallButton().disabled).toBe(true);
    fireEvent.change(confirmInput(), { target: { value: "nexo-plu" } });
    expect(uninstallButton().disabled).toBe(false);
  });
});
