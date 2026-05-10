// Phase 90.3.20 — admin RPC client for the settings module.
//
// V1 surface is intentionally narrow: just the auth rotate
// endpoint (Phase 82.10.o `nexo/admin/auth/rotate_token`).
// Broker config / system info / capability inventory all require
// new admin RPCs that haven't shipped yet — they degrade in the
// UI to "not yet wired" placeholders.

import { adminCall } from "./admin";

export interface AuthRotateAck {
  rotated: boolean;
  /** When the daemon issues the new token, the operator must
   *  re-login. The plugin's bearer middleware reloads from the
   *  new env value via the `LiveTokenState` rotation listener. */
  new_token_hash?: string;
}

export async function rotateAuthToken(): Promise<AuthRotateAck> {
  return adminCall<AuthRotateAck>("nexo/admin/auth/rotate_token", {});
}
