// Banner rendered while the marketing extension is paused for
// the active tenant. Reads `useMarketingState` (Zustand). Polls
// every 30 s as a backstop in case the operator paused from
// another tab; the settings tab also pushes `setEnabled` after
// every successful save so the banner reacts immediately.

import { useEffect, useState } from "react";

import { useMarketingState } from "../../store/marketingStateStore";
import { Button } from "../../components/ui";
import { useT } from "../../i18n";

const POLL_INTERVAL_MS = 30_000;

export default function MarketingPauseBanner() {
  const t = useT();
  const state = useMarketingState((s) => s.state);
  const fetch = useMarketingState((s) => s.fetch);
  const setEnabled = useMarketingState((s) => s.setEnabled);
  const [resuming, setResuming] = useState(false);

  // Hydrate on mount + poll every N seconds. Lives at the
  // top of the marketing sidebar so as long as the operator
  // is anywhere in the marketing module the banner sees the
  // truth.
  useEffect(() => {
    void fetch();
    const id = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  if (!state || state.enabled) return null;

  const reasonSuffix = state.paused_reason
    ? `${t("marketing.state.banner.paused_reason_prefix")}${state.paused_reason}`
    : "";
  const message = t("marketing.state.banner.paused", { reason: reasonSuffix });

  async function resume() {
    setResuming(true);
    try {
      await setEnabled(true);
    } finally {
      setResuming(false);
    }
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2 border-b bg-warning/10 px-3 py-2 text-xs text-warning"
    >
      <span className="truncate">{message}</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={resume}
        disabled={resuming}
      >
        {t("marketing.state.banner.resume")}
      </Button>
    </div>
  );
}
