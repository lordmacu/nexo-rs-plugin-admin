//! `GET /healthz` — boot supervisor probe.
//!
//! Returns 200 unconditionally once the HTTP task is bound +
//! listening. Framework's boot supervisor (Phase 82.12) polls
//! this every second for up to 30 s before marking the
//! plugin `unhealthy`. Unauthenticated by design — the probe
//! has no shared secret to send. Loopback bind is what protects
//! the endpoint.
//!
//! Lifted verbatim from agent-creator-microapp/src/http/healthz.rs.

use axum::Json;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthOk {
    pub ok: bool,
    pub version: &'static str,
}

pub async fn handler() -> Json<HealthOk> {
    Json(HealthOk {
        ok: true,
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn healthz_returns_ok_with_version() {
        let app = Router::new().route("/healthz", get(handler));
        let res = app
            .oneshot(Request::builder().uri("/healthz").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["ok"], true);
        assert_eq!(v["version"], env!("CARGO_PKG_VERSION"));
    }
}
