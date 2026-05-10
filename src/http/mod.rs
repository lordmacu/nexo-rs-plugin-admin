//! Phase 90.1 — HTTP server scaffold for the admin plugin.
//!
//! axum app on `127.0.0.1:18000` (default) exposing:
//!   - `GET /healthz` (unauthenticated) — boot supervisor probe.
//!   - `POST /api/admin` (bearer auth) — catch-all proxy to
//!     `nexo/admin/*` via the SDK's `AdminClient`.
//!   - `GET /` + `/assets/*` (Phase 90.2 — pending) — React bundle.
//!
//! Stays loopback-only by contract — the framework's
//! `HttpServerCapability` boot validator rejects anything else
//! unless the operator flips `allow_external_bind`.
//!
//! Phase 82.10.m.c — the reusable scaffolding (bearer middleware,
//! admin proxy, error mapping) lives in `nexo-microapp-http`.
//! This module owns the plugin-specific composition: env-var names,
//! default bind/port, healthz, and the `build_router` that wires
//! the pieces together.
//!
//! Lifted from agent-creator-microapp/src/http/mod.rs (Phase 82.10.m.c)
//! with the optional state extensions stripped — the admin plugin
//! v1 surface is just healthz + admin proxy. Static asset serving
//! lands in 90.2 alongside the React bundle.

pub mod healthz;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::middleware::from_fn_with_state;
use axum::routing::{get, post};
use axum::Router;
use nexo_microapp_http::admin_proxy::{handler as admin_handler, AdminProxyState};
use nexo_microapp_http::auth::require_bearer;
use nexo_microapp_sdk::admin::AdminClient;
use tokio_util::sync::CancellationToken;
use tower_http::limit::RequestBodyLimitLayer;

// Re-export the live-token primitives so future modules
// (rotate UI, login form) keep importing `crate::http::LiveTokenState`.
pub use nexo_microapp_http::auth::{handle_token_rotated, token_hash, LiveTokenState};

const BODY_LIMIT_BYTES: usize = 1 << 20; // 1 MiB

/// Env var carrying the bearer token. MUST match
/// `plugin.toml#[plugin.capabilities.http_server].token_env`.
pub const TOKEN_ENV: &str = "NEXO_ADMIN_TOKEN";
/// Optional bind override (e.g. `"127.0.0.1:9000"`); default is
/// `127.0.0.1:18000` to match the manifest.
pub const BIND_ENV: &str = "NEXO_ADMIN_HTTP_BIND";
/// Optional health endpoint path override; default `/healthz`.
pub const HEALTH_PATH_ENV: &str = "NEXO_ADMIN_HEALTH_PATH";

const DEFAULT_BIND: &str = "127.0.0.1:18000";
const DEFAULT_HEALTH_PATH: &str = "/healthz";

/// Resolved HTTP server config. Built once at boot from process
/// env. `LiveTokenState` (Arc-swapped, hot-rotatable) holds the
/// runtime-mutable bearer + operator-hash; this struct is the
/// boot snapshot used to seed it.
#[derive(Clone)]
pub struct HttpServerConfig {
    pub bind: SocketAddr,
    pub health_path: String,
    /// Wrapped in Arc so handlers reference the same allocation
    /// without cloning the string per request. Never `Debug`-leaked.
    pub token: Arc<String>,
    /// `token_hash(token)` precomputed at boot. Bit-parity with
    /// `nexo_setup::http_supervisor::token_hash` (audit identity
    /// matches across plugin ↔ daemon).
    pub operator_token_hash: Arc<String>,
}

impl std::fmt::Debug for HttpServerConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HttpServerConfig")
            .field("bind", &self.bind)
            .field("health_path", &self.health_path)
            .field("token", &"<redacted>")
            .field("operator_token_hash", &"<16-char-redacted>")
            .finish()
    }
}

impl HttpServerConfig {
    /// Read config from process env. Fails fast on missing /
    /// empty token (defense-in-depth).
    pub fn from_env() -> anyhow::Result<Self> {
        let token = std::env::var(TOKEN_ENV)
            .map_err(|_| anyhow::anyhow!("{TOKEN_ENV} unset; refusing to start HTTP server"))?;
        if token.is_empty() {
            anyhow::bail!("{TOKEN_ENV} is empty; refusing to start HTTP server");
        }
        let bind_str = std::env::var(BIND_ENV).unwrap_or_else(|_| DEFAULT_BIND.into());
        let bind: SocketAddr = bind_str
            .parse()
            .map_err(|e| anyhow::anyhow!("{BIND_ENV} `{bind_str}` invalid: {e}"))?;
        let health_path =
            std::env::var(HEALTH_PATH_ENV).unwrap_or_else(|_| DEFAULT_HEALTH_PATH.into());
        let operator_token_hash = Arc::new(token_hash(&token));
        let token = Arc::new(token);
        Ok(Self {
            bind,
            health_path,
            token,
            operator_token_hash,
        })
    }
}

/// Build the axum router. Public for integration tests; the
/// production path goes through [`run`].
pub fn build_router(
    cfg: &HttpServerConfig,
    admin: Arc<AdminClient>,
    live_token_state: Arc<LiveTokenState>,
) -> Router {
    // M2.b — caller-supplied so the listener registered in
    // `main.rs` writes to the SAME `Arc<LiveTokenState>` that the
    // bearer middleware + admin handler read from. Without this
    // shared Arc, rotations would land on a separate copy and
    // never propagate to in-flight HTTP traffic.
    let bearer_state = Arc::clone(&live_token_state);
    let admin_state = Arc::new(AdminProxyState { admin });
    let protected = Router::new()
        .route("/api/admin", post(admin_handler))
        .with_state(admin_state)
        .layer(from_fn_with_state(bearer_state, require_bearer))
        .layer(RequestBodyLimitLayer::new(BODY_LIMIT_BYTES));
    Router::new()
        .route(&cfg.health_path, get(healthz::handler))
        .merge(protected)
}

/// Bind, listen, drain on shutdown. Used as a `tokio::spawn`'d
/// task alongside the SDK's `run_stdio()` loop. Returns `Err`
/// only on bind failure (axum's serve never returns Err post-bind
/// in this configuration).
pub async fn run(
    cfg: HttpServerConfig,
    admin: Arc<AdminClient>,
    live_token_state: Arc<LiveTokenState>,
    shutdown: CancellationToken,
) -> anyhow::Result<()> {
    let router = build_router(&cfg, admin, live_token_state);
    let listener = tokio::net::TcpListener::bind(cfg.bind)
        .await
        .map_err(|e| anyhow::anyhow!("bind failed for {}: {e}", cfg.bind))?;
    tracing::info!(
        bind = %cfg.bind,
        health = %cfg.health_path,
        "http server listening (loopback)",
    );
    axum::serve(listener, router)
        .with_graceful_shutdown(async move { shutdown.cancelled().await })
        .await
        .map_err(|e| anyhow::anyhow!("axum serve failed: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn isolated_env<F: FnOnce() -> R, R>(f: F) -> R {
        // Process env is global; serialise across tests.
        static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
        let _g = LOCK.lock().unwrap();
        std::env::remove_var(TOKEN_ENV);
        std::env::remove_var(BIND_ENV);
        std::env::remove_var(HEALTH_PATH_ENV);
        let out = f();
        std::env::remove_var(TOKEN_ENV);
        std::env::remove_var(BIND_ENV);
        std::env::remove_var(HEALTH_PATH_ENV);
        out
    }

    #[test]
    fn from_env_fails_when_token_unset() {
        isolated_env(|| {
            assert!(HttpServerConfig::from_env().is_err());
        });
    }

    #[test]
    fn from_env_redacts_secret_in_debug() {
        isolated_env(|| {
            std::env::set_var(TOKEN_ENV, "super-secret");
            let cfg = HttpServerConfig::from_env().unwrap();
            let s = format!("{cfg:?}");
            assert!(!s.contains("super-secret"));
            assert!(!s.contains(cfg.operator_token_hash.as_str()));
        });
    }

    #[test]
    fn from_env_computes_stable_operator_token_hash() {
        isolated_env(|| {
            std::env::set_var(TOKEN_ENV, "super-secret");
            let cfg_a = HttpServerConfig::from_env().unwrap();
            std::env::remove_var(TOKEN_ENV);
            std::env::set_var(TOKEN_ENV, "super-secret");
            let cfg_b = HttpServerConfig::from_env().unwrap();
            assert_eq!(cfg_a.operator_token_hash.len(), 16);
            assert_eq!(cfg_a.operator_token_hash, cfg_b.operator_token_hash);
            assert_eq!(
                cfg_a.operator_token_hash.as_str(),
                token_hash("super-secret")
            );
        });
    }
}
