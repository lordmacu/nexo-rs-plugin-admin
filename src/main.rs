//! `nexo-plugin-admin` — official admin plugin for the nexo-rs
//! framework (Phase 90.1).
//!
//! Out-of-tree subprocess plugin that combines:
//!   - Phase 81.14 stdio JSON-RPC entrypoint (subprocess spawn,
//!     declared via `[plugin.entrypoint]` in plugin.toml)
//!   - Phase 82.12 `http_server` capability (loopback HTTP for UI)
//!   - Phase 82.10 admin RPC consumer (framework administration
//!     via the SDK's `AdminClient`, accessed through
//!     `Microapp::on_admin_ready`)
//!
//! Replaces the in-tree `proyecto/admin-ui/` (rust-embed baked
//! into the daemon binary). The plugin ships independently —
//! UI changes do not require rebuilding the daemon.
//!
//! Architecture matches `agent-creator-microapp/src/main.rs` —
//! `Microapp` builder (NOT `PluginAdapter`, which is reserved for
//! channel plugins handling broker events without admin RPC).

mod auth;
mod firehose;
mod http;
mod onboarding;
mod tunnel;

use std::sync::Arc;

use nexo_microapp_sdk::{init_logging_from_env, Microapp};

const APP_NAME: &str = "nexo-plugin-admin";

// Bundle the manifest at compile-time so `--print-manifest` (Stage 8
// cargo-install discovery) emits the same TOML the daemon's discovery
// walker would otherwise read from the filesystem. Path matches the
// daemon's accepted filenames (`plugin.toml` OR `nexo-plugin.toml`).
const MANIFEST: &str = include_str!("../plugin.toml");

#[tokio::main]
async fn main() -> nexo_microapp_sdk::Result<()> {
    // Phase 81.20.x admin-Stage-8 — `--print-manifest` flag. When the
    // daemon's binary-mode discovery walker probes us with
    // `nexo-plugin-admin --print-manifest`, we emit the bundled TOML
    // to stdout and exit 0 BEFORE init_logging / HTTP / stdio wiring.
    // Operators `cargo install nexo-plugin-admin` and the daemon's
    // walker registers the plugin automatically — no manifest config
    // edit required.
    nexo_microapp_sdk::plugin::print_manifest_if_requested(MANIFEST);

    init_logging_from_env(APP_NAME);
    tracing::info!(
        server = APP_NAME,
        version = env!("CARGO_PKG_VERSION"),
        "starting"
    );
    spawn_http_and_run_stdio().await
}

/// Boot orchestration mirroring agent-creator-microapp's M2 path.
///
/// HTTP server is OPT-IN: when `NEXO_ADMIN_TOKEN` is unset, the
/// plugin runs stdio-only (legacy mode + integration tests that
/// drive the binary directly). When set, axum binds loopback
/// alongside the dispatch loop. Bind failure (port taken, etc.)
/// is logged but does NOT kill the stdio loop — admin RPC over
/// stdio remains functional.
///
/// `on_admin_ready` fires with the live `AdminClient` right
/// before the dispatch loop owns stdin, so the HTTP task gets
/// a working handle from boot. Both tasks share the same
/// `CancellationToken` — EOF on stdin → cancel HTTP → graceful
/// drain.
async fn spawn_http_and_run_stdio() -> nexo_microapp_sdk::Result<()> {
    let http_cfg = match http::HttpServerConfig::from_env() {
        Ok(c) => Some(c),
        Err(e) => {
            tracing::warn!(
                reason = %e,
                "{} unset; HTTP server disabled (stdio admin RPC still works)",
                http::TOKEN_ENV,
            );
            None
        }
    };

    let shutdown = tokio_util::sync::CancellationToken::new();
    let http_shutdown = shutdown.clone();

    // M2.b — share the live token state between the bearer
    // middleware (HTTP task) and any future rotation listener
    // (drives daemon `auth_rotate` notifications). Phase 90.4
    // wires the rotation listener; v1 just seeds it from env.
    let live_token_state = http_cfg.as_ref().map(|cfg| {
        http::LiveTokenState::from_strings(cfg.token.as_str(), cfg.operator_token_hash.as_str())
    });

    // Phase 90.4 — admin login session: random password per
    // launch + per-launch HMAC secret. Operator copies the
    // password from stderr into the /login form.
    let admin_session = if http_cfg.is_some() {
        let s = auth::AdminSession::new_random();
        // Stderr — daemon stdio bridge folds it into structured
        // logs but we want it human-readable so an operator
        // running the binary directly sees it on screen.
        eprintln!(
            "\n  ════════════════════════════════════════════\n  \
             admin password: {}\n  \
             ════════════════════════════════════════════\n",
            s.password()
        );
        Some(auth::LiveAdminSession::new(s))
    } else {
        None
    };

    // Firehose — build before registering listeners so the
    // `Arc<FirehoseState>` can be cloned into both the notification
    // listener and the HTTP router.
    let firehose = if http_cfg.is_some() {
        match firehose::build().await {
            Ok(h) => Some(h),
            Err(e) => {
                tracing::warn!(error = %e, "firehose build failed; /api/firehose disabled");
                None
            }
        }
    } else {
        None
    };
    let firehose_state = firehose.as_ref().map(|h| std::sync::Arc::clone(&h.state));

    let (admin_tx, admin_rx) =
        tokio::sync::oneshot::channel::<Arc<nexo_microapp_sdk::admin::AdminClient>>();

    // Phase chat-takeover — clone the live operator token hash
    // into the on_admin_ready closure so the AdminClient can
    // stamp it on every OPERATOR_STAMPED_METHODS call
    // (`processing/pause`, `…/resume`, `…/intervention`,
    // `escalations/resolve`). Without this stamp the daemon
    // rejects with `invalid_params: missing field
    // operator_token_hash` and the chat UI's send/pause/resume
    // controls error out for the operator.
    let operator_hash_for_admin = live_token_state.clone();

    let mut app = Microapp::new(APP_NAME, env!("CARGO_PKG_VERSION"))
        .with_admin()
        .on_admin_ready(move |admin| {
            // Wire the SDK's transparent stamp source so every
            // outbound admin call against an operator-stamped
            // method carries the current hash. Cheap to load
            // each time (Arc clone + ArcSwap deref) so rotation
            // takes effect on the next call without a restart.
            if let Some(state) = operator_hash_for_admin.clone() {
                admin.set_operator_token_hash(move || {
                    state.operator_token_hash.load_full().as_ref().clone()
                });
            }
            // Hand the live AdminClient to whoever is awaiting
            // `admin_rx`. Drop on send error — the HTTP task
            // shut down before admin came up.
            let _ = admin_tx.send(admin);
        })
        .on_shutdown(move || {
            let token = http_shutdown.clone();
            async move {
                tracing::info!("admin plugin shutdown handler invoked");
                token.cancel();
            }
        });

    // Register the agent-event notification listener so the firehose
    // store + broadcast receive events emitted by the daemon.
    if let Some(ref fh) = firehose {
        let listener = fh.listener.clone();
        app = app.with_notification_listener(
            nexo_tool_meta::admin::agent_events::AGENT_EVENT_NOTIFY_METHOD,
            move |params| listener(params),
        );
    }

    // Phase 90.x.token-rotated — wire the daemon's
    // `nexo/notify/token_rotated` listener so a remote
    // `auth_rotate` updates BOTH:
    //   - LiveTokenState   — bearer middleware accepts the new
    //                        token on next request (hand-off via
    //                        `nexo_microapp_http::auth::handle_token_rotated`).
    //   - LiveAdminSession — cookie HMAC secret + login password
    //                        rotate atomically. Existing browser
    //                        cookies become invalid because they
    //                        were signed with the old secret;
    //                        operator re-logs in with the new
    //                        password printed to stderr.
    if let (Some(ref state), Some(ref session)) = (&live_token_state, &admin_session) {
        let token_state = Arc::clone(state);
        let live_session = Arc::clone(session);
        app = app.with_notification_listener(
            nexo_tool_meta::http_server::TOKEN_ROTATED_NOTIFY_METHOD,
            move |params| {
                let token_state = Arc::clone(&token_state);
                let live_session = Arc::clone(&live_session);
                tokio::spawn(async move {
                    // Bearer swap (existing helper from
                    // nexo-microapp-http).
                    http::handle_token_rotated(token_state, params).await;
                    // Cookie + password swap. Mints a fresh
                    // AdminSession with a new HMAC secret +
                    // password, atomically replaces the old one.
                    let new_session = auth::AdminSession::new_random();
                    eprintln!(
                        "\n  ════════════════════════════════════════════\n  \
                         admin password (rotated): {}\n  \
                         ════════════════════════════════════════════\n",
                        new_session.password()
                    );
                    let _prev = live_session.swap(new_session);
                    tracing::info!(
                        "auth_rotate: bearer + cookie session rotated; \
                         existing browser sessions invalidated"
                    );
                });
            },
        );
    }

    // HTTP task — only spawned when `NEXO_ADMIN_TOKEN` was set.
    // Awaits the AdminClient from `on_admin_ready`, then runs
    // until shutdown.
    if let (Some(cfg), Some(state), Some(session)) = (http_cfg, live_token_state, admin_session) {
        let shutdown = shutdown.clone();
        let port = cfg.bind.port();
        tokio::spawn(async move {
            let admin = match admin_rx.await {
                Ok(a) => a,
                Err(_) => {
                    tracing::warn!(
                        "admin_ready channel closed before AdminClient was sent; \
                         HTTP task aborting"
                    );
                    return;
                }
            };
            tracing::info!(
                bind = %cfg.bind,
                "spawning admin HTTP task"
            );

            // Build the onboarding wizard state so the SPA can
            // create its first agent, plug in LLM keys, and pair
            // channels through the same bearer-auth'd surface.
            let http_client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new());
            let onboarding_state =
                onboarding::OnboardingState::new(Arc::clone(&admin), http_client);

            // Phase 90.4.24 — opt-in tunnel. None by default
            // (admin = security-sensitive). Operator opts into
            // cloudflared/tailscale via NEXO_ADMIN_TUNNEL.
            let adapter = tunnel::from_env();
            let _tunnel_handle = match adapter.start(port).await {
                Ok(h) => {
                    if let Some(url) = h.public_url.as_ref() {
                        eprintln!(
                            "\n  ════════════════════════════════════════════\n  \
                             admin URL (public): {}\n  \
                             ════════════════════════════════════════════\n",
                            url
                        );
                    } else {
                        eprintln!(
                            "\n  ════════════════════════════════════════════\n  \
                             admin URL: http://127.0.0.1:{}\n  \
                             ════════════════════════════════════════════\n",
                            port
                        );
                    }
                    Some(h)
                }
                Err(e) => {
                    tracing::warn!(error = %e, "tunnel start failed; loopback only");
                    eprintln!(
                        "\n  admin URL: http://127.0.0.1:{} (tunnel disabled: {})\n",
                        port, e
                    );
                    None
                }
            };

            if let Err(e) = http::run(
                cfg,
                admin,
                state,
                session,
                firehose_state,
                Some(onboarding_state),
                shutdown,
            )
            .await
            {
                tracing::error!(error = %e, "admin HTTP task exited with error");
            }
            // _tunnel_handle dropped here — child process killed.
        });
    }

    app.run_stdio().await
}
