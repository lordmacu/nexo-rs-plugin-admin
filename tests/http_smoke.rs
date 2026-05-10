//! Phase 90.x.e2e — HTTP smoke test.
//!
//! Spawns the plugin binary with `NEXO_ADMIN_TOKEN` set, waits
//! for /healthz to come up, then verifies:
//!   - GET /healthz returns 200 + JSON ok
//!   - GET / returns 200 (SPA shell baked into the binary)
//!   - POST /api/admin without bearer returns 401
//!   - POST /api/admin with the wrong bearer returns 401
//!
//! Mirrors the inline smoke from Phase 90.1.6 but locks the
//! contract into CI. The /api/admin success path is not tested
//! here because it requires a running daemon for upstream
//! AdminClient; that's a separate end-to-end harness deferred.
//!
//! `#[ignore]` by default — opt in with `cargo test -- --ignored`.

use std::io::Read;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

const PORT: u16 = 18890; // distinct from the production default 18000
const TOKEN: &str = "test-bearer-deadbeef";
const STARTUP_BUDGET: Duration = Duration::from_secs(5);

fn binary_path() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CARGO_BIN_EXE_nexo-plugin-admin") {
        return Some(PathBuf::from(path));
    }
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").ok()?;
    for profile in ["debug", "release-fast", "release"] {
        let p = PathBuf::from(&manifest_dir)
            .join("target")
            .join(profile)
            .join("nexo-plugin-admin");
        if p.exists() {
            return Some(p);
        }
    }
    None
}

fn wait_for_listener(port: u16) -> bool {
    let deadline = Instant::now() + STARTUP_BUDGET;
    while Instant::now() < deadline {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(100));
    }
    false
}

fn spawn_plugin() -> Option<Child> {
    let bin = binary_path()?;
    let mut cmd = Command::new(&bin);
    cmd.env("NEXO_ADMIN_TOKEN", TOKEN)
        .env("NEXO_ADMIN_HTTP_BIND", format!("127.0.0.1:{PORT}"))
        .env("NEXO_ADMIN_TUNNEL", "none")
        .env("RUST_LOG", "warn")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    cmd.spawn().ok()
}

fn http_get(path: &str) -> Option<(u16, Vec<u8>)> {
    let mut s = TcpStream::connect(("127.0.0.1", PORT)).ok()?;
    let req = format!(
        "GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
    );
    use std::io::Write;
    s.write_all(req.as_bytes()).ok()?;
    let mut buf = Vec::new();
    s.read_to_end(&mut buf).ok()?;
    parse_status(&buf).map(|c| (c, buf))
}

fn http_post(path: &str, bearer: Option<&str>, body: &str) -> Option<(u16, Vec<u8>)> {
    let mut s = TcpStream::connect(("127.0.0.1", PORT)).ok()?;
    let auth = bearer
        .map(|t| format!("Authorization: Bearer {t}\r\n"))
        .unwrap_or_default();
    let req = format!(
        "POST {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: {}\r\n{auth}Connection: close\r\n\r\n{body}",
        body.len()
    );
    use std::io::Write;
    s.write_all(req.as_bytes()).ok()?;
    let mut buf = Vec::new();
    s.read_to_end(&mut buf).ok()?;
    parse_status(&buf).map(|c| (c, buf))
}

fn parse_status(buf: &[u8]) -> Option<u16> {
    let head = std::str::from_utf8(buf).ok()?;
    let first = head.lines().next()?;
    let parts: Vec<&str> = first.split_whitespace().collect();
    parts.get(1)?.parse().ok()
}

#[test]
#[ignore = "spawns the plugin binary; opt in with --ignored"]
fn http_endpoints_respond_correctly() {
    let mut child = match spawn_plugin() {
        Some(c) => c,
        None => {
            eprintln!("http_smoke skipped: plugin binary not built yet");
            return;
        }
    };

    if !wait_for_listener(PORT) {
        let _ = child.kill();
        panic!("HTTP listener didn't bind within {STARTUP_BUDGET:?}");
    }

    let healthz = http_get("/healthz");
    assert!(healthz.is_some(), "GET /healthz failed to connect");
    let (status, _body) = healthz.unwrap();
    assert_eq!(status, 200, "GET /healthz expected 200, got {status}");

    let root = http_get("/");
    assert!(root.is_some(), "GET / failed to connect");
    let (status, body) = root.unwrap();
    assert_eq!(status, 200, "GET / expected 200, got {status}");
    let body_str = String::from_utf8_lossy(&body);
    assert!(
        body_str.contains("nexo-rs admin")
            || body_str.contains("<!doctype html>")
            || body_str.contains("frontend bundle not embedded"),
        "GET / body unexpected; first 200 bytes: {}",
        &body_str.chars().take(200).collect::<String>(),
    );

    let no_bearer = http_post("/api/admin", None, "{}");
    assert!(no_bearer.is_some(), "POST /api/admin (no bearer) failed");
    let (status, _) = no_bearer.unwrap();
    assert_eq!(
        status, 401,
        "POST /api/admin without bearer expected 401, got {status}"
    );

    let wrong_bearer = http_post("/api/admin", Some("wrong-token"), "{}");
    assert!(wrong_bearer.is_some(), "POST /api/admin (wrong) failed");
    let (status, _) = wrong_bearer.unwrap();
    assert_eq!(
        status, 401,
        "POST /api/admin with wrong bearer expected 401, got {status}"
    );

    let _ = child.kill();
    let _ = child.wait();
}

#[test]
#[ignore = "spawns the plugin binary; opt in with --ignored"]
fn login_form_renders_unauthenticated() {
    let mut child = match spawn_plugin() {
        Some(c) => c,
        None => {
            eprintln!("login_smoke skipped: plugin binary not built yet");
            return;
        }
    };

    if !wait_for_listener(PORT) {
        let _ = child.kill();
        panic!("HTTP listener didn't bind within {STARTUP_BUDGET:?}");
    }

    let resp = http_get("/login");
    assert!(resp.is_some(), "GET /login failed to connect");
    let (status, body) = resp.unwrap();
    assert_eq!(status, 200, "GET /login expected 200, got {status}");
    let body_str = String::from_utf8_lossy(&body);
    assert!(
        body_str.contains("nexo-rs admin"),
        "login form missing brand string"
    );
    assert!(
        body_str.contains("password"),
        "login form missing password input"
    );

    let _ = child.kill();
    let _ = child.wait();
}
