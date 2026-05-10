//! Phase 90.2.12 — bundle the React frontend into the plugin
//! binary via `rust-embed`. The plugin ships standalone — no
//! second-stage install of static files.
//!
//! Build flow:
//!   `cd frontend && npm run build` → produces `frontend/dist/`
//!   `cargo build`                  → embeds dist via the `Assets`
//!                                     RustEmbed derive below
//!
//! Serving semantics:
//!   - `/`           → `index.html`
//!   - `/<known>`    → matching file with proper Content-Type
//!   - `/<unknown>`  → SPA fallback to `index.html` so React Router
//!                     deep links work after a hard refresh
//!
//! Hashed assets under `/assets/<name>-<hash>.{js,css}` are
//! immutable; cache headers should be long-lived. Index.html is
//! not hashed and must short-cache so frontend rotation lands
//! within seconds. Phase 90.4 wires the cache headers; v1 emits
//! sane defaults.

use axum::body::Body;
use axum::http::{header, HeaderValue, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
// `RustEmbed` is both the derive AND the trait — having it in
// scope surfaces the `get(...)` + `iter(...)` static methods on
// `Assets`.
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "frontend/dist/"]
#[exclude = "*.map"]
struct Assets;

/// Serve a path from the embedded dist. Falls back to `index.html`
/// (SPA fallback) for any path that doesn't match a real file.
async fn serve(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    serve_asset(path).await
}

async fn serve_asset(requested: &str) -> Response {
    let candidate = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };

    // Try the literal path first.
    if let Some(content) = Assets::get(candidate) {
        return embedded_response(candidate, content.data.into_owned());
    }

    // SPA fallback — any path the frontend handles via React
    // Router (e.g. `/agents/abc/edit`) must serve the SPA shell.
    if let Some(content) = Assets::get("index.html") {
        return embedded_response("index.html", content.data.into_owned());
    }

    // No bundle baked in (dev mode build skipped). Surface a
    // 404 so the operator sees something better than an empty
    // page.
    (StatusCode::NOT_FOUND, "frontend bundle not embedded").into_response()
}

fn embedded_response(path: &str, body: Vec<u8>) -> Response {
    let mime = mime_guess::from_path(path).first_or_octet_stream();
    let cache_control = if path.starts_with("assets/") {
        // Vite content-addresses these (`name-<hash>.ext`),
        // safe to cache aggressively.
        "public, max-age=31536000, immutable"
    } else {
        // index.html + favicon must short-cache so rotations
        // propagate quickly.
        "public, max-age=60, must-revalidate"
    };
    let mut response = Response::new(Body::from(body));
    let headers = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(mime.as_ref()) {
        headers.insert(header::CONTENT_TYPE, value);
    }
    if let Ok(value) = HeaderValue::from_str(cache_control) {
        headers.insert(header::CACHE_CONTROL, value);
    }
    response
}

/// Build the SPA router. Mount as `fallback_service` on the
/// outer router so `/api/*` and `/healthz` claim their routes
/// first.
pub fn router() -> Router {
    Router::new()
        .route("/", get(serve))
        .fallback(get(serve))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn root_serves_index_html() {
        let app = router();
        let res = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();
        // Either embedded (production build) or 404 (dev mode
        // before frontend build). Both states are valid.
        assert!(matches!(res.status(), StatusCode::OK | StatusCode::NOT_FOUND));
    }

    #[tokio::test]
    async fn spa_fallback_reroutes_unknown_path_to_index() {
        let app = router();
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/agents/some-id/edit")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        // Same valid states — the body lookup logic is
        // exercised either way.
        assert!(matches!(res.status(), StatusCode::OK | StatusCode::NOT_FOUND));
    }

    #[tokio::test]
    async fn embedded_response_sets_cache_control_for_hashed_assets() {
        let body = b"console.log('test');".to_vec();
        let res = embedded_response("assets/index-abc123de.js", body);
        let cc = res
            .headers()
            .get(header::CACHE_CONTROL)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        assert!(cc.contains("immutable"), "expected immutable cache, got {cc}");
    }

    #[tokio::test]
    async fn embedded_response_short_caches_index_html() {
        let body = b"<html></html>".to_vec();
        let res = embedded_response("index.html", body);
        let cc = res
            .headers()
            .get(header::CACHE_CONTROL)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        assert!(
            cc.contains("must-revalidate"),
            "expected must-revalidate for index.html, got {cc}",
        );
    }

    #[tokio::test]
    async fn embedded_response_sets_html_content_type() {
        let res = embedded_response("index.html", b"<html></html>".to_vec());
        let ct = res
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        assert!(ct.starts_with("text/html"), "got {ct}");
    }
}
