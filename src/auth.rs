//! Phase 90.4 — login form + cookie session for the admin UI.
//!
//! Pattern lifted from `proyecto/src/main.rs:9180-9340` (the
//! in-tree `agent admin` flow Phase 90 supersedes). Cookie is a
//! `<expires_unix_secs>.<hmac_sha256_hex>` payload signed with a
//! per-launch 32-byte secret. Validate = recompute HMAC over the
//! payload + check expiry, both in constant time.
//!
//! Random password minted per launch + printed to stderr at boot
//! (operator copies into the login form). Auth rotation
//! (Phase 82.10.o) rotates both the bearer + this password
//! atomically by re-creating the AdminSession and swapping it
//! through an Arc.

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use arc_swap::ArcSwap;
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;
use subtle::ConstantTimeEq;

pub const ADMIN_COOKIE_NAME: &str = "nexo_admin";
/// 24 hours — re-login forced once a day. Token rotation also
/// invalidates every cookie because the secret changes.
pub const ADMIN_COOKIE_TTL_SECS: u64 = 24 * 60 * 60;

type HmacSha256 = Hmac<Sha256>;

/// Per-launch session state. The password the operator pastes in
/// `/login`; the 32-byte secret signing every cookie. Both rotate
/// when the daemon issues `auth_rotate`.
#[derive(Debug)]
pub struct AdminSession {
    password: String,
    secret: [u8; 32],
}

impl AdminSession {
    /// Mint a fresh session with a random password + secret.
    pub fn new_random() -> Self {
        let mut rng = rand::thread_rng();
        let mut secret = [0u8; 32];
        rng.fill_bytes(&mut secret);

        // Password: 4 groups of 4 lowercase hex chars separated by
        // dashes — `a8f2-9b3d-7e1c-2f60`. Easy to copy-paste, hard
        // enough to brute force at the per-launch scope.
        let mut bytes = [0u8; 8];
        rng.fill_bytes(&mut bytes);
        let password = format!(
            "{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}",
            bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        );

        Self { password, secret }
    }

    /// The operator-visible password. Print to stderr at boot;
    /// never log via `tracing::info!` (the daemon's stdout→
    /// log bridge could fan it out unintentionally).
    pub fn password(&self) -> &str {
        &self.password
    }

    /// Mint a signed session cookie value.
    pub fn issue_cookie(&self, ttl_seconds: u64) -> String {
        let expires = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
            .saturating_add(ttl_seconds);
        let payload = expires.to_string();
        let sig = hmac_hex(&self.secret, payload.as_bytes());
        format!("{payload}.{sig}")
    }

    /// `true` iff the cookie was signed by this session's secret
    /// AND hasn't expired.
    pub fn validate_cookie(&self, value: &str) -> bool {
        let Some((payload, sig)) = value.split_once('.') else {
            return false;
        };
        let expected = hmac_hex(&self.secret, payload.as_bytes());
        if sig.as_bytes().ct_eq(expected.as_bytes()).unwrap_u8() != 1 {
            return false;
        }
        let Ok(expires) = payload.parse::<u64>() else {
            return false;
        };
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(u64::MAX);
        now < expires
    }

    /// Constant-time password compare against the operator's input.
    pub fn validate_password(&self, candidate: &str) -> bool {
        candidate
            .as_bytes()
            .ct_eq(self.password.as_bytes())
            .unwrap_u8()
            == 1
    }
}

fn hmac_hex(secret: &[u8; 32], payload: &[u8]) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(payload);
    let digest = mac.finalize().into_bytes();
    let mut out = String::with_capacity(64);
    for b in digest.iter() {
        use std::fmt::Write;
        let _ = write!(&mut out, "{b:02x}");
    }
    out
}

/// Live, atomically swappable AdminSession. Set at boot;
/// `swap()` replaces it on `auth_rotate` so in-flight HTTP
/// validation hits the new secret without restart.
pub struct LiveAdminSession(ArcSwap<AdminSession>);

impl LiveAdminSession {
    pub fn new(initial: AdminSession) -> Arc<Self> {
        Arc::new(Self(ArcSwap::from_pointee(initial)))
    }

    pub fn current(&self) -> Arc<AdminSession> {
        self.0.load_full()
    }

    /// Atomic swap. Returns the previous session for logging.
    pub fn swap(&self, next: AdminSession) -> Arc<AdminSession> {
        self.0.swap(Arc::new(next))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issued_cookie_validates() {
        let s = AdminSession::new_random();
        let cookie = s.issue_cookie(60);
        assert!(s.validate_cookie(&cookie));
    }

    #[test]
    fn cookie_with_tampered_payload_rejected() {
        let s = AdminSession::new_random();
        let cookie = s.issue_cookie(60);
        let (_payload, sig) = cookie.split_once('.').unwrap();
        // Forge a future expiry but keep the original signature
        // — should fail HMAC check.
        let forged = format!("9999999999.{sig}");
        assert!(!s.validate_cookie(&forged));
    }

    #[test]
    fn expired_cookie_rejected() {
        let s = AdminSession::new_random();
        // Manually craft a payload from 1970 (already expired).
        let payload = "1";
        let sig = hmac_hex(&s.secret, payload.as_bytes());
        let cookie = format!("{payload}.{sig}");
        assert!(!s.validate_cookie(&cookie));
    }

    #[test]
    fn malformed_cookie_rejected() {
        let s = AdminSession::new_random();
        assert!(!s.validate_cookie("nodot"));
        assert!(!s.validate_cookie(""));
        assert!(!s.validate_cookie("notnum.sig"));
    }

    #[test]
    fn password_compare_constant_time_correct() {
        let s = AdminSession::new_random();
        let pw = s.password().to_string();
        assert!(s.validate_password(&pw));
        assert!(!s.validate_password("wrong"));
        assert!(!s.validate_password(""));
    }

    #[test]
    fn live_session_swap_replaces_secret() {
        let live = LiveAdminSession::new(AdminSession::new_random());
        let cookie_a = live.current().issue_cookie(60);
        let _prev = live.swap(AdminSession::new_random());
        // Old cookie can't validate against new session's secret.
        assert!(!live.current().validate_cookie(&cookie_a));
        // New session's own cookie does validate.
        let cookie_b = live.current().issue_cookie(60);
        assert!(live.current().validate_cookie(&cookie_b));
    }

    #[test]
    fn random_passwords_differ_per_launch() {
        let a = AdminSession::new_random();
        let b = AdminSession::new_random();
        assert_ne!(a.password(), b.password());
    }
}
