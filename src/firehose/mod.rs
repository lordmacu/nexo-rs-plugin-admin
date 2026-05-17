//! Admin-plugin firehose — thin wrapper over
//! `nexo_microapp_sdk::events` pinned to `AgentEventKind`.
//!
//! Mirrors `agent-creator-microapp/src/firehose/mod.rs` with the
//! agent-creator-specific env-var knobs stripped; the admin plugin
//! uses the SDK defaults and reads only `NEXO_EXTENSION_STATE_ROOT`
//! for the DB path (same as agent-creator).

pub mod routes;

use std::path::PathBuf;
use std::sync::Arc;

use axum::routing::get;
use axum::Router;
use nexo_microapp_sdk::events::{
    build_persisting_listener, spawn_sweep_loop, EventBroadcastState, EventStore, SweepConfig,
    SweepHandle, DEFAULT_BROADCAST_CAPACITY, DEFAULT_MAX_ROWS, DEFAULT_RETENTION_DAYS,
    DEFAULT_SWEEP_INTERVAL_SECS, DEFAULT_TABLE,
};
use nexo_tool_meta::admin::agent_events::{AgentEventKind, AGENT_EVENT_NOTIFY_METHOD};
use serde_json::Value;
use tokio_util::sync::CancellationToken;

pub type FirehoseState = EventBroadcastState<AgentEventKind>;

pub struct FirehoseHandle {
    pub state: Arc<FirehoseState>,
    pub listener: Arc<dyn Fn(Value) + Send + Sync>,
    /// Sweep task that prunes stale broadcast slots. Held so the
    /// task lives as long as the handle; not read otherwise.
    #[allow(dead_code)]
    pub sweep_handle: tokio::task::JoinHandle<()>,
    /// Cancellation token the parent uses to ask the sweep task
    /// to shut down on app exit; never read here, only signalled
    /// elsewhere.
    #[allow(dead_code)]
    pub sweep_shutdown: CancellationToken,
}

/// DB path from `NEXO_EXTENSION_STATE_ROOT`; falls back to
/// `./admin-firehose.db` for standalone/dev runs.
fn db_path_from_env() -> PathBuf {
    std::env::var_os("NEXO_EXTENSION_STATE_ROOT")
        .map(|p| PathBuf::from(p).join("admin-firehose.db"))
        .unwrap_or_else(|| PathBuf::from("./admin-firehose.db"))
}

/// Open SQLite store, build broadcast + listener, spawn sweep.
pub async fn build() -> anyhow::Result<FirehoseHandle> {
    let db = db_path_from_env();
    tracing::info!(path = %db.display(), "firehose: opening event store");
    let store = Arc::new(
        EventStore::<AgentEventKind>::open(&db, DEFAULT_TABLE)
            .await
            .map_err(|e| anyhow::anyhow!("firehose store open failed: {e}"))?,
    );
    let state = Arc::new(EventBroadcastState::new(
        Arc::clone(&store),
        DEFAULT_BROADCAST_CAPACITY,
    ));
    let listener =
        build_persisting_listener::<AgentEventKind>(AGENT_EVENT_NOTIFY_METHOD, Arc::clone(&state));
    let SweepHandle { task, shutdown } = spawn_sweep_loop(
        Arc::clone(&store),
        SweepConfig {
            retention_days: DEFAULT_RETENTION_DAYS,
            max_rows: DEFAULT_MAX_ROWS,
            interval_secs: DEFAULT_SWEEP_INTERVAL_SECS,
        },
    );
    Ok(FirehoseHandle {
        state,
        listener,
        sweep_handle: task,
        sweep_shutdown: shutdown,
    })
}

/// Build the axum sub-router. Caller wraps with bearer middleware
/// before merging into the main router.
pub fn bind_routes(state: Arc<FirehoseState>) -> Router {
    Router::new()
        .route("/api/firehose", get(routes::backfill))
        .route("/api/firehose/stream", get(routes::stream))
        .with_state(state)
}
