//! Onboarding wizard backend — ported from agent-creator-microapp.
//!
//! Two responsibilities:
//! 1. `bootstrap::snapshot` — real empty-state snapshot from daemon
//!    RPCs, replacing the hardcoded `needs_wizard: false` stub.
//! 2. `routes::bind_routes` — POST handlers for wizard steps
//!    (LLM probe, LLM save, agent save, finish).

pub mod bootstrap;
pub mod routes;

pub use routes::{bind_routes, OnboardingState};
