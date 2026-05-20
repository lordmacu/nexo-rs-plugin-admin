// Phase 99.7 — runtime plugin admin-UI contributions store.
//
// Fetches `nexo/admin/plugin_ui/list` on boot and re-fetches when a
// `plugin_ui_changed` firehose event arrives (install / uninstall /
// enable / disable / config edit). The shell rail + GenericScreen
// (Phase 99.8) read `entries` to render plugin menus + screens.
//
// Capability-graceful: when the operator lacks `plugin_admin_ui`,
// the list call returns `capability_not_granted`; we degrade to an
// empty `denied` state instead of surfacing an error (the feature
// is simply hidden), mirroring `useTenantStore`.

import { create } from "zustand";

import { adminCall } from "../api/admin";
import { HttpError } from "../api/client";
import { subscribeStream } from "../api/firehose";
// `AgentEventKind` from the curated re-export (matches firehose's
// handler type, a superset of the generated union); the plugin_ui
// wire types come straight from the generated bindings.
import type { AgentEventKind } from "../api/types";
import type { PluginUiEntry, PluginUiListResponse } from "../api/types.gen";

export type PluginContributionsStatus =
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "error";

export interface PluginContributionsState {
  /** Per-plugin gated contributions + screen stubs. */
  entries: PluginUiEntry[];
  /** Aggregate hash from the last successful fetch. */
  etag: string;
  status: PluginContributionsStatus;
  error: string | null;
  /** Fetch the contribution list (idempotent; safe to re-call). */
  fetch: () => Promise<void>;
  /** Firehose dispatch — re-fetches on `plugin_ui_changed`. */
  handleEvent: (event: AgentEventKind) => void;
  /** Boot helper: fetch + subscribe to the firehose. Returns an
   *  unsubscribe fn. */
  subscribe: () => () => void;
}

/** `true` when the error is a `plugin_admin_ui` capability denial. */
function isCapabilityDenied(err: unknown): boolean {
  if (!(err instanceof HttpError)) return false;
  try {
    return JSON.stringify(err.body ?? "").includes("capability_not_granted");
  } catch {
    return false;
  }
}

export const usePluginContributions = create<PluginContributionsState>(
  (set, get) => ({
    entries: [],
    etag: "",
    status: "idle",
    error: null,

    async fetch() {
      set({ status: "loading", error: null });
      try {
        const resp = await adminCall<PluginUiListResponse>(
          "nexo/admin/plugin_ui/list",
        );
        set({
          entries: resp.plugins,
          etag: resp.etag,
          status: "ready",
          error: null,
        });
      } catch (err) {
        if (isCapabilityDenied(err)) {
          set({ entries: [], etag: "", status: "denied", error: null });
          return;
        }
        set({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    handleEvent(event) {
      // `plugin_ui_changed` is intentionally NOT in the curated
      // `AgentEventKind` union (the chat module owns that union);
      // match the discriminant via a loose read so we don't force
      // every conversation switch to handle a non-chat event.
      if ((event as { kind: string }).kind === "plugin_ui_changed") {
        void get().fetch();
      }
    },

    subscribe() {
      void get().fetch();
      try {
        // `EventSource` is absent in jsdom + non-browser hosts;
        // degrade to fetch-only (no live refresh) instead of
        // throwing during shell mount.
        return subscribeStream({}, { onEvent: (e) => get().handleEvent(e) });
      } catch {
        return () => {};
      }
    },
  }),
);
