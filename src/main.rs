//! `nexo-plugin-admin` — official admin plugin for the nexo-rs
//! framework (Phase 90.1).
//!
//! Out-of-tree subprocess plugin that combines:
//!   - Phase 81.14 stdio JSON-RPC entrypoint (subprocess spawn)
//!   - Phase 82.12 `http_server` capability (loopback HTTP for UI)
//!   - Phase 82.10 admin RPC consumer (framework administration)
//!
//! Replaces the in-tree `proyecto/admin-ui/` (rust-embed baked
//! into the daemon binary). The plugin ships independently —
//! UI changes do not require rebuilding the daemon.
//!
//! Wire format spec: workspace root `nexo-plugin-contract.md`.
//! Reference SDK: `nexo_microapp_sdk::plugin::PluginAdapter`.

mod http;

use nexo_microapp_sdk::plugin::PluginAdapter;

const MANIFEST: &str = include_str!("../plugin.toml");

const APP_NAME: &str = "nexo-plugin-admin";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Stderr logging — daemon's stdio→tracing bridge (Phase
    // 81.23, pending) folds this into the operator's structured
    // log stream. Until then it's debug visibility for operators
    // running the binary directly.
    init_logging();
    tracing::info!(server = APP_NAME, version = env!("CARGO_PKG_VERSION"), "starting");

    PluginAdapter::new(MANIFEST)?
        .on_shutdown(|| async {
            tracing::info!("admin plugin shutdown handler invoked");
            Ok(())
        })
        .run_stdio()
        .await?;
    Ok(())
}

fn init_logging() {
    use tracing_subscriber::EnvFilter;
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_target(false)
        .with_env_filter(filter)
        .init();
}
