# Changelog

All notable changes to `nexo-plugin-admin` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.18] — 2026-05-16

### Added

- **Stage 8 cargo-install ergonomics.**
  `nexo_microapp_sdk::plugin::print_manifest_if_requested(MANIFEST)`
  inserted as the first call of `main()`. The daemon's binary-
  mode discovery walker invokes `nexo-plugin-admin --print-manifest`
  to extract the bundled TOML and register the plugin without
  spawning the full subprocess. Operators install via
  `cargo install nexo-plugin-admin` and the daemon auto-detects
  in `$HOME/.cargo/bin/` — no operator manifest config edit.
- `const MANIFEST: &str = include_str!("../plugin.toml")` bundles
  the manifest at compile-time. Bytes are byte-identical to the
  filesystem-discovered manifest.

### Changed

- Bump version 0.1.17 → 0.1.18 (`Cargo.toml` + `plugin.toml`
  — the manifest version had drifted to 0.1.16 in prior
  releases; this commit aligns it with the package version).

Tracked in upstream `nexo-rs/proyecto/FOLLOWUPS.md` under
"Phase 90 — nexo-plugin-admin":

- E2E test against a running daemon (smoke tests against the
  plugin binary alone shipped in 0.1.9; full daemon-backed
  flow remains).
- Memory snapshot follow-ups: multi-recipient encrypt, streaming
  progress (when p95 > 30s), verify-bundle preview RPC, diff RPC
  from UI, `MemorySnapshotReader` → `MemorySnapshotAdmin` rename
  (next major bump).

## [0.1.11] — 2026-05-10

### Added

- **Manual plugin restart from /m/plugins UI** — Phase 81.21.b.b
  follow-up. New `Restart` icon button per active plugin row in
  `PluginsMain.tsx` opens `RestartPluginModal` (confirm-by-typing
  the plugin id prefix + 60s warning). Calls
  `nexo/admin/plugins/restart { plugin_id }` admin RPC. Operator
  recovery path for `gave_up` state without daemon restart.
  - Distinct from auto-respawn (`crashed`+`respawned` events) —
    publishes `plugin.lifecycle.<id>.restarted_manually` with
    `{plugin_id, previous_uptime_ms, restarted_at_ms, new_pid?}`
    payload.
  - Capability `plugin_restart` (separate from read-only
    `plugin_doctor`).
  - `usePluginsDoctor` store gains `restart` action +
    `restartInFlight` + `lastRestartReport` state.
- New i18n keys `plugins.restart.*` (es + en).
- New `frontend/src/api/plugin_restart.ts` wrapper.
- `frontend/src/api/types.gen.ts` regenerated from
  nexo-tool-meta@0.1.13 (42 → 44 types).

### Changed

- **Cargo deps**: `nexo-tool-meta` 0.1.12 → 0.1.13 (+2 wire types
  for the manual restart RPC).
- **Plugin admin**: 0.1.10 → 0.1.11.

### Note

The official `nexo-rs` daemon needs a `SharedPluginHandles` cell
pattern in main.rs to actually wire the `LivePluginRestarter`
adapter (admin bootstrap runs BEFORE `wire_plugin_registry`).
Until that lands, the daemon returns `plugin restart domain not
configured`. External integrations / forks can construct
`LivePluginRestarter` directly + wire via
`dispatcher.with_plugin_restarter()`.

## [0.1.10] — 2026-05-10

### Added

- **Memory snapshot create + restore admin RPCs** — full module
  surface in `/m/memory` is now create + list + restore + delete,
  closing the last 🟡 follow-up of Phase 90.
  - **`+ Create snapshot` button** opens `CreateSnapshotModal`
    with optional label input + age-encrypt toggle. The toggle
    is disabled (with explanatory tooltip) when the daemon
    reports no `recipients` configured — the toggle availability
    rides on a new `encryption_available: bool` field added to
    the `list_snapshots` response.
  - **`Restore` row action** opens `RestoreSnapshotModal`, a
    2-step flow: (1) "Preview (dry run)" runs the daemon's
    full validation pipeline (tenant + bundle + identity) but
    stops short of mutating, returning a `RestoreReportWire` the
    UI renders as a read-only table; (2) operator confirms by
    typing the snapshot id prefix + clicks "Apply destructively"
    to issue the real restore. The daemon forces
    `auto_pre_snapshot=true` server-side so every apply is
    reversible via the captured pre-restore bundle.
  - **`RestoreReportTable`** renders `from_snapshot_id`,
    `pre_snapshot_id`, `git_reset_oid`, `sqlite_restored_dbs[]`,
    `state_files_restored[]`, and `workers_restarted` so
    operators can audit exactly what each apply touched.
- New i18n keys (es + en) under `memory.snapshots.{create,restore}.*`.

### Changed

- **Cargo deps**: `nexo-tool-meta` 0.1.9 → 0.1.12 (+5 new wire
  types + `MemorySnapshotsListResponse` shape change carrying
  `encryption_available`).
- **`MemorySnapshotsListResponse` SHAPE NOTE**: response is now
  a struct (`{ snapshots, encryption_available }`) instead of a
  bare `Vec<SnapshotMeta>`. The TS interface adds an optional
  `encryption_available?: boolean` so the SPA tolerates older
  daemons (the field defaults to `false`, disabling the encrypt
  toggle).
- **`useMemory` zustand store**: `createNewSnapshot`,
  `runRestore`, `clearLastRestoreReport` actions; new state
  fields `encryptionAvailable`, `lastRestoreReport`,
  `createInFlight`, `restoreInFlight`. `loadSnapshots()` now
  surfaces `encryption_available`.

### Defaults forced server-side (matches daemon contract)

- `redact_secrets = true` — UI download path always runs the
  secret-guard scanner. Operators who want raw bundles still use
  the CLI's `--no-redact`.
- `auto_pre_snapshot = true` — every UI restore is reversible via
  the pre-restore snapshot. CLI keeps `--no-auto-pre-snapshot`.
- `created_by = "admin-ui"` — provenance trace lands in the
  bundle manifest.

### Defensive guards

- Restore by `snapshot_id`, never `bundle_path` — the UI never
  carries a filesystem path. The daemon resolves the bundle via
  its own `list()` lookup before opening, so admin endpoints can't
  be coerced into arbitrary file reads.
- `tenant` REQUIRED on restore. The daemon validates against the
  bundle manifest's recorded tenant and rejects mismatches before
  touching disk; cross-tenant accidents (`staging` ↔ `prod`) are
  caught with both tenants quoted in the error.
- `encrypt=true` with empty recipients = `InvalidParams` rejection
  before reaching the snapshotter.

## [0.1.9] — 2026-05-10

### Added

- **3 e2e smoke tests** in `tests/`:
  - `handshake_smoke::handshake_initialize_returns_manifest_reply`
    — spawns the binary, sends an `initialize` JSON-RPC request,
    verifies `server_info.name`, `server_info.version`, and
    empty `tools[]` (plugin admin doesn't expose tools — it
    consumes them via `AdminClient`).
  - `http_smoke::http_endpoints_respond_correctly` — spawns the
    binary with `NEXO_ADMIN_TOKEN`, asserts `/healthz` 200,
    `/` SPA shell, `/api/admin` 401 without bearer + 401 with
    wrong bearer.
  - `http_smoke::login_form_renders_unauthenticated` — `/login`
    HTML contains the brand string + password input.
- Tests are `#[ignore]` by default (opt-in with
  `cargo test --tests -- --ignored`) so sandboxed CI without
  binary-spawn permission isn't broken.
- README "Testing" section documenting the opt-in flow.

### Changed

- (no behavioral changes vs 0.1.8 — release-only bump for the
  test surface).

## [0.1.8] — 2026-05-10

### Added

- **Snapshot delete button** per row on the `/m/memory` page.
  Confirms with id prefix before calling
  `nexo/admin/memory/delete_snapshot`. Idempotent — operator
  hits the same delete twice without error.
- 2 i18n keys under `memory.snapshots.{delete,delete_confirm}`.

### Changed

- **Shared snapshotter cell** — `LiveMemorySnapshotReader` now
  reads from a shared `Arc<RwLock<Option<Arc<dyn MemorySnapshotter>>>>`
  cell that the daemon's main.rs populates after the late-stage
  snapshotter is built. Lifts the v1 limitation where operators
  with custom `path_resolver` maps saw an empty list — the
  panel now reflects the same `LocalFsSnapshotter` instance the
  agent runtime uses (per-agent memdir overrides + custom
  sqlite roots).
- Bumped daemon dependency floor to `nexo-tool-meta@0.1.11` +
  `nexo-core@0.1.11`.

### Tests

- 12/12 pass — added 5 new (list happy + empty agent + tenant
  default + delete records call + delete rejects empty id).

## [0.1.7] — 2026-05-10

### Added

- **Snapshots panel on `/m/memory`** — when an agent_id is set,
  the page lists existing snapshots (id prefix, label, encrypted
  flag, size in KB, created_at). Up to 5 visible inline; the
  rest collapsed behind "and N more…". Backed by
  `nexo/admin/memory/list_snapshots` (capability
  `memory_snapshot`, Phase 90.x.memory-snapshot).
- 4 i18n keys under `memory.snapshots.*` (es + en).

### Changed

- Bumped daemon dependency floor to `nexo-tool-meta@0.1.10` +
  `nexo-core@0.1.10`.

### Known limitations

- The setup-side adapter uses `DefaultPathResolver` over
  `<state_root>/<agent_id>` layout. Operators with a custom
  `path_resolver` (per-agent memdir map) see an empty list. The
  follow-up that threads the daemon's shared
  `Arc<dyn MemorySnapshotter>` through bootstrap is open in
  upstream FOLLOWUPS.

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

[Unreleased]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.9...HEAD
[0.1.9]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.8...nexo-plugin-admin-v0.1.9
[0.1.8]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.7...nexo-plugin-admin-v0.1.8
[0.1.7]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.6...nexo-plugin-admin-v0.1.7
[0.1.6]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.5...nexo-plugin-admin-v0.1.6
[old-Unreleased]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.5...HEAD
[0.1.5]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.4...nexo-plugin-admin-v0.1.5
[0.1.4]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.3...nexo-plugin-admin-v0.1.4
[0.1.3]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.2...nexo-plugin-admin-v0.1.3
[0.1.2]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.1...nexo-plugin-admin-v0.1.2
[0.1.1]: https://github.com/lordmacu/nexo-rs-plugin-admin/compare/nexo-plugin-admin-v0.1.0...nexo-plugin-admin-v0.1.1
[0.1.0]: https://github.com/lordmacu/nexo-rs-plugin-admin/releases/tag/nexo-plugin-admin-v0.1.0
