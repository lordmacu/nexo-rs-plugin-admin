// Step 2 — WhatsApp QR pairing.
//
// M9.b — SSE primary push via `subscribePairingStream`, with a
// 5 s polling fallback for resilience (proxy idle timeouts,
// dropped connections, late subscriptions). Both paths call
// `applyPairingStatus` so the projection logic is shared.

import { useEffect, useState } from "react";
import { RefreshCcw, Smartphone } from "lucide-react";
import { adminCall } from "../../api/admin";
import { subscribePairingStream } from "../../api/pairing";
import type { PairingStatus, PairingStateWire } from "../../api/types";
import { useWizard } from "../../store/wizard";
import { Button, Spinner } from "../ui";
import { useT } from "../../i18n";

interface PairingStartResponse {
  challenge_id: string;
  expires_at_ms: number;
  qr_png_base64?: string;
  qr_ascii?: string;
  instructions?: string;
}

interface StepPairingProps {
  onContinue: () => void;
}

export default function StepPairing({ onContinue }: StepPairingProps) {
  const t = useT();
  const pairing = useWizard((s) => s.pairing);
  const updatePairing = useWizard((s) => s.updatePairing);
  const agent = useWizard((s) => s.agent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      // Phase 82.10 requires `agent_id` for the audit trail. The
      // wizard runs pairing before the agent step, so the draft
      // `agent.id` is usually empty here — fall back to
      // `"bootstrap"`. The actual agent↔credential binding is
      // applied later by `credentials/register` (StepAgent submit).
      const resp = await adminCall<PairingStartResponse>(
        "nexo/admin/pairing/start",
        {
          agent_id: agent.id || "bootstrap",
          channel: "whatsapp",
        },
      );
      const startPatch: Partial<typeof pairing> = {
        challenge_id: resp.challenge_id,
        expires_at_ms: resp.expires_at_ms,
        state: "qr_ready",
      };
      if (resp.qr_png_base64 !== undefined)
        startPatch.last_qr_png = resp.qr_png_base64;
      updatePairing(startPatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      updatePairing({ state: "error" });
    } finally {
      setBusy(false);
    }
  }

  // Push (SSE) primary + 5 s polling fallback.
  useEffect(() => {
    if (!pairing.challenge_id) return;
    if (["linked", "expired", "error"].includes(pairing.state)) return;
    let cancelled = false;

    function applyPairingStatus(status: PairingStatus) {
      if (cancelled) return;
      const next = mapWireState(status.state);
      const patch: Partial<typeof pairing> = { state: next };
      if (status.data?.qr_png_base64)
        patch.last_qr_png = status.data.qr_png_base64;
      if (status.data?.device_jid) patch.device_jid = status.data.device_jid;
      updatePairing(patch);
      if (next === "linked") {
        // Auto-advance after a brief beat so the operator sees
        // the green checkmark.
        window.setTimeout(() => onContinue(), 800);
      }
    }

    // Primary: SSE push.
    const closeSse = subscribePairingStream({
      challenge_id: pairing.challenge_id,
      onUpdate: applyPairingStatus,
      onError: () => {
        // SSE drop is fine — polling fallback below catches up.
      },
    });

    // Belt + suspenders: polling fallback every 5 s. The eager
    // first tick happens immediately so the wizard isn't blank
    // for the full interval if SSE failed to open.
    async function poll() {
      if (cancelled || !pairing.challenge_id) return;
      try {
        const resp = await adminCall<PairingStatus>(
          "nexo/admin/pairing/status",
          {
            challenge_id: pairing.challenge_id,
          },
        );
        applyPairingStatus(resp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void poll();
    const tickHandle = window.setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      closeSse();
      window.clearInterval(tickHandle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing.challenge_id]);

  const expired =
    pairing.expires_at_ms !== undefined && pairing.expires_at_ms < Date.now();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {t("wizard.pairing.title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("wizard.pairing.subtitle")}
        </p>
      </div>

      {!pairing.last_qr_png && pairing.state === "idle" && (
        <Button variant="primary" size="md" onClick={start} disabled={busy}>
          {busy ? <Spinner size="md" /> : <Smartphone size={16} />}
          {t("wizard.pairing.generate_qr")}
        </Button>
      )}

      {pairing.last_qr_png &&
        !["linked"].includes(pairing.state) &&
        !expired && (
          <div className="space-y-3">
            <div className="inline-block p-4 bg-white border  rounded">
              <img
                src={`data:image/png;base64,${pairing.last_qr_png}`}
                alt={t("wizard.pairing.qr_alt")}
                className="w-64 h-64"
              />
            </div>
            <div className="text-sm text-text-secondary flex items-center gap-2">
              {pairing.state === "awaiting_user" ? (
                <>
                  <Spinner size="md" />
                  {t("wizard.pairing.confirming")}
                </>
              ) : (
                <>{t("wizard.pairing.waiting")}</>
              )}
            </div>
            <Button variant="ghost" size="md" onClick={start}>
              <RefreshCcw size={12} /> {t("wizard.pairing.regenerate_qr")}
            </Button>
          </div>
        )}

      {(pairing.state === "expired" || expired) && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800 space-y-2">
          <div>{t("wizard.pairing.expired")}</div>
          <Button variant="secondary" size="md" onClick={start}>
            {t("wizard.pairing.regenerate_code")}
          </Button>
        </div>
      )}

      {pairing.state === "linked" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-sm text-emerald-900">
          {pairing.device_jid
            ? t("wizard.pairing.linked_with_jid", {
                jid: maskJid(pairing.device_jid),
              })
            : t("wizard.pairing.linked")}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

/** Map the framework's snake_case wire enum onto the wizard
 *  store's local state names. Both vocabularies are very close
 *  but the store uses `idle` + `error` outside the wire surface. */
function mapWireState(
  s: PairingStateWire,
): "qr_ready" | "awaiting_user" | "linked" | "expired" {
  switch (s) {
    case "pending":
    case "qr_ready":
      return "qr_ready";
    case "awaiting_user":
      return "awaiting_user";
    case "linked":
      return "linked";
    case "expired":
    case "cancelled":
      return "expired";
  }
}

function maskJid(jid: string): string {
  if (jid.length <= 6) return jid;
  return `${jid.slice(0, 4)}…${jid.slice(-3)}`;
}
