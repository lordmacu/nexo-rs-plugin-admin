// Phase 82.10.u — OAuth flow client. Suspends across two admin RPC
// calls: `oauth_start` returns a session_id + authorize URL, the
// operator approves in their browser, then `oauth_finish` exchanges
// the code (auth-code) or polls until success (device-code).

import { create } from "zustand";
import { adminCall } from "../api/admin";
import type { AuthMode } from "./llmCatalog";

interface OAuthStartResponse {
  session_id: string;
  authorize_url: string;
  expires_at_ms: number;
  flow_kind: "auth_code" | "device_code";
  user_code?: string;
  polling_interval_ms?: number;
}

interface OAuthFinishResponse {
  ok: boolean;
  account_email?: string;
  expires_at_ms: number;
  secret_id: string;
}

export type OAuthState =
  | { kind: "idle" }
  | { kind: "starting" }
  | {
      kind: "awaiting_user";
      session_id: string;
      authorize_url: string;
      expires_at_ms: number;
      flow_kind: "auth_code" | "device_code";
      user_code?: string;
    }
  | { kind: "exchanging" }
  | {
      kind: "success";
      session_id: string;
      account_email?: string;
      secret_id: string;
    }
  | { kind: "error"; message: string };

interface OAuthFlowStore {
  state: OAuthState;
  start: (factory_type: string, auth_mode: AuthMode) => Promise<void>;
  finish: (instance_id: string, code?: string) => Promise<void>;
  reset: () => void;
}

export const useOAuthFlow = create<OAuthFlowStore>((set, get) => ({
  state: { kind: "idle" },
  start: async (factory_type, auth_mode) => {
    set({ state: { kind: "starting" } });
    try {
      const resp = await adminCall<OAuthStartResponse>(
        "nexo/admin/llm_providers/oauth_start",
        { factory_type, auth_mode },
      );
      // Best-effort browser open. SPA falls back to copy-paste
      // when popups are blocked.
      try {
        window.open(resp.authorize_url, "_blank", "noopener,noreferrer");
      } catch {
        // Popup blocked — operator copies URL manually.
      }
      const next: OAuthState = {
        kind: "awaiting_user",
        session_id: resp.session_id,
        authorize_url: resp.authorize_url,
        expires_at_ms: resp.expires_at_ms,
        flow_kind: resp.flow_kind,
        ...(resp.user_code !== undefined ? { user_code: resp.user_code } : {}),
      };
      set({ state: next });
    } catch (e) {
      set({
        state: {
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        },
      });
    }
  },
  finish: async (instance_id, code) => {
    const cur = get().state;
    if (cur.kind !== "awaiting_user") {
      set({
        state: { kind: "error", message: "no live OAuth session" },
      });
      return;
    }
    set({ state: { kind: "exchanging" } });
    try {
      const resp = await adminCall<OAuthFinishResponse>(
        "nexo/admin/llm_providers/oauth_finish",
        { session_id: cur.session_id, instance_id, code },
      );
      const success: OAuthState = {
        kind: "success",
        session_id: cur.session_id,
        secret_id: resp.secret_id,
        ...(resp.account_email !== undefined
          ? { account_email: resp.account_email }
          : {}),
      };
      set({ state: success });
    } catch (e) {
      set({
        state: {
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        },
      });
    }
  },
  reset: () => set({ state: { kind: "idle" } }),
}));
