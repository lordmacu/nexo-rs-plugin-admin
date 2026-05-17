//! `GET /api/firehose` (backfill) + `GET /api/firehose/stream` (SSE).
//!
//! Adapted from `agent-creator-microapp/src/firehose/routes.rs`.
//! The admin plugin shows events for ALL agents / tenants, so the
//! `accept()` filter defaults to pass-through; optional `agent_id`
//! and `tenant_id` query params narrow the stream for UI panels
//! that focus on a specific agent.

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use async_stream::stream;
use axum::extract::{Query, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::Json;
use futures::Stream;
use nexo_microapp_sdk::events::ListFilter;
use nexo_tool_meta::admin::agent_events::AgentEventKind;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::broadcast::error::RecvError;

use super::FirehoseState;

#[derive(Debug, Deserialize)]
pub struct BackfillQuery {
    pub agent_id: Option<String>,
    pub kind: Option<String>,
    pub tenant_id: Option<String>,
    pub since_ms: Option<u64>,
    pub limit: Option<usize>,
}

pub async fn backfill(
    State(state): State<Arc<FirehoseState>>,
    Query(q): Query<BackfillQuery>,
) -> Json<Value> {
    let filter = ListFilter {
        agent_id: q.agent_id,
        kind: q.kind,
        tenant_id: q.tenant_id,
        since_ms: q.since_ms,
        limit: q.limit.unwrap_or(0),
    };
    match state.store.list(&filter).await {
        Ok(events) => Json(json!({"ok": true, "events": events})),
        Err(e) => {
            tracing::warn!(error = %e, "firehose backfill: store list failed");
            Json(json!({
                "ok": false,
                "error": {"code": "store_list_failed", "message": e.to_string()}
            }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct StreamQuery {
    pub agent_id: Option<String>,
    pub tenant_id: Option<String>,
    // `token` is consumed by the `require_bearer` middleware; it
    // appears here so axum's Query extractor doesn't reject it.
    #[allow(dead_code)]
    pub token: Option<String>,
}

pub async fn stream(
    State(state): State<Arc<FirehoseState>>,
    Query(q): Query<StreamQuery>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let agent_filter = q.agent_id.clone();
    let tenant_filter = q.tenant_id.clone();
    let mut rx = state.broadcast.subscribe();

    let s = stream! {
        // Unblock proxies (cloudflared, Vite dev server) that hold
        // the chunked-transfer pending until the first byte lands.
        // `EventSource.onopen` stays in CONNECTING until a byte
        // arrives; the `:ready` comment fires it immediately.
        yield Ok::<_, Infallible>(Event::default().comment("ready"));
        loop {
            match rx.recv().await {
                Ok(event) => {
                    if !accept(&event, agent_filter.as_deref(), tenant_filter.as_deref()) {
                        continue;
                    }
                    let payload = match serde_json::to_string(&event) {
                        Ok(p) => p,
                        Err(e) => {
                            tracing::warn!(error = %e, "firehose stream: serialize failed; dropping frame");
                            continue;
                        }
                    };
                    yield Ok(Event::default().event("agent_event").data(payload));
                }
                Err(RecvError::Closed) => break,
                Err(RecvError::Lagged(n)) => {
                    yield Ok(Event::default()
                        .event("lagged")
                        .data(format!(r#"{{"dropped":{n}}}"#)));
                }
            }
        }
    };
    Sse::new(s).keep_alive(KeepAlive::new().interval(Duration::from_secs(5)))
}

fn accept(event: &AgentEventKind, agent: Option<&str>, tenant: Option<&str>) -> bool {
    let (ev_agent, ev_tenant): (&str, Option<&str>) = match event {
        AgentEventKind::TranscriptAppended {
            agent_id,
            tenant_id,
            ..
        } => (agent_id, tenant_id.as_deref()),
        AgentEventKind::PendingInboundsDropped { agent_id, .. } => (agent_id, None),
        AgentEventKind::EscalationRequested {
            agent_id,
            tenant_id,
            ..
        } => (agent_id, tenant_id.as_deref()),
        AgentEventKind::EscalationResolved {
            agent_id,
            tenant_id,
            ..
        } => (agent_id, tenant_id.as_deref()),
        AgentEventKind::ProcessingStateChanged {
            agent_id,
            tenant_id,
            ..
        } => (agent_id, tenant_id.as_deref()),
        _ => return true,
    };
    if let Some(a) = agent {
        if a != ev_agent {
            return false;
        }
    }
    if let Some(t) = tenant {
        if Some(t) != ev_tenant {
            return false;
        }
    }
    true
}
