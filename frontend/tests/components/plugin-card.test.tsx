// Phase 98.13 — `<PluginCard>` render coverage.
//
// `useT` resolves keys to real strings via the en/es catalogs, so
// these tests look for the user-visible text (English defaults
// when the LocaleStore initialises to "en").

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import PluginCard from "../../src/modules/plugins/PluginCard";
import type { DiscoveredPlugin } from "../../src/api/plugin_discovery";

function base(overrides: Partial<DiscoveredPlugin> = {}): DiscoveredPlugin {
  return {
    name: "nexo-plugin-telegram",
    version: "0.3.0",
    description: "Telegram bot channel plugin",
    owner: "lordmacu",
    sources: [{ kind: "crates_io" }],
    repo_url: "https://github.com/lordmacu/nexo-rs-plugin-telegram",
    homepage: null,
    tags: ["messaging", "telegram"],
    category: "channel",
    trust_tier: "official",
    compat: { kind: "compatible" },
    manifest_url: null,
    install_cmd: "cargo install nexo-plugin-telegram --version 0.3.0",
    install_params: {
      crate_name: "nexo-plugin-telegram",
      version: "0.3.0",
      repo: "lordmacu/nexo-rs-plugin-telegram",
      source: "release",
      force: false,
      require_signature: false,
      skip_signature_verify: false,
    },
    ...overrides,
  };
}

/** Locate the primary install button. The locale store defaults
 *  to "es" so the rendered label is "Instalar"; match both for
 *  robustness across CI environments. */
function installBtn(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: /^(Install|Instalar)$/i,
  }) as HTMLButtonElement;
}

describe("PluginCard", () => {
  it("renders compatible card with install button enabled", () => {
    render(<PluginCard plugin={base()} onInstall={() => {}} />);
    expect(screen.getByText("nexo-plugin-telegram")).toBeTruthy();
    expect(installBtn().disabled).toBe(false);
  });

  it("disables install button when compat is incompatible", () => {
    render(
      <PluginCard
        plugin={base({
          compat: { kind: "incompatible", reason: "SDK pinned to 0.0.x" },
        })}
        onInstall={() => {}}
      />,
    );
    expect(installBtn().disabled).toBe(true);
  });

  it("install click forwards the whole plugin object", () => {
    const onInstall = vi.fn();
    const plugin = base();
    render(<PluginCard plugin={plugin} onInstall={onInstall} />);
    fireEvent.click(installBtn());
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onInstall).toHaveBeenCalledWith(plugin);
  });

  it("renders one badge per source kind", () => {
    const plugin = base({
      sources: [
        { kind: "crates_io" },
        { kind: "github_topic", repo: "lordmacu/nexo-rs-plugin-telegram" },
        { kind: "curated_index" },
      ],
    });
    render(<PluginCard plugin={plugin} onInstall={() => {}} />);
    // English labels from the catalog.
    expect(screen.getByText("crates.io")).toBeTruthy();
    expect(screen.getByText("GitHub topic")).toBeTruthy();
    // EN: "indexed"; ES: "indexado".
    expect(
      screen.queryByText("indexed") ?? screen.queryByText("indexado"),
    ).toBeTruthy();
  });

  it("shows compat-unknown badge for missing manifest", () => {
    render(
      <PluginCard
        plugin={base({ compat: { kind: "unknown" } })}
        onInstall={() => {}}
      />,
    );
    expect(
      screen.queryByText("compat unknown") ??
        screen.queryByText("compat desconocida"),
    ).toBeTruthy();
  });

  it("renders repo link only when repo_url is present", () => {
    const { rerender } = render(
      <PluginCard
        plugin={base({ repo_url: "https://github.com/x/y" })}
        onInstall={() => {}}
      />,
    );
    // EN: "Open repository"; ES: "Abrir repositorio".
    const link =
      screen.queryByTitle("Open repository") ??
      screen.queryByTitle("Abrir repositorio");
    expect(link).toBeTruthy();
    rerender(
      <PluginCard plugin={base({ repo_url: null })} onInstall={() => {}} />,
    );
    expect(
      screen.queryByTitle("Open repository") ??
        screen.queryByTitle("Abrir repositorio"),
    ).toBeNull();
  });
});
