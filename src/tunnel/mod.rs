//! Phase 90.4.24 — tunnel adapter trait + impls.
//!
//! Plugin admin runs loopback by default (`127.0.0.1:18000`).
//! Operators expose it publicly by setting `NEXO_ADMIN_TUNNEL`:
//!   - `none` (default) — no public URL, loopback only.
//!   - `cloudflared`     — spawn `cloudflared tunnel --url`.
//!   - `tailscale`       — spawn `tailscale serve` (preferred).
//!
//! Any spawn failure (binary missing, port already taken,
//! credentials missing) logs a warning + falls back to
//! `none` — operator gets the loopback URL printed at boot.
//! Admin surface == security-sensitive; default-on tunnels
//! are intentionally rejected per OpenClaw
//! `research/docs/web/dashboard.md:32` ("do not expose publicly").

use std::sync::Arc;

use async_trait::async_trait;

pub mod cloudflared;
pub mod none;
pub mod tailscale;

/// What kind of tunnel the operator selected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TunnelKind {
    None,
    Cloudflared,
    Tailscale,
}

impl TunnelKind {
    pub fn from_env() -> Self {
        match std::env::var("NEXO_ADMIN_TUNNEL").ok().as_deref() {
            Some("cloudflared") => Self::Cloudflared,
            Some("tailscale") => Self::Tailscale,
            _ => Self::None,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TunnelError {
    #[error("tunnel binary `{0}` not found in PATH")]
    BinaryMissing(&'static str),
    #[error("tunnel spawn failed: {0}")]
    SpawnFailed(String),
    #[error("tunnel did not advertise a public URL within {0}s")]
    StartupTimeout(u64),
}

/// Handle returned after a tunnel is brought up. `public_url` is
/// `None` for the `none` adapter; `Some(url)` for cloudflared/
/// tailscale. The handle's `Drop` impl is responsible for
/// terminating the child process.
pub struct TunnelHandle {
    pub public_url: Option<String>,
    /// Child process killer. `None` for the `none` adapter.
    pub stop: Option<Box<dyn FnOnce() + Send>>,
}

impl TunnelHandle {
    pub fn loopback_only() -> Self {
        Self {
            public_url: None,
            stop: None,
        }
    }
}

impl Drop for TunnelHandle {
    fn drop(&mut self) {
        if let Some(stop) = self.stop.take() {
            stop();
        }
    }
}

#[async_trait]
pub trait TunnelAdapter: Send + Sync {
    async fn start(&self, local_port: u16) -> Result<TunnelHandle, TunnelError>;
}

/// Resolve the configured adapter. Falls back to `NoneTunnel`
/// when the binary the operator selected is not in PATH.
pub fn from_env() -> Arc<dyn TunnelAdapter> {
    let kind = TunnelKind::from_env();
    match kind {
        TunnelKind::None => Arc::new(none::NoneTunnel),
        TunnelKind::Cloudflared => {
            if cloudflared::CloudflaredTunnel::available() {
                Arc::new(cloudflared::CloudflaredTunnel)
            } else {
                tracing::warn!(
                    "NEXO_ADMIN_TUNNEL=cloudflared but `cloudflared` is not in PATH; \
                     falling back to loopback-only"
                );
                Arc::new(none::NoneTunnel)
            }
        }
        TunnelKind::Tailscale => {
            if tailscale::TailscaleTunnel::available() {
                Arc::new(tailscale::TailscaleTunnel)
            } else {
                tracing::warn!(
                    "NEXO_ADMIN_TUNNEL=tailscale but `tailscale` is not in PATH; \
                     falling back to loopback-only"
                );
                Arc::new(none::NoneTunnel)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tunnel_kind_unset_is_none() {
        std::env::remove_var("NEXO_ADMIN_TUNNEL");
        assert_eq!(TunnelKind::from_env(), TunnelKind::None);
    }

    #[test]
    fn tunnel_kind_cloudflared_parses() {
        std::env::set_var("NEXO_ADMIN_TUNNEL", "cloudflared");
        assert_eq!(TunnelKind::from_env(), TunnelKind::Cloudflared);
        std::env::remove_var("NEXO_ADMIN_TUNNEL");
    }

    #[test]
    fn tunnel_kind_tailscale_parses() {
        std::env::set_var("NEXO_ADMIN_TUNNEL", "tailscale");
        assert_eq!(TunnelKind::from_env(), TunnelKind::Tailscale);
        std::env::remove_var("NEXO_ADMIN_TUNNEL");
    }

    #[test]
    fn tunnel_kind_unknown_is_none() {
        std::env::set_var("NEXO_ADMIN_TUNNEL", "ngrok");
        assert_eq!(TunnelKind::from_env(), TunnelKind::None);
        std::env::remove_var("NEXO_ADMIN_TUNNEL");
    }

    #[tokio::test]
    async fn none_tunnel_returns_loopback_handle() {
        let adapter = none::NoneTunnel;
        let h = adapter.start(18000).await.unwrap();
        assert!(h.public_url.is_none());
        assert!(h.stop.is_none());
    }
}
