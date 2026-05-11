// Phase 90 audit fix coverage — `RestartPluginModal` is the
// destructive-action safety gate for plugin restart. The
// confirm-by-typing-prefix UX is the LAST line of defence
// against an operator accidentally restarting the wrong plugin
// (e.g. clicking the wrong row + tabbing through). A regression
// in the prefix matching logic would silently re-enable the
// destructive button, so explicit coverage matters even though
// the underlying helper (`confirmPrefix`) has its own tests.

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../src/api/plugin_restart", () => ({
  pluginsRestart: vi.fn(),
}));
vi.mock("../../src/api/plugin_doctor", () => ({
  fetchPluginDoctor: vi.fn().mockResolvedValue({
    report: { loaded_ids: [], scanned: 0, invalid: 0, disabled: 0 },
    generated_at_ms: 0,
  }),
}));

import RestartPluginModal from "../../src/modules/plugins/RestartPluginModal";
import { pluginsRestart } from "../../src/api/plugin_restart";
import { usePluginsDoctor } from "../../src/store/plugins";
import { useLocaleStore } from "../../src/i18n/store";

const restartMock = pluginsRestart as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  restartMock.mockReset();
  // Pin locale to `en` so role-name matchers work against the
  // canonical English catalog. Default is `es`, which would
  // yield "Reiniciar" for the destructive button.
  useLocaleStore.setState({ locale: "en" });
  // Reset store between tests so prior in-flight state doesn't
  // leak.
  usePluginsDoctor.setState({
    restartInFlight: null,
    lastRestartReport: null,
    error: null,
  });
});

afterEach(() => {
  usePluginsDoctor.setState({
    restartInFlight: null,
    lastRestartReport: null,
    error: null,
  });
});

describe("RestartPluginModal — confirm-prefix safety gate", () => {
  it("disables Restart button when no prefix typed", () => {
    render(
      <RestartPluginModal
        pluginId="browser-plugin"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );
    const restartBtn = screen.getByRole("button", { name: /restart/i });
    expect(restartBtn).toBeDisabled();
  });

  it("keeps Restart disabled while typed prefix is wrong", () => {
    render(
      <RestartPluginModal
        pluginId="browser-plugin"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "browzer-" } }); // typo
    const restartBtn = screen.getByRole("button", { name: /restart/i });
    expect(restartBtn).toBeDisabled();
  });

  it("enables Restart only when typed exactly matches the 8-char prefix", () => {
    render(
      <RestartPluginModal
        pluginId="browser-plugin"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "browser-" } });
    const restartBtn = screen.getByRole("button", { name: /restart/i });
    expect(restartBtn).toBeEnabled();
  });

  it("sends pluginsRestart with the correct id when confirmed", async () => {
    restartMock.mockResolvedValueOnce({
      plugin_id: "browser-plugin",
      previous_uptime_ms: 1234,
      restarted_at_ms: 1_700_000_000_000,
      new_pid: 4242,
    });
    const onApplied = vi.fn();
    render(
      <RestartPluginModal
        pluginId="browser-plugin"
        onClose={vi.fn()}
        onApplied={onApplied}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "browser-" },
    });
    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    // Allow the await chain to resolve.
    await new Promise((r) => setTimeout(r, 0));
    expect(restartMock).toHaveBeenCalledWith("browser-plugin");
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("does not send when confirm text is wrong even if the operator hits Restart programmatically", () => {
    render(
      <RestartPluginModal
        pluginId="browser-plugin"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "wrong" },
    });
    // Click the disabled button — should be a no-op (button has
    // `disabled` attribute; React doesn't dispatch onClick).
    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    expect(restartMock).not.toHaveBeenCalled();
  });

  it("works with short plugin ids (defensive against id.length < 8)", () => {
    render(
      <RestartPluginModal
        pluginId="abc"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "abc" },
    });
    const restartBtn = screen.getByRole("button", { name: /restart/i });
    expect(restartBtn).toBeEnabled();
  });
});
