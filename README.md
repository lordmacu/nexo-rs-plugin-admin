# nexo-plugin-admin

Official admin plugin for the [nexo-rs](https://github.com/lordmacu/nexo-rs) framework. Out-of-tree subprocess plugin that hosts a React UI to administer agents, skills, channels, LLM providers, memory, plugins, MCP servers, and observability surfaces.

Replaces the in-tree `proyecto/admin-ui/` (rust-embed baked into the daemon binary) per **Phase 90**. The plugin ships and updates independently from the daemon.

## Architecture

- **Subprocess plugin** (Phase 81.14) — daemon spawns this binary as a child process and drives it via newline-delimited JSON-RPC 2.0 over stdin/stdout.
- **HTTP server capability** (Phase 82.12) — plugin opens a loopback HTTP listener on `127.0.0.1:18000` (default) serving the React bundle.
- **Admin RPC consumer** (Phase 82.10) — `/api/admin` proxy speaks to the daemon's admin RPC table for all CRUD operations.

The frontend is reused verbatim from `agent-creator-microapp/frontend/` (drop the `marketing` module, add framework-admin modules).

## Install

```bash
cargo install nexo-plugin-admin
agent admin                          # daemon spawns plugin + opens browser
```

By default the plugin binds loopback only. To expose publicly via Cloudflare Tunnel:

```bash
NEXO_ADMIN_TUNNEL=cloudflared agent admin
```

Or via Tailscale Serve:

```bash
NEXO_ADMIN_TUNNEL=tailscale agent admin
```

## Capabilities required

The operator must grant these in `extensions.yaml.admin.capabilities_grant`:

- `agents_crud`, `skills_crud`, `llm_keys_crud`
- `channels_crud`, `pairing_initiate`
- `transcripts_read`, `operator_intervention`
- `escalations_read`, `escalations_resolve`
- `audit_read`, `memory_query`, `memory_snapshot`
- `plugin_doctor`, `tenants_crud`

Optional (degrade gracefully when missing): `auth_rotate`, `secrets_write`, `agent_events_subscribe_all`, `credentials_crud`.

## Development

```bash
cargo build --profile release-fast
cd frontend && npm install && npm run dev    # vite dev server with /api proxy
```

## License

MIT OR Apache-2.0.
