//! Phase 90.4.24 — no-op tunnel. Default adapter; operator
//! reaches the admin UI via loopback only. Selected when
//! `NEXO_ADMIN_TUNNEL` is unset, set to `none`, or when the
//! requested binary is missing.

use async_trait::async_trait;

use super::{TunnelAdapter, TunnelError, TunnelHandle};

pub struct NoneTunnel;

#[async_trait]
impl TunnelAdapter for NoneTunnel {
    async fn start(&self, _local_port: u16) -> Result<TunnelHandle, TunnelError> {
        Ok(TunnelHandle::loopback_only())
    }
}
