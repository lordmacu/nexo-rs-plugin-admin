// Re-pair modal. Triggered from the Agents page when the operator
// wants to swap the bound WhatsApp account on an existing agent
// without going through the full onboarding wizard. Mirrors the
// SSE-primary + 5 s polling fallback from `wizard/StepPairing` so
// device pairing keeps working through proxy idle drops.

import { useEffect, useState } from "react";
import { RefreshCcw, Smartphone, X } from "lucide-react";
import { adminCall } from "../../api/admin";
import { subscribePairingStream } from "../../api/pairing";
import type { PairingStatus, PairingStateWire } from "../../api/types";
import { Button, Spinner } from "../../components/ui";
import { useT } from "../../i18n";

interface PairingStartResponse {
  challenge_id: string;
  expires_at_ms: number;
  qr_png_base64?: string;
  qr_ascii?: string;
}

interface PairingModalProps {
  agent_id: string;
  onClose: () => void;
  /** Fired when pairing completes successfully. */
  onLinked: () => void;
}

type LocalState =
  | "idle"
  | "qr_ready"
  | "awaiting_user"
  | "linked"
  | "expired"
  | "cancelled"
  | "error";

function mapWireState(s: PairingStateWire): LocalState {
  return s as LocalState;
}

export default function PairingModal({
  agent_id,
  onClose,
  onLinked,
}: PairingModalProps) {
  const t = useT();
  const [state, setState] = useState<LocalState>("idle");
  const [challenge_id, setChallengeId] = useState<string | null>(null);
  const [expires_at_ms, setExpiresAtMs] = useState<number | null>(null);
  const [qr_png, setQrPng] = useState<string | null>(null);
  const [device_jid, setDeviceJid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    setQrPng(null);
    setDeviceJid(null);
    try {
      const resp = await adminCall<PairingStartResponse>(
        "nexo/admin/pairing/start",
        { agent_id, channel: "whatsapp" },
      );
      setChallengeId(resp.challenge_id);
      setExpiresAtMs(resp.expires_at_ms);
      if (resp.qr_png_base64) setQrPng(resp.qr_png_base64);
      setState("qr_ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  // Auto-start when the modal mounts so the operator sees the QR
  // immediately. Subsequent attempts go through the explicit
  // "Generar nuevo QR" button.
  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE primary + 5 s polling fallback. Same pattern as
  // wizard/StepPairing so re-pair behaves identically to
  // first-pair.
  useEffect(() => {
    if (!challenge_id) return;
    if (["linked", "expired", "error", "cancelled"].includes(state)) return;
    let cancelled = false;

    function apply(status: PairingStatus) {
      if (cancelled) return;
      const next = mapWireState(status.state);
      setState(next);
      if (status.data?.qr_png_base64) setQrPng(status.data.qr_png_base64);
      if (status.data?.device_jid) setDeviceJid(status.data.device_jid);
      if (next === "linked") {
        // Brief beat so the green check is visible before the
        // modal closes. Caller refreshes the agents list.
        window.setTimeout(() => {
          if (!cancelled) onLinked();
        }, 900);
      }
    }

    const closeSse = subscribePairingStream({
      challenge_id,
      onUpdate: apply,
      onError: () => {},
    });

    async function poll() {
      if (cancelled || !challenge_id) return;
      try {
        const resp = await adminCall<PairingStatus>(
          "nexo/admin/pairing/status",
          { challenge_id },
        );
        apply(resp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void poll();
    const tick = window.setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      closeSse();
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge_id]);

  async function cancel() {
    if (!challenge_id) {
      onClose();
      return;
    }
    try {
      await adminCall("nexo/admin/pairing/cancel", { challenge_id });
    } catch {
      // Best effort — the daemon expires it on its own.
    }
    onClose();
  }

  const expired =
    expires_at_ms !== null && expires_at_ms < Date.now() && state !== "linked";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b ">
          <h2 className="text-base font-medium text-text-primary flex items-center gap-2">
            <Smartphone size={16} />{" "}
            {t("agents.pairing_modal.title", { agent_id })}
          </h2>
          <Button
            variant="ghost"
            size="md"
            onClick={() => void cancel()}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="px-5 py-5 space-y-4 min-h-[320px] flex flex-col items-center justify-center">
          {state === "idle" || (busy && !qr_png) ? (
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Spinner size="md" /> {t("agents.pairing_modal.generating")}
            </div>
          ) : null}

          {qr_png &&
            !["linked", "expired", "cancelled"].includes(state) &&
            !expired && (
              <>
                <img
                  src={`data:image/png;base64,${qr_png}`}
                  alt={t("agents.pairing_modal.qr_alt")}
                  className="w-56 h-56 border  rounded"
                />
                <p className="text-xs text-text-secondary text-center max-w-xs">
                  {state === "awaiting_user"
                    ? t("agents.pairing_modal.confirm_phone")
                    : t("agents.pairing_modal.scan_help")}
                </p>
              </>
            )}

          {(state === "expired" || expired) && (
            <div className="text-sm text-text-secondary text-center">
              {t("agents.pairing_modal.expired")}
            </div>
          )}

          {state === "linked" && (
            <div className="text-sm text-accent font-medium text-center">
              {device_jid
                ? t("agents.pairing_modal.linked_with", {
                    jid: device_jid.split("@")[0] ?? "",
                  })
                : t("agents.pairing_modal.linked")}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t ">
          <Button variant="ghost" size="sm" onClick={() => void cancel()}>
            {state === "linked"
              ? t("agents.pairing_modal.close")
              : t("common.cancel")}
          </Button>
          {(state === "expired" || expired || state === "error") && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void start()}
              disabled={busy}
            >
              <RefreshCcw size={14} /> {t("agents.pairing_modal.regenerate_qr")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
