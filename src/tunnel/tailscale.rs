//! Phase 90.4.24 — Tailscale Serve adapter.
//!
//! Spawns `tailscale serve --bg https://:443/ http://127.0.0.1:<port>`
//! when the operator's tailnet is logged in. Tailscale prints the
//! advertised URL on stdout (e.g. `Available at:
//! https://laptop.tail-scale.ts.net/`).
//!
//! Falls back to `NoneTunnel` via the parent module when
//! `tailscale` is not in PATH.

use std::process::Stdio;
use std::time::Duration;

use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

use super::{TunnelAdapter, TunnelError, TunnelHandle};

const STARTUP_TIMEOUT_SECS: u64 = 15;

pub struct TailscaleTunnel;

impl TailscaleTunnel {
    pub fn available() -> bool {
        let path = match std::env::var_os("PATH") {
            Some(p) => p,
            None => return false,
        };
        for dir in std::env::split_paths(&path) {
            if dir.join("tailscale").is_file() {
                return true;
            }
        }
        false
    }
}

#[async_trait]
impl TunnelAdapter for TailscaleTunnel {
    async fn start(&self, local_port: u16) -> Result<TunnelHandle, TunnelError> {
        let upstream = format!("http://127.0.0.1:{local_port}");
        let mut child = Command::new("tailscale")
            .args(["serve", "--bg", "https://:443/", &upstream])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    TunnelError::BinaryMissing("tailscale")
                } else {
                    TunnelError::SpawnFailed(e.to_string())
                }
            })?;

        let stdout = child.stdout.take().expect("piped");
        let public_url = match timeout(
            Duration::from_secs(STARTUP_TIMEOUT_SECS),
            scan_for_public_url(stdout),
        )
        .await
        {
            Ok(Some(url)) => url,
            Ok(None) | Err(_) => {
                let _ = child.kill().await;
                return Err(TunnelError::StartupTimeout(STARTUP_TIMEOUT_SECS));
            }
        };

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

async fn scan_for_public_url(
    stdout: tokio::process::ChildStdout,
) -> Option<String> {
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    while let Ok(Some(line)) = lines.next_line().await {
        if let Some(idx) = line.find("https://") {
            let tail = &line[idx..];
            let end = tail.find(|c: char| c.is_whitespace());
            let url = match end {
                Some(e) => &tail[..e],
                None => tail,
            };
            if url.ends_with(".ts.net") || url.contains(".ts.net/") {
                return Some(url.trim_end_matches('/').to_string());
            }
        }
    }
    None
}
