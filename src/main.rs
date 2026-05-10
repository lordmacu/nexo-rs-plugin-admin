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

mod http;

use std::sync::Arc;

use nexo_microapp_sdk::{init_logging_from_env, Microapp};

const APP_NAME: &str = "nexo-plugin-admin";

#[tokio::main]
async fn main() -> nexo_microapp_sdk::Result<()> {
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

    let (admin_tx, admin_rx) =
        tokio::sync::oneshot::channel::<Arc<nexo_microapp_sdk::admin::AdminClient>>();

    let app = Microapp::new(APP_NAME, env!("CARGO_PKG_VERSION"))
        .with_admin()
        .on_admin_ready(move |admin| {
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

    // HTTP task — only spawned when `NEXO_ADMIN_TOKEN` was set.
    // Awaits the AdminClient from `on_admin_ready`, then runs
    // until shutdown.
    if let (Some(cfg), Some(state)) = (http_cfg, live_token_state) {
        let shutdown = shutdown.clone();
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
            if let Err(e) = http::run(cfg, admin, state, shutdown).await {
                tracing::error!(error = %e, "admin HTTP task exited with error");
            }
        });
    }

    app.run_stdio().await
}
