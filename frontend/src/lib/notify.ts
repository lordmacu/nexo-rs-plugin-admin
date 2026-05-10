// M7.notify — browser desktop notifications.
//
// Fires native OS notifications for operator-actionable events
// when (a) permission has been granted and (b) the dashboard
// tab is hidden. Tag-based dedup ensures bursts on the same
// conversation collapse to the latest notification. Permission
// is requested once on the operator's first conversation click
// (a real user gesture — browsers block automatic prompts);
// denial is stored in localStorage so the prompt never repeats.

const PERMISSION_DENIED_FLAG = "nexo-admin:notify:denied:v1";

/** M7.notify.b — clear the persistent denial flag so the next
 *  `ensurePermission()` re-tries the native prompt. The browser
 *  may still hold its own denial; this only clears OUR cache. */
export function clearDenialFlag(): void {
  try {
    localStorage.removeItem(PERMISSION_DENIED_FLAG);
  } catch {
    /* private mode */
  }
}

/** M7.notify.b — true when our localStorage cache says the
 *  operator denied notifications previously. */
export function denialFlagSet(): boolean {
  try {
    return localStorage.getItem(PERMISSION_DENIED_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Best-effort detection. iOS Safari WebView and some embedded
 *  browsers lack the Notification API entirely. */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Trigger the permission prompt at most once per origin. The
 *  browser caches the answer; we additionally stash a
 *  localStorage flag on denial so the prompt skip survives
 *  reloads even when the browser would re-prompt. */
export async function ensurePermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (localStorage.getItem(PERMISSION_DENIED_FLAG) === "1") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") {
    localStorage.setItem(PERMISSION_DENIED_FLAG, "1");
    return "denied";
  }
  // permission === "default" — ask now.
  try {
    const result = await Notification.requestPermission();
    if (result === "denied") {
      localStorage.setItem(PERMISSION_DENIED_FLAG, "1");
    }
    return result;
  } catch {
    return "denied";
  }
}

/** Fire-condition predicate. Centralised so callers don't
 *  duplicate the visibility / permission check. */
export function canNotify(): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  return document.visibilityState === "hidden";
}

export interface NotifyPayload {
  /** Maps onto `Notification.tag` — bursts replace each other
   *  per conversation. Use the conversation key. */
  tag: string;
  title: string;
  body: string;
  /** Where to navigate when the operator clicks. Falls through
   *  to `history.pushState` + a dispatched `popstate` event so
   *  React Router picks up the location change without a full
   *  page reload. */
  navigate_to: string;
}

/** Fire a notification + wire the click handler. No-op when
 *  conditions don't hold. Wraps the constructor in try/catch
 *  because some browsers (iOS Safari) throw on background
 *  pages. */
export function fireNotification(p: NotifyPayload): void {
  if (!canNotify()) return;
  try {
    const n = new Notification(p.title, {
      body: p.body,
      tag: p.tag,
      icon: "/favicon.svg",
    });
    n.onclick = () => {
      window.focus();
      window.history.pushState({}, "", p.navigate_to);
      // pushState alone doesn't fire popstate; React Router
      // listens for popstate so we synthesise one. Documented
      // escape hatch for SPA programmatic navigation.
      window.dispatchEvent(new PopStateEvent("popstate"));
      n.close();
    };
  } catch (e) {
    console.warn("Notification fire failed", e);
  }
}
