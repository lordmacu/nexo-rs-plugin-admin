//! Phase 90.4 — login form + cookie-based auth routes.
//!
//! Routes:
//!   GET  /login           → static HTML form (unauthenticated)
//!   POST /api/login       → validate password, set cookie
//!   POST /api/logout      → clear cookie
//!
//! Cookie name + TTL come from `crate::auth`. Successful login
//! sets `Set-Cookie: nexo_admin=<signed>; HttpOnly; SameSite=Lax`.

use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Form, Router};
use serde::Deserialize;

use crate::auth::{LiveAdminSession, ADMIN_COOKIE_NAME, ADMIN_COOKIE_TTL_SECS};

/// Mounted under `/login` + `/api/login` + `/api/logout`.
pub fn router(session: Arc<LiveAdminSession>) -> Router {
    Router::new()
        .route("/login", get(login_form))
        .route("/api/login", post(login))
        .route("/api/logout", post(logout))
        .with_state(session)
}

#[derive(Debug, Deserialize)]
pub struct LoginForm {
    /// `admin` is the only valid value; included so the form
    /// looks familiar even though the value is fixed.
    #[allow(dead_code)]
    username: String,
    password: String,
}

async fn login_form() -> Html<&'static str> {
    Html(LOGIN_HTML)
}

async fn login(
    State(session): State<Arc<LiveAdminSession>>,
    Form(payload): Form<LoginForm>,
) -> Response {
    let snapshot = session.current();
    if !snapshot.validate_password(&payload.password) {
        return (
            StatusCode::UNAUTHORIZED,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"ok":false,"error":"invalid credentials"}"#,
        )
            .into_response();
    }
    let cookie = snapshot.issue_cookie(ADMIN_COOKIE_TTL_SECS);
    let cookie_value = format!(
        "{ADMIN_COOKIE_NAME}={cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age={ADMIN_COOKIE_TTL_SECS}",
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    if let Ok(value) = HeaderValue::from_str(&cookie_value) {
        headers.insert(header::SET_COOKIE, value);
    }
    (StatusCode::OK, headers, r#"{"ok":true}"#).into_response()
}

async fn logout() -> Response {
    let cookie_value = format!(
        "{ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    if let Ok(value) = HeaderValue::from_str(&cookie_value) {
        headers.insert(header::SET_COOKIE, value);
    }
    (StatusCode::OK, headers, r#"{"ok":true}"#).into_response()
}

const LOGIN_HTML: &str = r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>nexo-rs admin · login</title>
  <style>
    :root { color-scheme: light; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, sans-serif;
      background: #f6f6f7;
      margin: 0;
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      padding: 32px;
      width: 100%;
      max-width: 360px;
    }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .subtitle { color: #555; font-size: 13px; margin-bottom: 16px; }
    label { display: block; margin: 12px 0 4px; font-size: 13px; }
    input {
      width: 100%; box-sizing: border-box;
      padding: 8px 10px; font-size: 14px;
      border: 1px solid #d4d4d4; border-radius: 4px;
    }
    button {
      margin-top: 16px; width: 100%;
      padding: 9px 12px; font-size: 14px;
      background: #00a884; color: white;
      border: 0; border-radius: 4px; cursor: pointer;
    }
    button:hover { background: #0a9974; }
    .error { color: #b00020; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>nexo-rs admin</h1>
    <div class="subtitle">Enter the launch password printed in the daemon log.</div>
    <form id="f">
      <label for="u">Username</label>
      <input id="u" name="username" value="admin" autocomplete="off" />
      <label for="p">Password</label>
      <input id="p" name="password" type="password" autocomplete="current-password" autofocus />
      <button type="submit">Sign in</button>
      <div id="err" class="error" hidden></div>
    </form>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new URLSearchParams();
      data.set('username', document.getElementById('u').value);
      data.set('password', document.getElementById('p').value);
      const r = await fetch('/api/login', {
        method: 'POST',
        body: data,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      const errEl = document.getElementById('err');
      if (r.ok) {
        window.location.replace('/');
      } else {
        errEl.hidden = false;
        errEl.textContent = 'Invalid credentials';
      }
    });
  </script>
</body>
</html>"#;
