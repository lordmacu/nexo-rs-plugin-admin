//! Real bootstrap snapshot — ported from agent-creator-microapp.
//!
//! Replaces the hardcoded `needs_wizard: false` stub in
//! `crate::http::bootstrap`. Fans out to three daemon admin RPCs in
//! parallel behind a 5 s TTL cache so the SPA's repeated polls don't
//! hammer the daemon.

use std::sync::Arc;
use std::time::Duration;

use nexo_microapp_sdk::admin::{AdminClient, AdminError};
use nexo_microapp_sdk::wizard::CachedSnapshot;
use nexo_tool_meta::admin::{
    agents::{AgentsListFilter, AgentsListResponse},
    credentials::{CredentialsListFilter, CredentialsListResponse, CredentialSummary},
    llm_providers::{LlmProvidersListFilter, LlmProvidersListResponse},
};
use serde::Serialize;

const CACHE_TTL: Duration = Duration::from_secs(5);

pub type BootstrapCache = CachedSnapshot<BootstrapState>;

pub fn new_bootstrap_cache() -> Arc<BootstrapCache> {
    CachedSnapshot::new(CACHE_TTL)
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct BootstrapState {
    pub needs_wizard: bool,
    pub has_llm: bool,
    pub has_pairing: bool,
    pub has_agent: bool,
    pub providers: Vec<String>,
    pub paired_devices: Vec<PairedDevice>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct PairedDevice {
    pub channel: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,
    pub agent_ids: Vec<String>,
}

impl From<CredentialSummary> for PairedDevice {
    fn from(c: CredentialSummary) -> Self {
        Self {
            channel: c.channel,
            instance: c.instance,
            agent_ids: c.agent_ids,
        }
    }
}

/// Build the snapshot. Cache-first; on miss fans out to three admin
/// RPCs in parallel.
pub async fn snapshot(
    admin: &AdminClient,
    cache: &BootstrapCache,
) -> Result<BootstrapState, AdminError> {
    cache
        .get_or_compute(|| async {
            let agents_fut = admin.call::<AgentsListFilter, AgentsListResponse>(
                "nexo/admin/agents/list",
                AgentsListFilter::default(),
            );
            let providers_fut = admin.call::<LlmProvidersListFilter, LlmProvidersListResponse>(
                "nexo/admin/llm_providers/list",
                LlmProvidersListFilter::default(),
            );
            let creds_fut = admin.call::<CredentialsListFilter, CredentialsListResponse>(
                "nexo/admin/credentials/list",
                CredentialsListFilter::default(),
            );
            let (agents, providers, creds) =
                tokio::try_join!(agents_fut, providers_fut, creds_fut)?;

            let has_llm = !providers.providers.is_empty();
            let has_agent = !agents.agents.is_empty();
            let paired: Vec<PairedDevice> = creds
                .credentials
                .into_iter()
                .map(PairedDevice::from)
                .collect();
            let has_pairing = !paired.is_empty();

            Ok(BootstrapState {
                needs_wizard: !has_agent,
                has_llm,
                has_pairing,
                has_agent,
                providers: providers.providers.into_iter().map(|p| p.id).collect(),
                paired_devices: paired,
            })
        })
        .await
}
