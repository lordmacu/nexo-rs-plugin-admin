// Typed clients for the M9 onboarding endpoints. All four routes
// require the M2 bearer (handled by `authedFetch`); the four pure
// admin proxies the wizard also needs (pairing/start, pairing/
// status, llm_providers/upsert) flow through `adminCall` instead.
//
// Response envelope is uniformly `{ ok: true, result: T }` on
// success and `{ ok: false, error: { code, ... } }` on failure —
// the helpers below unwrap to T or throw a typed error.

import { authedFetch, HttpError } from "./client";
import type {
  AgentDetail,
  AgentSaveRequest,
  BootstrapState,
  ProbeRequest,
  ProbeResult,
} from "./types";

interface OkEnvelope<T> {
  ok: true;
  result: T;
}

interface ErrEnvelope {
  ok: false;
  error: { code: string; message?: string; [k: string]: unknown };
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as OkEnvelope<T> | ErrEnvelope;
  if (!body.ok) {
    throw new HttpError(res.status, body.error);
  }
  return body.result;
}

export async function fetchBootstrap(): Promise<BootstrapState> {
  const res = await authedFetch("/api/bootstrap");
  return unwrap<BootstrapState>(res);
}

export async function probeLlm(req: ProbeRequest): Promise<ProbeResult> {
  const res = await authedFetch("/api/onboarding/llm/probe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return unwrap<ProbeResult>(res);
}

/** M9.frame.a — atomic LLM provider save (secrets/write +
 *  llm_providers/upsert in one round-trip). The microapp
 *  backend writes the secret to `<state_root>/secrets/<NAME>.txt`
 *  AND injects it into the daemon's process env via
 *  `std::env::set_var`, so the operator no longer needs to
 *  manually `export` + restart the daemon. */
export interface LlmSaveRequest {
  provider_id: string;
  base_url: string;
  api_key_env: string;
  api_key_value: string;
}

export interface LlmSaveResult {
  secrets_path: string;
  overwrote_env: boolean;
  /** M9.frame.b — daemon-side `/v1/models` probe outcome. `null`
   *  when the call failed entirely (e.g. probe wasn't wired);
   *  `{ ok: false, error: ... }` when the daemon couldn't reach
   *  the provider. Non-blocking — wizard advances either way. */
  daemon_probe: LlmDaemonProbe | null;
}

export interface LlmDaemonProbe {
  ok: boolean;
  status: number;
  latency_ms: number;
  model_count?: number;
  error?: string;
}

export async function saveLlm(req: LlmSaveRequest): Promise<LlmSaveResult> {
  const res = await authedFetch("/api/onboarding/llm/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return unwrap<LlmSaveResult>(res);
}

export async function saveAgent(req: AgentSaveRequest): Promise<AgentDetail> {
  const res = await authedFetch("/api/onboarding/agent/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return unwrap<AgentDetail>(res);
}

export async function finishOnboarding(): Promise<void> {
  await authedFetch("/api/onboarding/finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
