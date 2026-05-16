// Phase 81.31 — persona multi-locale RPC client.
//
// Reads come through `agents/get` (which embeds
// `persona_locales` since Phase 81.31). Writes go through
// `nexo/admin/persona/save_localized`.

import { adminCall } from "./admin";
import type {
  PersonaSaveLocalizedRequest,
  PersonaSaveLocalizedResponse,
} from "./types.gen";

/** Persist one locale's persona snapshot. The daemon writes 4
 *  workspace files (`IDENTITY.<locale>.md`, `SOUL.<locale>.md`,
 *  `USER.<locale>.md`, `AGENTS.<locale>.md`) and, when
 *  `patch_yaml === true`, updates
 *  `agents.d/<id>.yaml::locale_prompts[<locale>]`. */
export async function savePersonaLocalized(
  req: PersonaSaveLocalizedRequest,
): Promise<PersonaSaveLocalizedResponse> {
  return adminCall<PersonaSaveLocalizedResponse>(
    "nexo/admin/persona/save_localized",
    req as unknown as Record<string, unknown>,
  );
}
