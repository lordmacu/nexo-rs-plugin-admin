# Agent Creator — React UI

WhatsApp Web–style operator console for the Agent Creator
microapp. Vite + React 18 + TypeScript + Tailwind v3 + Zustand.

## Dev workflow

```bash
# T1 — backend (Rust microapp)
export AGENT_CREATOR_TOKEN=$(openssl rand -hex 32)
cd ..   # repo root
cargo run --bin agent-creator

# T2 — frontend (Vite dev server, proxies /api/* → :8765)
cd frontend
npm install   # first run only
npm run dev
# http://127.0.0.1:5173
```

Paste the same token from `AGENT_CREATOR_TOKEN` into the login
form.

## Production build

```bash
npm run build   # → dist/
```

The dist/ directory is mounted by the Rust backend in M2.c
(`tower_http::ServeDir`) so production runs as a single process
on `127.0.0.1:8765`.

## Smoke checklist

After `npm run dev` + backend running with token:

1. ☐ `/login` shows token form; paste valid token → redirects to `/chat`.
2. ☐ Wrong token → toast "Token rejected" + stays on `/login`.
3. ☐ `/chat` sidebar lists existing conversations from backfill.
4. ☐ Click a conversation → bubbles render in main panel.
5. ☐ New incoming message → live update via SSE (no page refresh).
6. ☐ Type in input bar → Send → bubble appears (own message).
7. ☐ Pause → conversation header shows yellow "Paused" banner; agent stops responding.
8. ☐ Resume → banner clears.
9. ☐ Pending escalation → orange badge in header.
10. ☐ Backend offline → red top banner "Backend unreachable" + retries.
11. ☐ Browser refresh → still logged in (token persisted), backfill re-seeds.

## M7.cmdk — command palette smoke

Goal: Cmd+K (or Ctrl+K) anywhere in the dashboard opens a modal that filters conversations + actions; Enter dispatches.

1. ☐ Press **Cmd+K** (macOS) or **Ctrl+K** (Linux/Windows) anywhere in the dashboard. Modal opens centered with input focused.
2. ☐ Press **Esc** → modal closes; focus returns to whatever held it before.
3. ☐ Type `ana` → conversation list narrows to conversations whose label/preview/agent matches. Use ↑/↓ to navigate.
4. ☐ Press **Enter** on a conversation row → modal closes, route changes to `/chat/:key`.
5. ☐ Open modal again, type `pausa` → "Pausar conversación activa" rises to top.
6. ☐ Press **Enter** → admin RPC fires; pause indicator appears in chat header; modal closes.
7. ☐ Open modal with no conversation active (operator on /chat with no `:key`) → "Pausar conversación activa" hidden.
8. ☐ **Cmd+K** twice → toggles closed (idempotent).
9. ☐ Open modal on `/login` → modal does NOT render (RequireAuth gate).
10. ☐ Type `?` → "Mostrar atajos de teclado" → press **Enter** → inline shortcuts panel renders inside the modal; click "← Volver a la lista" to return.
11. ☐ Open modal, click outside → closes (backdrop click).
12. ☐ Open modal, click "Crear nuevo agente" → wizard mounts (even when an agent already exists); skips to Step 3 (Agente) when a paired device is present, else runs normal flow.

## M9.b — pairing SSE push smoke

Goal: replace 3s polling with sub-second push, polling fallback at 5s.

1. ☐ Open DevTools → Network tab. Boot wizard, advance to Step 2 (WhatsApp pairing). Click "Generar código QR".
2. ☐ Network tab shows two long-lived requests:
   - `pairing/start` (POST /api/admin) — fires once.
   - `pairing/stream` (GET /api/pairing/stream?challenge_id=…&token=…) — opens as `eventsource` / `text/event-stream`; stays open.
   - `pairing/status` (POST /api/admin) — fires every 5s as fallback.
3. ☐ Scan QR → state flips through QR ready → awaiting user → linked. State updates land via SSE within ~100 ms (faster than 5s polling).
4. ☐ DevTools → Application tab → close the SSE EventSource manually (or kill the network) → wizard keeps progressing via 5s polling fallback.
5. ☐ Hit the `Linked` state → SSE connection closes (server-side terminal close); wizard auto-advances to Step 3.

## M9.c — persona template library smoke

Goal: first-run operator picks a use-case ("Soporte general", "Ventas", "FAQ bot", …) and the system_prompt textarea pre-fills with a curated prompt.

1. ☐ Boot wizard fresh → advance to Step 3 (Agent). Plantilla dropdown defaults to "Soporte general"; description below; textarea pre-filled with that template's prompt.
2. ☐ Pick "Ventas / calificador de leads" → textarea contents replaced with the sales prompt; description updates.
3. ☐ Type custom edits in the textarea → dropdown auto-flips to "Personalizado" (exact-string match falls through).
4. ☐ Pick "FAQ bot" → textarea overwritten; previous edits gone (no warning by design — operator uses "Personalizado" to start blank).
5. ☐ Pick "Personalizado" → textarea cleared; submit → inline validation "necesita al menos 10 caracteres".
6. ☐ Type 10+ chars under "Personalizado" → submit succeeds.
7. ☐ Reload tab mid-Step-3 → wizard resumes; dropdown reflects whichever template the stored prompt matches (or "Personalizado" for custom edits).
8. ☐ All 6 named templates render in the dropdown plus "Personalizado".

## M7.notify — desktop notifications smoke

Goal: alert the operator when a new user message or escalation arrives while the tab is hidden.

1. ☐ Login → click first chat. Browser asks notification permission. Allow.
2. ☐ Switch to another tab (`document.visibilityState === "hidden"`). Send a WhatsApp message to the paired number.
3. ☐ OS notification appears with contact label as title + first 120 chars of message body.
4. ☐ Click notification → dashboard tab focuses, conversation opens at `/chat/:key`.
5. ☐ Send a 2nd message to the SAME chat → 2nd notification REPLACES the 1st (tag-based dedup; OS notification center keeps only the latest).
6. ☐ Trigger an escalation → notification with `Escalación: <agent_id>` title + summary body.
7. ☐ Switch back to dashboard tab. Send another message → no notification (tab visible).
8. ☐ Operator-side intervention reply via the chat input → no notification (sender_id prefixed `operator:` filters out).
9. ☐ Fresh browser profile → click "Block" on permission prompt → no further prompts; reload page → no prompt either (localStorage `agent-creator:notify:denied:v1` flag).
10. ☐ Browser without `Notification` API (e.g. iOS WebView) → no console errors; everything else works.

## M2.b — token hot-swap smoke

Goal: rotate the bearer without restarting the microapp.

1. ☐ Boot microapp with `AGENT_CREATOR_TOKEN=token-A`. Confirm the SPA logs in successfully with that value.
2. ☐ Daemon-side: rotate the operator token (operator UI / admin RPC / future M9.frame.a) so daemon emits `nexo/notify/token_rotated { old_hash: sha256("token-A")[..16], new: "token-B" }` to the microapp's stdio.
3. ☐ Observe microapp log line `bearer token rotated successfully`.
4. ☐ Browser holding `token-A` → next API call returns 401 → existing `authedFetch` 401 handler logs the operator out + redirects to `/login`.
5. ☐ Login with `token-B` → access restored. No microapp restart.
6. ☐ Stale notification (wrong `old_hash`) → log line `token_rotated: hash mismatch — ignoring`; bearer unchanged.

## M4.b — firehose retention sweep smoke

Default retention: 90 days, 100 000 row cap, sweep every 6 h.
Override via env on the microapp process:

- `AGENT_CREATOR_FIREHOSE_RETENTION_DAYS=30`
- `AGENT_CREATOR_FIREHOSE_MAX_ROWS=10000`
- `AGENT_CREATOR_FIREHOSE_SWEEP_INTERVAL_SECS=300`  (5 min for fast feedback)

1. ☐ Boot microapp with env overrides above. Log line on startup:
   `firehose sweep (eager) ran deleted=…` (zero on a fresh DB).
2. ☐ Generate firehose load (e.g. send WhatsApp messages or use a load script). Verify rows accumulate via `sqlite3 firehose.db 'SELECT count(*) FROM firehose_events'`.
3. ☐ Wait for the next sweep interval (or restart microapp). Log line:
   `firehose sweep ran deleted=N` where N matches the rows older than retention OR overflow over `max_rows`.
4. ☐ Set `AGENT_CREATOR_FIREHOSE_RETENTION_DAYS=0 AGENT_CREATOR_FIREHOSE_MAX_ROWS=0` → no rows ever pruned (operator escape hatch).
5. ☐ Set `AGENT_CREATOR_FIREHOSE_SWEEP_INTERVAL_SECS=0` → eager-only mode (sweep at boot, no interval thereafter).

## M2.c — single-process production smoke

Run the microapp + SPA together on one port (no Vite dev server):

1. `npm run build` in `frontend/` → produces `dist/index.html` + `dist/assets/index-<hash>.{js,css}`.
2. `AGENT_CREATOR_FRONTEND_DIST=$(pwd)/frontend/dist AGENT_CREATOR_TOKEN=<token> cargo run --bin agent-creator`.
3. ☐ `curl -s http://127.0.0.1:8765/` → 200 + HTML containing the SPA shell.
4. ☐ `curl -s http://127.0.0.1:8765/login` → 200 + same HTML (SPA fallback for client-side routes).
5. ☐ `curl -s -i http://127.0.0.1:8765/api/unknown` → 404 (NOT 200 with the SPA — API contract integrity).
6. ☐ `curl -s --compressed -i http://127.0.0.1:8765/assets/index-*.js` → response carries `content-encoding: gzip`, payload ≈ 70 KB (vs ~240 KB uncompressed).
7. ☐ `curl -s -H "Authorization: Bearer wrong" http://127.0.0.1:8765/api/admin -d '{"method":"nexo/admin/agents/list","params":{}}'` → 401 (bearer still gated; static fallback doesn't bypass auth on `/api/*`).
8. ☐ Open `http://127.0.0.1:8765/` in a browser → SPA loads, login flow works end-to-end (no Vite running).

## M7.c — server-stamped operator_token_hash smoke

1. ☐ DevTools → Network tab → click "Resume" on a paused chat → request body to `/api/admin` does **not** contain an `operator_token_hash` field. Daemon's audit row still records the same hash as before M7.c (server-stamped at the proxy).
2. ☐ Click "Send" via the chat InputBar → `/api/admin` request for `processing/intervention` body has no `operator_token_hash`; daemon receives one (server-stamped).
3. ☐ Search the JS bundle (DevTools → Sources) for `crypto.subtle.digest("SHA-256",`; should not match — both client-side `tokenHash` helpers were removed.

## M7.search.local — sidebar filter smoke

1. ☐ Type `ana` in the sidebar input → list narrows to rows whose label / preview / agent_id contains `ana`.
2. ☐ Type `xxxnomatchxxx` → "Sin resultados" empty state with "Limpiar búsqueda" button.
3. ☐ Click "Limpiar búsqueda" → list restored, input cleared.
4. ☐ Press `Esc` while focused on input → query clears, input loses focus.
5. ☐ Press `/` while focus is in `<body>` → input gains focus (no `/` character lands).
6. ☐ Press `/` while typing in the chat reply InputBar → `/` lands as text in InputBar, no hijack.
7. ☐ Type `josé` then `jose` → both match a row labelled `José` (diacritic-insensitive).
8. ☐ Type `ana wha` → AND across tokens (row must match both fragments across any field).
9. ☐ Receive a new WhatsApp message in a chat hidden by the filter; if the new preview matches the query, row pops in; otherwise stays hidden.

## M9 — onboarding wizard smoke

Run against an empty daemon (no agents in `agents.yaml`):

1. ☐ Login → wizard appears (no flash-redirect to dashboard).
2. ☐ Step 0 (Welcome) → click "Empezar".
3. ☐ Step 1 (LLM):
   - ☐ Bad key → "Probar" returns red error (text never echoes the key).
   - ☐ Good key → green check + "Guardar proveedor" enabled.
   - ☐ Save → instruction card with `export MINIMAX_API_KEY=...` line appears.
   - ☐ Add the env var to the daemon's launcher, restart `cargo run --bin agent-creator`.
   - ☐ Click "Daemon listo, continuar" → advance.
4. ☐ Step 2 (WhatsApp):
   - ☐ Click "Generar QR" → image renders within 2 s.
   - ☐ Scan with WhatsApp app → state flips through `qr_ready` → `awaiting_user` → `linked`.
   - ☐ Auto-advance ~1 s after Linked.
5. ☐ Step 3 (Agent):
   - ☐ Invalid id (uppercase / spaces) → inline validation message, submit blocked.
   - ☐ Valid form → submit succeeds, advance to Step 4.
6. ☐ Step 4 (Done) → "Ir al dashboard" → wizard exits, dashboard renders empty conversation list.
7. ☐ Tab close + reopen mid-flow → wizard resumes at the same step (raw API key cleared, has to be re-entered).
8. ☐ Send a WhatsApp message to the paired number → conversation appears live in dashboard.
9. ☐ "Empezar de nuevo" footer button → confirm dialog → wipes draft + returns to Step 0.

## Stack pinned

- Vite ^5.4
- React ^18.3
- React Router ^6.27
- TypeScript ^5.6 strict
- Tailwind ^3.4
- Zustand ^5
- Lucide icons
- date-fns ^4.1
