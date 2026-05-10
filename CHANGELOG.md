# Changelog

All notable changes to `nexo-plugin-admin` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [SemVer](https://semver.org/).

## [Unreleased]

Tracked in upstream `nexo-rs/proyecto/FOLLOWUPS.md` under
"Phase 90 — nexo-plugin-admin":

- Memory snapshot admin RPCs (`memory/{create,list,restore}_snapshot`).
  V1 ships `memory/query` only; snapshot creation stays CLI-only
  for now.
- Plugin admin e2e test against a running daemon.

## [0.1.6] — 2026-05-10

### Added

- **`nexo/notify/token_rotated` listener** wired through the SDK.
  When the daemon issues `auth_rotate`, the plugin atomically:
  - Swaps `LiveTokenState` so the bearer middleware accepts the
    new token on the next request (bearer rotation, existing
    behaviour from `nexo-microapp-http`).
  - Mints a fresh `AdminSession` (new HMAC secret + new password)
    and swaps `LiveAdminSession`. Existing browser cookies become
    invalid because they were signed with the old secret; the
    operator re-logs in with the new password printed to stderr.
- Bumped `nexo-tool-meta` consumer to `0.1.9` (was `0.1.6`).

## [0.1.5] — 2026-05-10

### Added

- **`/m/channels` approve flow** — `ChannelApproveModal` with
  agent picker (dropdown from `listAgents`, free-text fallback)
  + server picker (`<datalist>` autocomplete from `listMcpServers`,
  also accepts plugin-shipped names like `plugin:telegram:tg`)
  + allowlist editor (comma-separated binding indices; empty =
  all). Backed by `nexo/admin/channels/approve` (Phase 82.10.f).
- 13 i18n keys under `channels.approve.*` (es + en).

### Changed

- `ChannelsMain` header now offers `+ Approve` alongside the
  reload control. The deferred-feature note shipped in 0.1.0 is
  removed.

## [0.1.4] — 2026-05-10

### Added

- **`/m/memory` LIVE** — agent_id + free-text query inputs,
  result cards with tags + concept_tags + memory_type badges.
  Backed by `nexo/admin/memory/query` (capability `memory_query`,
  Phase 90.x.memory).
- 8 i18n keys under `memory.*` (es + en).

### Changed

- Bumped daemon dependency floor to `nexo-tool-meta@0.1.9` +
  `nexo-core@0.1.9`. The plugin gracefully degrades against an
  older daemon — the page renders an error banner instead of a
  silent failure.

### Removed

- Placeholder copy that pointed at the `agent memory snapshot`
  CLI fallback. Snapshot creation is still CLI-only; the page now
  surfaces query results directly.

## [0.1.3] — 2026-05-10

### Added

- **`/m/plugins` LIVE** — 4-tile summary (loaded / scanned /
  invalid / disabled), active plugins list with `InitOutcome`
  badges (`spawned` green / `no handle` yellow / `failed` red,
  hover for reason), diagnostics list (Error red, Warn yellow).
  Backed by `nexo/admin/plugins/doctor` (capability
  `plugin_doctor`, Phase 90.x.plugins).
- 11 i18n keys under `plugins.*` (es + en).

### Changed

- Bumped daemon dependency floor to `nexo-tool-meta@0.1.8` +
  `nexo-core@0.1.8`.

## [0.1.2] — 2026-05-10

### Added

- **`/m/mcp_servers` LIVE** — live table of `mcp.servers` entries
  with create modal supporting all four transports
  (`stdio` / `streamable_http` / `sse` / `auto`). Backed by
  `nexo/admin/mcp/{list,get,upsert,delete}` (capability
  `mcp_crud`, Phase 90.x.mcp). Yaml round-trip preserves
  unknown top-level keys (operator's `schema_version`,
  `mcp.enabled`, sampling overrides, etc.).
- 19 i18n keys under `mcp_servers.*` (es + en).

### Changed

- Bumped daemon dependency floor to `nexo-tool-meta@0.1.7` +
  `nexo-core@0.1.7`.

## [0.1.1] — 2026-05-10

### Added

- **`/m/tenants` write surface** — create modal (id +
  display_name, regex-validated client-side against
  `^[a-z0-9][a-z0-9-]{0,63}$`) + activate/deactivate toggle +
  delete with cascade-purge confirmation when orphan agents
  reference the tenant.
- 17 i18n keys under `tenants.*` (es + en).

### Fixed

- `api/tenants.ts::tenantsList` now translates the daemon shape
  (`id`, `display_name`) to the legacy frontend shape
  (`tenant_id`, `name`) so the rail switcher and zustand store
  keep working unchanged. The pre-fix list was silently empty.

## [0.1.0] — 2026-05-10

Initial public release. Phase 90 ships the plugin admin out-of-tree
and replaces the in-tree `proyecto/admin-ui/` (5 342 LOC removed
from the daemon binary).

### Added

#### Core

- **Subprocess plugin** (Phase 81.14) — daemon spawns the binary
  and drives it via newline-delimited JSON-RPC 2.0 over stdio.
- **HTTP server** (Phase 82.12 `http_server` capability) — axum
  app on `127.0.0.1:18000` (override via
  `NEXO_ADMIN_HTTP_BIND`). `GET /healthz` boot probe;
  `POST /api/admin` bearer-protected proxy to the daemon's
  admin RPC table.
- **Auth** — random per-launch password (4 hex groups), HMAC-SHA256
  cookie sessions (24 h TTL). `GET /login` form, `POST /api/login`,
  `POST /api/logout`. Constant-time password compare via `subtle`.
- **Tunnel adapters** — `none` (default, loopback only),
  `cloudflared` (quick tunnel, parses URL from stderr), `tailscale`
  (Serve, parses URL from stdout). Selected via
  `NEXO_ADMIN_TUNNEL=...`. PATH check at boot falls back to
  `none` with a warn log when the requested binary is missing.
- **rust-embed bundle** — frontend `dist/` baked into the binary
  via `#[derive(RustEmbed)]`. SPA fallback to `index.html` for
  unknown paths so React Router deep-links survive a refresh.
  Cache headers: hashed `/assets/*` immutable for a year;
  `index.html` short-cache (60 s, must-revalidate).

#### Frontend

Cloned from `agent-creator-microapp/frontend/`:

- **agents** — full CRUD + workspace per-agent with persona editor
  (IDENTITY / SOUL / USER / AGENTS markdown via
  `@uiw/react-md-editor`), heartbeat indicator, `PairingModal`
  for re-binding WhatsApp, `LlmInstanceCreateModal` (773 LOC
  schema-driven wizard).
- **chats** — transcript viewer with SSE firehose; operator
  takeover (intervene mid-conversation).
- **audit** — paged `microapp_admin_audit` log with filters
  (microapp_id, method, result, since).
- **wizard** — first-run setup (Identity / Soul / Brain / Channel),
  localStorage-backed draft.

New for Phase 90:

- **dashboard** (rail order 10) — overview tiles: agent count,
  LLM provider count, audit RPC calls in last 24 h.
  `Promise.allSettled` so a partial daemon outage degrades
  gracefully (per-tile errors collected into a top warning
  banner).
- **skills** (rail order 30) — list + view + delete agent
  skills. Backed by `nexo/admin/skills/{list,get,delete}`.
- **llm_keys** (rail order 40) — consolidated list + create
  + rotate + delete of LLM provider instances. Reuses
  `LlmInstanceCreateModal` in `editing_id` mode for rotate.
- **channels** (rail order 45) — list + revoke `(agent_id,
  server_name)` MCP channel approvals. Approve flow deferred
  to 0.1.5.
- **memory** (rail order 50) — placeholder (live in 0.1.4).
- **audit** (rail order 60) — see above.
- **plugins** (rail order 70) — placeholder (live in 0.1.3).
- **mcp_servers** (rail order 80) — placeholder (live in 0.1.2).
- **tenants** (rail order 85) — read-only list (write surface
  in 0.1.1).
- **settings** (rail order 90) — operator token rotate
  (`auth_rotate`); broker / system info deferred.

#### Tooling

- `scripts/regen-ts-types.sh` — ts-rs-driven Rust → TS wire
  type generation pipeline cloned from agent-creator.
- `scripts/lint-ts-types-sync.sh` — drift-prevention CI lint.

### Removed (vs cloned baseline)

- `marketing` module (~30 components: AttachmentsPanel,
  BlockPickerModal, ComposeQuickView, EmailTemplate*, etc.).
- 8 marketing-related api wrappers + 5 marketing zustand stores.
- 772 marketing i18n keys per catalog.
- 6 marketing-only npm deps (`@tiptap/*`, `@dnd-kit/*`).
- `RichTextEditor.tsx` (only consumer was the marketing email
  composer).

### Required admin capabilities

The operator must grant these in
`extensions.yaml.admin.capabilities_grant` or the daemon refuses
to spawn the plugin:

`agents_crud`, `skills_crud`, `llm_keys_crud`, `channels_crud`,
`pairing_initiate`, `transcripts_read`, `operator_intervention`,
`escalations_read`, `escalations_resolve`, `audit_read`,
`memory_query`, `memory_snapshot`, `plugin_doctor`,
`tenants_crud`.

Optional (degrade gracefully): `auth_rotate`, `secrets_write`,
`agent_events_subscribe_all`, `credentials_crud`.

[Unreleased]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.5...HEAD
[0.1.5]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.4...nexo-plugin-admin-v0.1.5
[0.1.4]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.3...nexo-plugin-admin-v0.1.4
[0.1.3]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.2...nexo-plugin-admin-v0.1.3
[0.1.2]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.1...nexo-plugin-admin-v0.1.2
[0.1.1]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.0...nexo-plugin-admin-v0.1.1
[0.1.0]: https://github.com/lordmacu/nexo-rs-plugin-admin/releases/tag/nexo-plugin-admin-v0.1.0
