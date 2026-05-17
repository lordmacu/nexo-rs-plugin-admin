//! `GET /api/auth/token` — zero-friction first-run auto-login.
//!
//! When `NEXO_ADMIN_AUTH_STRICT` is unset (the default), the endpoint
//! returns the current bearer token so the React SPA can auto-login
//! without operator copy-paste. This is safe because the HTTP server
//! only binds loopback (`127.0.0.1`) by contract — no external actor
//! can reach the endpoint.
//!
//! When `NEXO_ADMIN_AUTH_STRICT=1` is set, the endpoint returns 403
//! and the SPA falls back to the manual token entry form.
//!
//! Endpoint is unauthenticated (no bearer required). It is mounted
//! BEFORE the bearer-protected routes so the SPA can call it before
//! it has a token at all.

use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use nexo_microapp_http::auth::LiveTokenState;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "ok")]
#[allow(clippy::large_enum_variant)]
pub enum AuthTokenResponse {
    #[serde(rename = "true")]
    Ok { token: String },
}

#[derive(Clone)]
pub struct AuthTokenState {
    pub live: Arc<LiveTokenState>,
    /// `true` when `NEXO_ADMIN_AUTH_STRICT` is set to a non-empty value.
    pub strict: bool,
}

impl AuthTokenState {
    pub fn from_env(live: Arc<LiveTokenState>) -> Self {
        let strict = std::env::var("NEXO_ADMIN_AUTH_STRICT")
            .map(|v| !v.is_empty() && v != "0" && v != "false")
            .unwrap_or(false);
        Self { live, strict }
    }
}

pub async fn handler(State(state): State<AuthTokenState>) -> impl IntoResponse {
    if state.strict {
        return (
            StatusCode::FORBIDDEN,
            [(axum::http::header::CONTENT_TYPE, "application/json")],
            r#"{"ok":false,"error":"auth_strict"}"#,
        )
            .into_response();
    }
    let token = state.live.token.load().as_ref().clone();
    Json(AuthTokenResponse::Ok { token }).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use http_body_util::BodyExt as _;
    use tower::ServiceExt;

    fn app(strict: bool) -> Router {
        let live = LiveTokenState::from_strings("test-token-abc", "deadbeef01234567");
        let state = AuthTokenState { live, strict };
        Router::new()
            .route("/api/auth/token", get(handler))
            .with_state(state)
    }

    #[tokio::test]
    async fn returns_token_when_not_strict() {
        let res = app(false)
            .oneshot(
                Request::builder()
                    .uri("/api/auth/token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["ok"], "true");
        assert_eq!(v["token"], "test-token-abc");
    }

    #[tokio::test]
    async fn returns_403_when_strict() {
        let res = app(true)
            .oneshot(
                Request::builder()
                    .uri("/api/auth/token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["ok"], false);
    }
}
