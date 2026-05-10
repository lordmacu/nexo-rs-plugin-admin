//! Phase 90.x.e2e — handshake smoke test.
//!
//! Verifies that spawning the plugin binary + writing a single
//! `initialize` JSON-RPC request to its stdin produces a valid
//! manifest reply on stdout. Mirrors the smoke I ran inline at
//! Phase 90.1.2 but locks the contract into CI.
//!
//! Failure modes the test catches:
//!   - Plugin won't parse its own embedded `plugin.toml` (manifest_version,
//!     [plugin.entrypoint], capabilities surface).
//!   - SDK builder (`Microapp::new(...).run_stdio`) regresses on the
//!     handshake reply shape.
//!   - Build profile drifts so the binary behaves differently from
//!     `cargo run`.
//!
//! Skipped when the plugin binary doesn't exist (clean checkout
//! before `cargo build`). The test is `#[ignore]` by default —
//! run with `cargo test -- --ignored` to opt in.

use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

const REQUEST: &str =
    r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}"#;

fn binary_path() -> Option<PathBuf> {
    // Resolve via the convention `target/<profile>/<bin>`. CARGO_BIN_EXE_*
    // env vars get set automatically when the integration test framework
    // runs, but reach across the dev/release-fast/release split.
    if let Ok(path) = std::env::var("CARGO_BIN_EXE_nexo-plugin-admin") {
        return Some(PathBuf::from(path));
    }
    // Fall back to walking from CARGO_MANIFEST_DIR.
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

#[test]
#[ignore = "spawns the plugin binary; opt in with --ignored"]
fn handshake_initialize_returns_manifest_reply() {
    let bin = match binary_path() {
        Some(p) => p,
        None => {
            eprintln!("handshake_smoke skipped: plugin binary not built yet");
            return;
        }
    };

    let mut child = Command::new(&bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn plugin binary");

    let mut stdin = child.stdin.take().expect("stdin piped");
    writeln!(stdin, "{REQUEST}").expect("write request");
    stdin.flush().ok();

    let mut reader = BufReader::new(child.stdout.take().expect("stdout piped"));
    let mut line = String::new();

    // Bound the read so a hung handshake doesn't stall CI forever.
    let deadline = std::time::Instant::now() + Duration::from_secs(5);
    while std::time::Instant::now() < deadline {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => continue,  // EOF; child still spinning up
            Ok(_) => break,
            Err(_) => break,
        }
    }

    // Drop stdin to signal EOF — the dispatch loop exits cleanly.
    drop(stdin);
    let _ = child.kill();
    let _ = child.wait();

    assert!(!line.is_empty(), "no reply received within 5s");
    let v: serde_json::Value =
        serde_json::from_str(line.trim()).expect("reply is valid JSON");
    assert_eq!(v["jsonrpc"], "2.0", "wrong protocol: {line}");
    assert_eq!(v["id"], 1, "wrong id echoed: {line}");
    // Microapp builder returns `{server_info, tools, hooks}` —
    // distinct from PluginAdapter's `{manifest, server_version}`.
    // Plugin admin uses Microapp because it consumes admin RPC
    // (PluginAdapter is reserved for channel plugins).
    let result = &v["result"];
    assert!(
        result.is_object(),
        "result field missing or wrong shape: {line}"
    );
    let server = &result["server_info"];
    assert_eq!(
        server["name"], "nexo-plugin-admin",
        "server_info.name regressed: {server}"
    );
    let pkg_version = env!("CARGO_PKG_VERSION");
    assert_eq!(
        server["version"], pkg_version,
        "server_info.version mismatch: expected {pkg_version}, got {server}"
    );
    // Plugin admin doesn't expose tools — it consumes them via
    // AdminClient. tools[] empty in the initialize reply is a
    // contract assertion: a regression that suddenly registered
    // a tool would silently change the integration shape.
    assert!(
        result["tools"].is_array(),
        "tools field missing: {line}"
    );
    assert_eq!(
        result["tools"].as_array().unwrap().len(),
        0,
        "plugin admin must not expose tools: {line}"
    );
}
