//! `GET /api/bootstrap` — SPA initial state.
//!
//! The admin plugin is a management UI, not an onboarding flow.
//! Always returns `needs_wizard: false` so the SPA goes straight
//! to the dashboard. The real per-field values (has_llm, has_agent,
//! etc.) are populated lazily by the individual dashboard modules
//! via admin RPC; this response just unblocks the initial render.

use axum::Json;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct BootstrapResult {
    pub needs_wizard: bool,
    pub has_llm: bool,
    pub has_pairing: bool,
    pub has_agent: bool,
    pub providers: Vec<String>,
    pub paired_devices: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct BootstrapEnvelope {
    pub ok: bool,
    pub result: BootstrapResult,
}

pub async fn handler() -> Json<BootstrapEnvelope> {
    Json(BootstrapEnvelope {
        ok: true,
        result: BootstrapResult {
            needs_wizard: false,
            has_llm: false,
            has_pairing: false,
            has_agent: false,
            providers: vec![],
            paired_devices: vec![],
        },
    })
}
