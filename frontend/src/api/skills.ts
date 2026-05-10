// Phase 90.3.14 — admin RPC client for `nexo/admin/skills/*`.
// Types are local declarations until the ts-rs codegen pipeline
// adds them to `types.gen.ts` — drift gets caught by the i18n
// strict-key check during build (skill_get returning unexpected
// shape would fail the typed callsite).

import { adminCall } from "./admin";

export interface SkillsListParams {
  prefix?: string | null;
}

export interface SkillSummary {
  name: string;
  display_name?: string | null;
  description?: string | null;
  updated_at: string;
}

export interface SkillsListResponse {
  skills: SkillSummary[];
}

export interface SkillsGetParams {
  name: string;
}

export interface SkillRecord {
  name: string;
  display_name?: string | null;
  description?: string | null;
  body: string;
  updated_at: string;
}

export interface SkillsGetResponse {
  skill: SkillRecord | null;
}

export interface SkillsDeleteParams {
  name: string;
}

export interface SkillsDeleteAck {
  removed: boolean;
}

export async function listSkills(prefix?: string): Promise<SkillsListResponse> {
  const params: SkillsListParams = prefix ? { prefix } : {};
  return adminCall<SkillsListResponse>("nexo/admin/skills/list", params);
}

export async function getSkill(name: string): Promise<SkillsGetResponse> {
  return adminCall<SkillsGetResponse>("nexo/admin/skills/get", { name });
}

export async function deleteSkill(name: string): Promise<SkillsDeleteAck> {
  return adminCall<SkillsDeleteAck>("nexo/admin/skills/delete", { name });
}
