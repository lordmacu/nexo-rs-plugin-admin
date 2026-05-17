//! Phase 90.4.24 — Cloudflare tunnel adapter.
//!
//! Spawns `cloudflared tunnel --url http://127.0.0.1:<port>`
//! and parses the public URL from stderr. Cloudflared prints
//! something like `Your quick Tunnel has been created! Visit
//! it at: https://random-words.trycloudflare.com` once the
//! tunnel is up — we wait up to 30 s for that line.
//!
//! When `cloudflared` is not in PATH the adapter is never
//! constructed (parent module falls back to `NoneTunnel` with
//! a warn-level log). When it IS in PATH but auth fails or the
//! tunnel never establishes, `start()` returns
//! `TunnelError::StartupTimeout`.

use std::process::Stdio;
use std::time::Duration;

use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

use super::{TunnelAdapter, TunnelError, TunnelHandle};

const STARTUP_TIMEOUT_SECS: u64 = 30;

pub struct CloudflaredTunnel;

impl CloudflaredTunnel {
    /// Quick PATH check used by `tunnel::from_env` before
    /// constructing the adapter.
    pub fn available() -> bool {
        which("cloudflared")
    }
}

#[async_trait]
impl TunnelAdapter for CloudflaredTunnel {
    async fn start(&self, local_port: u16) -> Result<TunnelHandle, TunnelError> {
        let url = format!("http://127.0.0.1:{local_port}");
        let mut child = Command::new("cloudflared")
            .args([
                "tunnel",
                "--url",
                &url,
                "--no-autoupdate",
                "--logfile",
                "/dev/null",
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    TunnelError::BinaryMissing("cloudflared")
                } else {
                    TunnelError::SpawnFailed(e.to_string())
                }
            })?;

        let stderr = child.stderr.take().expect("piped");
        let public_url = match timeout(
            Duration::from_secs(STARTUP_TIMEOUT_SECS),
            scan_for_public_url(stderr),
        )
        .await
        {
            Ok(Some(url)) => url,
            Ok(None) | Err(_) => {
                let _ = child.kill().await;
                return Err(TunnelError::StartupTimeout(STARTUP_TIMEOUT_SECS));
            }
        };

        // Move ownership of the child into the stop closure so
        // the Drop impl on TunnelHandle terminates it.
        let mut child_opt = Some(child);
        let stop: Box<dyn FnOnce() + Send> = Box::new(move || {
            if let Some(mut c) = child_opt.take() {
                let _ = c.start_kill();
            }
        });
        Ok(TunnelHandle {
            public_url: Some(public_url),
            stop: Some(stop),
        })
    }
}

async fn scan_for_public_url(stderr: tokio::process::ChildStderr) -> Option<String> {
    let reader = BufReader::new(stderr);
    let mut lines = reader.lines();
    while let Ok(Some(line)) = lines.next_line().await {
        // Cloudflared prints multiple https:// links in its
        // banner (terms of service, docs). The actual tunnel URL
        // ALWAYS lives under `*.trycloudflare.com` for quick
        // tunnels and `*.cfargotunnel.com` for named tunnels;
        // match those domains explicitly to skip the banner noise.
        if let Some(idx) = find_tunnel_url(&line) {
            return Some(idx);
        }
    }
    None
}

fn find_tunnel_url(line: &str) -> Option<String> {
    for marker in [".trycloudflare.com", ".cfargotunnel.com"] {
        if let Some(end_idx) = line.find(marker) {
            // Walk backwards from the marker to the start of
            // the URL (https://).
            if let Some(start) = line[..end_idx].rfind("https://") {
                let after_marker = end_idx + marker.len();
                // Take everything until the next whitespace /
                // pipe / closing paren.
                let tail = &line[after_marker..];
                let extra = tail
                    .find(|c: char| c.is_whitespace() || c == '|' || c == ')')
                    .unwrap_or(tail.len());
                return Some(line[start..after_marker + extra].to_string());
            }
        }
    }
    None
}

fn which(bin: &str) -> bool {
    let path = match std::env::var_os("PATH") {
        Some(p) => p,
        None => return false,
    };
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(bin);
        if candidate.is_file() {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    // `sh` is only guaranteed on POSIX. Windows agent runners have no
    // `sh` on PATH so skip the test there.
    #[cfg(unix)]
    #[test]
    fn which_recognises_a_real_binary() {
        assert!(which("sh"));
    }

    #[test]
    fn which_rejects_unknown_binary() {
        assert!(!which("nexo-bogus-binary-xyz"));
    }

    #[test]
    fn find_tunnel_url_picks_trycloudflare_over_banner() {
        let line = "Visit https://www.cloudflare.com/website-terms/ before going public";
        assert_eq!(find_tunnel_url(line), None);

        let line = "|  https://random-fox-name.trycloudflare.com  |";
        assert_eq!(
            find_tunnel_url(line),
            Some("https://random-fox-name.trycloudflare.com".to_string()),
        );
    }

    #[test]
    fn find_tunnel_url_handles_named_tunnels() {
        let line = "Tunnel ready: https://prod.cfargotunnel.com still working";
        assert_eq!(
            find_tunnel_url(line),
            Some("https://prod.cfargotunnel.com".to_string()),
        );
    }

    #[test]
    fn find_tunnel_url_returns_none_for_unrelated_https() {
        let line = "ERR  Visit https://docs.cloudflare.com/argo for details";
        assert_eq!(find_tunnel_url(line), None);
    }
}
