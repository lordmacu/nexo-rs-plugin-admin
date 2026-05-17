//! HTTP surface for the onboarding wizard — ported from
//! agent-creator-microapp/src/onboarding/routes.rs.
//!
//! Mounted under the same bearer middleware as `/api/admin`:
//!
//! | Method | Path                              | Purpose                                |
//! |--------|-----------------------------------|----------------------------------------|
//! | GET    | `/api/bootstrap`                  | Empty-state snapshot (cached 5 s).     |
//! | POST   | `/api/onboarding/llm/probe`       | Validate LLM key without leaking it.   |
//! | POST   | `/api/onboarding/llm/save`        | Write secret + upsert provider.        |
//! | POST   | `/api/onboarding/agent/save`      | Create the wizard's first agent.       |
//! | POST   | `/api/onboarding/finish`          | Invalidate bootstrap cache.            |

use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use nexo_microapp_sdk::admin::AdminClient;
use nexo_microapp_sdk::wizard::{probe, ProbeRequest};
use nexo_tool_meta::admin::agents::{AgentDetail, AgentUpsertInput};
use serde::Deserialize;
use serde_json::{json, Value};

use nexo_microapp_http::error::admin_error_to_response;

use super::bootstrap::{new_bootstrap_cache, snapshot, BootstrapCache};
use nexo_tool_meta::admin::credentials::{CredentialsListFilter, CredentialsListResponse};
use nexo_tool_meta::admin::llm_providers::{
    LlmProviderProbeInput, LlmProviderProbeResponse, LlmProviderUpsertInput,
};
use nexo_tool_meta::admin::secrets::{SecretsWriteInput, SecretsWriteResponse};

pub struct OnboardingState {
    pub admin: Arc<AdminClient>,
    pub http: reqwest::Client,
    pub cache: Arc<BootstrapCache>,
}

impl OnboardingState {
    pub fn new(admin: Arc<AdminClient>, http: reqwest::Client) -> Arc<Self> {
        Arc::new(Self {
            admin,
            http,
            cache: new_bootstrap_cache(),
        })
    }
}

pub fn bind_routes(state: Arc<OnboardingState>) -> Router {
    Router::new()
        .route("/api/bootstrap", get(get_bootstrap))
        .route("/api/onboarding/llm/probe", post(post_llm_probe))
        .route("/api/onboarding/llm/save", post(post_llm_save))
        .route("/api/onboarding/agent/save", post(post_agent_save))
        .route("/api/onboarding/finish", post(post_finish))
        .with_state(state)
}

async fn get_bootstrap(State(s): State<Arc<OnboardingState>>) -> Response {
    match snapshot(&s.admin, &s.cache).await {
        Ok(state) => Json(json!({"ok": true, "result": state})).into_response(),
        Err(e) => admin_error_to_response(e),
    }
}

async fn post_llm_probe(
    State(s): State<Arc<OnboardingState>>,
    Json(req): Json<ProbeRequest>,
) -> Response {
    if req.api_key.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({
                "ok": false,
                "error": {
                    "code": "invalid_params",
                    "message": "api_key cannot be empty",
                },
            })),
        )
            .into_response();
    }
    let result = probe(&req, &s.http, None).await;
    Json(json!({"ok": true, "result": result})).into_response()
}

#[derive(Debug, Deserialize)]
pub struct LlmSaveRequest {
    pub provider_id: String,
    pub base_url: String,
    pub api_key_env: String,
    pub api_key_value: String,
}

async fn post_llm_save(
    State(s): State<Arc<OnboardingState>>,
    Json(req): Json<LlmSaveRequest>,
) -> Response {
    if req.api_key_value.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({
                "ok": false,
                "error": {
                    "code": "invalid_params",
                    "message": "api_key_value cannot be empty",
                },
            })),
        )
            .into_response();
    }
    // 1. Persist the secret.
    let secret_input = SecretsWriteInput {
        name: req.api_key_env.clone(),
        value: req.api_key_value,
    };
    let secret_resp: SecretsWriteResponse =
        match s.admin.call("nexo/admin/secrets/write", secret_input).await {
            Ok(r) => r,
            Err(e) => return admin_error_to_response(e),
        };

    // 2. Upsert the provider.
    let upsert_input = LlmProviderUpsertInput {
        id: req.provider_id.clone(),
        base_url: req.base_url,
        api_key_env: req.api_key_env,
        headers: Default::default(),
        tenant_id: None,
        ..Default::default()
    };
    if let Err(e) = s
        .admin
        .call::<_, serde_json::Value>("nexo/admin/llm_providers/upsert", upsert_input)
        .await
    {
        return admin_error_to_response(e);
    }

    // 3. Daemon-side reachability probe (non-blocking).
    let probe_input = LlmProviderProbeInput {
        provider_id: req.provider_id.clone(),
        tenant_id: None,
    };
    let daemon_probe: Option<LlmProviderProbeResponse> = s
        .admin
        .call::<_, LlmProviderProbeResponse>("nexo/admin/llm_providers/probe", probe_input)
        .await
        .ok();

    s.cache.invalidate().await;
    Json(json!({
        "ok": true,
        "result": {
            "secrets_path": secret_resp.path,
            "overwrote_env": secret_resp.overwrote_env,
            "daemon_probe": daemon_probe,
        },
    }))
    .into_response()
}

#[derive(Debug, Deserialize)]
pub struct AgentSaveRequest {
    pub id: String,
    pub model_provider: String,
    pub model_id: String,
    pub system_prompt: String,
    #[serde(default)]
    pub language: Option<String>,
    pub channel: String,
    #[serde(default)]
    pub instance: Option<String>,
}

async fn post_agent_save(
    State(s): State<Arc<OnboardingState>>,
    Json(req): Json<AgentSaveRequest>,
) -> Response {
    let resolved_instance = match req.instance.clone() {
        Some(v) => Some(v),
        None => resolve_default_instance(&s, &req.channel).await,
    };
    let transcripts_dir = default_transcripts_dir(&req.id);
    let upsert = AgentUpsertInput {
        id: req.id,
        model: nexo_tool_meta::admin::agents::ModelRef {
            provider: req.model_provider,
            model: req.model_id,
        },
        allowed_tools: None,
        inbound_bindings: Some(vec![nexo_tool_meta::admin::agents::BindingSummary {
            plugin: req.channel,
            instance: resolved_instance,
        }]),
        system_prompt: Some(req.system_prompt),
        language: req.language,
        active: None,
        transcripts_dir,
        workspace: None,
        extra_docs: None,
        heartbeat: None,
        locale_prompts: None,
    };
    match s
        .admin
        .call::<AgentUpsertInput, AgentDetail>("nexo/admin/agents/upsert", upsert)
        .await
    {
        Ok(agent) => {
            s.cache.invalidate().await;
            Json(json!({"ok": true, "result": agent})).into_response()
        }
        Err(e) => admin_error_to_response(e),
    }
}

async fn post_finish(State(s): State<Arc<OnboardingState>>) -> Response {
    s.cache.invalidate().await;
    Json(json!({"ok": true, "result": Value::Null})).into_response()
}

async fn resolve_default_instance(s: &OnboardingState, channel: &str) -> Option<String> {
    // 1. Credentials already stored by a previous pairing.
    if let Ok(resp) = s
        .admin
        .call::<CredentialsListFilter, CredentialsListResponse>(
            "nexo/admin/credentials/list",
            CredentialsListFilter::default(),
        )
        .await
    {
        if let Some(instance) = resp
            .credentials
            .iter()
            .find(|c| c.channel == channel)
            .and_then(|c| c.instance.clone())
        {
            return Some(instance);
        }
    }
    // 2. Plugin YAML — operator may have set `instance:` explicitly.
    if let Some(instance) = read_plugin_yaml_instance(channel).await {
        return Some(instance);
    }
    // 3. Plugin defaults to `"default"` when no instance is configured.
    // The binding MUST match what the plugin stamps on events.
    Some("default".to_string())
}

fn default_transcripts_dir(agent_id: &str) -> Option<String> {
    let cwd = std::env::current_dir().ok()?;
    let mut cur = Some(cwd);
    for _ in 0..5 {
        let dir = cur.as_ref()?;
        if dir.join("config").join("agents.yaml").is_file() {
            let path = dir.join("data").join("transcripts").join(agent_id);
            return Some(path.to_string_lossy().into_owned());
        }
        cur = dir.parent().map(|p| p.to_path_buf());
    }
    None
}

fn locate_plugin_yaml(start: &std::path::Path, channel: &str) -> Option<std::path::PathBuf> {
    let mut cur = Some(start.to_path_buf());
    for _ in 0..5 {
        let dir = cur.as_ref()?;
        let candidate = dir
            .join("config")
            .join("plugins")
            .join(format!("{channel}.yaml"));
        if candidate.is_file() {
            return Some(candidate);
        }
        cur = dir.parent().map(|p| p.to_path_buf());
    }
    None
}

async fn read_plugin_yaml_instance(channel: &str) -> Option<String> {
    let cwd = std::env::current_dir().ok()?;
    let path = locate_plugin_yaml(&cwd, channel)?;
    let raw = tokio::fs::read_to_string(&path).await.ok()?;
    let doc: serde_yaml::Value = serde_yaml::from_str(&raw).ok()?;
    if let Some(s) = doc
        .get(channel)
        .and_then(|v| v.get("instance"))
        .and_then(|v| v.as_str())
    {
        return Some(s.to_string());
    }
    if let Some(s) = doc
        .get("accounts")
        .and_then(|v| v.as_sequence())
        .and_then(|seq| seq.first())
        .and_then(|v| v.get("instance"))
        .and_then(|v| v.as_str())
    {
        return Some(s.to_string());
    }
    None
}
