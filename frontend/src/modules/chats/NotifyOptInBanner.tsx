// M7.notify.b — opt-in CTA for browser desktop notifications.
//
// Surfaces a slim banner under the sidebar header when:
// - `Notification.permission ==="default"` (never asked), OR
// - the localStorage denial flag is set AND permission is not
//"granted"(operator clicked Block at some point).
//
// Click"Habilitar"→ clear the denial cache + run
// `ensurePermission()`. The browser's own decision still wins —
// if it cached"denied"at the OS level, nothing visible happens
// but at least the operator can re-grant via OS settings and
// hit"Habilitar"again to re-test. Dismiss (X) hides the banner
// for the current page-life only (no localStorage persistence;
// the next dashboard mount surfaces it again until granted).

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  clearDenialFlag,
  denialFlagSet,
  ensurePermission,
  notificationsSupported,
} from "../../lib/notify";
import { useToast } from "../../store/toast";
import { Button } from "../../components/ui";
import { useT, t as tStatic } from "../../i18n";

export default function NotifyOptInBanner() {
  const t = useT();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!notificationsSupported()) {
      setPermission("denied");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  if (dismissed) return null;
  if (!notificationsSupported()) return null;
  if (permission === null) return null;
  if (permission === "granted") return null;

  // Show the banner when never-asked OR previously-denied via
  // our local cache. A"denied"permission with no flag is a
  // browser-cached deny we can't recover from in-app, so we
  // hide the banner (operator must clear via browser settings).
  const should_show =
    permission === "default" || (permission === "denied" && denialFlagSet());
  if (!should_show) return null;

  async function enable() {
    if (busy) return;
    setBusy(true);
    clearDenialFlag();
    try {
      const result = await ensurePermission();
      setPermission(result);
      if (result === "granted") {
        useToast.getState().push({
          kind: "info",
          text: tStatic("chat.notify.toast_enabled"),
          ttl_ms: 3000,
        });
      } else {
        useToast.getState().push({
          kind: "warn",
          text: tStatic("chat.notify.toast_denied"),
          ttl_ms: 5000,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2">
      <Bell size={14} className="flex-shrink-0 text-amber-700" />
      <div className="flex-1 text-xs text-amber-900">
        {t("chat.notify.body")}
      </div>
      <Button variant="secondary" size="md" onClick={enable} disabled={busy}>
        {busy ? t("chat.notify.enabling") : t("chat.notify.enable")}
      </Button>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setDismissed(true)}
        aria-label={t("chat.notify.dismiss_aria")}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
