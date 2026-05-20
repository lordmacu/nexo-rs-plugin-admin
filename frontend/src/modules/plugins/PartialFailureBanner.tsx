// Phase 98.14 — dismissible banner for per-source failures.
//
// Discovery's `search` returns whatever items the healthy sources
// produced + a `partial_failures: SourceError[]` for the ones that
// errored. We surface those so the operator knows the catalogue
// might be incomplete + which source is to blame. Common case:
// GitHub topic 403 when the unauth rate ceiling hits.
//
// Dismissal persists 5 minutes in `sessionStorage` so the banner
// doesn't re-appear after every keystroke filter reload (the
// underlying failure list typically repeats). The next page reload
// or refresh-index call clears the dismissal.

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import type { SourceError } from "../../api/plugin_discovery";
import { useT } from "../../i18n";

const DISMISS_TTL_MS = 5 * 60 * 1000;

interface PartialFailureBannerProps {
  failures: SourceError[];
}

interface DismissRecord {
  signature: string;
  ts: number;
}

const STORAGE_KEY = "plugins.partial_failure_dismiss";

/** Compute a stable signature for the failure set so the dismiss
 *  applies to *this* mix; if a NEW source fails the banner re-
 *  appears. */
function signatureOf(failures: SourceError[]): string {
  return failures
    .map((f) => `${f.source}:${f.message.slice(0, 40)}`)
    .sort()
    .join("|");
}

function loadDismiss(): DismissRecord | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (Date.now() - parsed.ts > DISMISS_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDismiss(signature: string): void {
  try {
    const rec: DismissRecord = { signature, ts: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // sessionStorage unavailable (e.g. private browsing); the
    // operator can dismiss again per render — acceptable fallback.
  }
}

export default function PartialFailureBanner({
  failures,
}: PartialFailureBannerProps) {
  const t = useT();
  const [dismissed, setDismissed] = useState<DismissRecord | null>(loadDismiss);

  const signature = signatureOf(failures);
  const visible =
    failures.length > 0 &&
    (dismissed === null || dismissed.signature !== signature);

  useEffect(() => {
    // Re-load on mount in case another module updated session.
    setDismissed(loadDismiss());
  }, []);

  if (!visible) return null;

  function onDismiss() {
    saveDismiss(signature);
    setDismissed({ signature, ts: Date.now() });
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft p-3 text-sm text-warning"
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">
          {t("plugins.partial_failure.heading", { count: failures.length })}
        </p>
        <ul className="ml-4 list-disc text-xs">
          {failures.map((f, i) => (
            <li key={`${f.source}-${i}`}>
              <span className="font-mono">{f.source}</span>: {f.message}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("plugins.partial_failure.dismiss")}
        className="rounded p-0.5 hover:bg-warning/10"
      >
        <X size={12} />
      </button>
    </div>
  );
}
