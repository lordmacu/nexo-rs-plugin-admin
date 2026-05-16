// Phase 81.30 — plugin-driven pairing UI modal.
//
// One generic component that switches by `channel.kind` to render
// the right pairing flow:
//   - "qr"     → existing QR flow via pairing/start + SSE polling
//   - "form"   → dynamic field form submitted to credentials/register
//   - "info"   → instructions only + Continue button (channel
//                already configured out-of-band via YAML)
//   - "custom" → instructions + subscription to plugin's notify
//                method until a terminal state arrives
//
// No per-channel hardcoded logic in this file. The shape is
// entirely driven by the descriptor from
// `nexo/admin/pairing/channels`.

import { useEffect, useState } from "react";
import { RefreshCcw, X } from "lucide-react";
import { adminCall } from "../../api/admin";
import { subscribePairingStream } from "../../api/pairing";
import type { PairingStatus, PairingStateWire } from "../../api/types";
import type { PairingChannelInfo } from "../../api/types.gen";
import { Button, Input, Spinner } from "../ui";
import { useT } from "../../i18n";

interface PairingStartResponse {
  challenge_id: string;
  expires_at_ms: number;
  qr_png_base64?: string;
  qr_ascii?: string;
  instructions?: string;
}

interface PairingModalProps {
  open: boolean;
  /** Descriptor for the channel the operator picked. */
  channel: PairingChannelInfo;
  /** Draft agent id (used as `agent_id` for `pairing/start`).
   *  Wizard step 3 owns the real id; the QR start tolerates an
   *  empty string by using "bootstrap" — keep behavior parity. */
  agentIdHint: string;
  /** Fired when the channel is successfully paired. `instance`
   *  is the device JID (qr), the operator-typed username (form),
   *  or empty (info). */
  onPaired: (channel: string, instance: string) => void;
  onClose: () => void;
}

export default function PairingModal({
  open,
  channel,
  agentIdHint,
  onPaired,
  onClose,
}: PairingModalProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={channel.label}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] bg-white rounded-lg shadow-xl border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-medium text-text-primary">
            {channel.label}
          </h2>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {channel.instructions && (
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {channel.instructions}
            </p>
          )}

          {channel.kind === "qr" && (
            <QrFlow
              channelId={channel.channel}
              agentIdHint={agentIdHint}
              onPaired={(jid) => onPaired(channel.channel, jid)}
            />
          )}
          {channel.kind === "form" && (
            <FormFlow
              channel={channel}
              onPaired={(instance) => onPaired(channel.channel, instance)}
            />
          )}
          {channel.kind === "info" && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onPaired(channel.channel, "")}
            >
              {t("wizard.pairing.continue")}
            </Button>
          )}
          {channel.kind === "custom" && channel.notify_method && (
            <CustomFlow
              channelId={channel.channel}
              agentIdHint={agentIdHint}
              notifyMethod={channel.notify_method}
              onTerminal={(ok, instance) =>
                ok ? onPaired(channel.channel, instance) : onClose()
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── QR flow ──────────────────────────────────────────────────

function QrFlow({
  channelId,
  agentIdHint,
  onPaired,
}: {
  channelId: string;
  agentIdHint: string;
  onPaired: (instance: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [state, setState] = useState<
    "idle" | "qr_ready" | "awaiting_user" | "linked" | "expired" | "error"
  >("idle");
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const resp = await adminCall<PairingStartResponse>(
        "nexo/admin/pairing/start",
        { agent_id: agentIdHint || "bootstrap", channel: channelId },
      );
      setChallengeId(resp.challenge_id);
      setExpiresAtMs(resp.expires_at_ms);
      setState("qr_ready");
      if (resp.qr_png_base64) setQrPng(resp.qr_png_base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  // SSE + 5 s polling fallback.
  useEffect(() => {
    if (!challengeId || ["linked", "expired", "error"].includes(state)) return;
    let cancelled = false;

    function apply(status: PairingStatus) {
      if (cancelled) return;
      const next = mapWireState(status.state);
      setState(next);
      if (status.data?.qr_png_base64) setQrPng(status.data.qr_png_base64);
      if (next === "linked") {
        const jid = status.data?.device_jid ?? "";
        window.setTimeout(() => onPaired(jid), 600);
      }
    }

    const closeSse = subscribePairingStream({
      challenge_id: challengeId,
      onUpdate: apply,
    });

    async function poll() {
      if (cancelled || !challengeId) return;
      try {
        const r = await adminCall<PairingStatus>(
          "nexo/admin/pairing/status",
          { challenge_id: challengeId },
        );
        apply(r);
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
  }, [challengeId]);

  const expired = expiresAtMs !== null && expiresAtMs < Date.now();

  return (
    <div className="space-y-3">
      {!qrPng && state === "idle" && (
        <Button variant="primary" size="md" onClick={start} disabled={busy}>
          {busy ? <Spinner size="md" /> : null}
          {t("wizard.pairing.generate_qr")}
        </Button>
      )}

      {qrPng && state !== "linked" && !expired && (
        <>
          <div className="inline-block p-4 bg-white border rounded">
            <img
              src={`data:image/png;base64,${qrPng}`}
              alt={t("wizard.pairing.qr_alt")}
              className="w-64 h-64"
            />
          </div>
          <div className="text-sm text-text-secondary flex items-center gap-2">
            {state === "awaiting_user" ? (
              <>
                <Spinner size="md" />
                {t("wizard.pairing.confirming")}
              </>
            ) : (
              t("wizard.pairing.waiting")
            )}
          </div>
          <Button variant="ghost" size="md" onClick={start}>
            <RefreshCcw size={12} />
            {t("wizard.pairing.regenerate_qr")}
          </Button>
        </>
      )}

      {(state === "expired" || expired) && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 space-y-2">
          <div>{t("wizard.pairing.expired")}</div>
          <Button variant="secondary" size="md" onClick={start}>
            {t("wizard.pairing.regenerate_code")}
          </Button>
        </div>
      )}

      {state === "linked" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
          {t("wizard.pairing.linked")}
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

// ── Form flow ────────────────────────────────────────────────

function FormFlow({
  channel,
  onPaired,
}: {
  channel: PairingChannelInfo;
  onPaired: (instance: string) => void;
}) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = channel.fields ?? [];

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  const canSubmit = fields.every(
    (f) => !f.required || (values[f.name] ?? "").trim() !== "",
  );

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      // Phase 81.30 follow-up #4 — descriptor-driven instance
      // field. Plugin declares `instance_field` to name the form
      // field whose value should become the credential's
      // `instance` discriminator. Defaults to the literal
      // "instance" for backwards-compat with WhatsApp + Telegram
      // (both ship that field name today).
      const instanceFieldName = channel.instance_field ?? "instance";
      const instance = values[instanceFieldName] ?? "";
      // Everything else lands in the credential payload as-is.
      const payload: Record<string, string> = {};
      for (const f of fields) {
        if (f.name === instanceFieldName) continue;
        payload[f.name] = values[f.name] ?? "";
      }
      await adminCall<unknown>("nexo/admin/credentials/register", {
        channel: channel.channel,
        instance: instance || null,
        agent_ids: [],
        payload,
      });
      onPaired(instance);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const body = (e as { body?: { message?: string } }).body;
      setError(body?.message ?? msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="block text-xs font-medium text-text-secondary mb-1">
            {f.label}
            {f.required && <span className="text-red-600"> *</span>}
          </span>
          <Input
            type={f.sensitive ? "password" : "text"}
            value={values[f.name] ?? ""}
            onChange={(e) => setField(f.name, e.target.value)}
            placeholder={f.placeholder ?? ""}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {f.help && (
            <span className="block text-xs text-text-meta mt-1">{f.help}</span>
          )}
        </label>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="md"
        onClick={submit}
        disabled={busy || !canSubmit}
      >
        {busy ? <Spinner size="md" /> : null}
        {t("wizard.pairing.form_submit")}
      </Button>
    </div>
  );
}

// ── Custom flow ──────────────────────────────────────────────
//
// Phase 81.30 follow-up #3 — wire the descriptor's `notify_method`
// to the same SSE + polling pipeline the QR flow already uses.
//
// Protocol contract: a plugin shipping `kind = "custom"` must:
//   1. Implement a pairing trigger whose `start()` returns
//      `PairingHandle` and pushes state into the shared
//      `PairingChallengeStore` (same store as QR uses).
//   2. Drive transitions Pending → AwaitingUser → Linked|Error.
//      `data.device_jid` (or equivalent) carries the instance id
//      back to the wizard at terminal state.
//
// This is the SAME contract WhatsApp's `WhatsappPairingTrigger`
// already follows — Custom plugins reuse the wire without adding
// a new RPC family.

function CustomFlow({
  channelId,
  agentIdHint,
  notifyMethod,
  onTerminal,
}: {
  channelId: string;
  agentIdHint: string;
  notifyMethod: string;
  onTerminal: (ok: boolean, instance: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [state, setState] = useState<
    "idle" | "awaiting" | "linked" | "expired" | "error"
  >("idle");

  // notifyMethod is informational here (the SSE stream below
  // subscribes via challenge_id, not by method name) — but we
  // keep it in scope so future SSE multiplexers can route on it.
  void notifyMethod;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const resp = await adminCall<PairingStartResponse>(
        "nexo/admin/pairing/start",
        { agent_id: agentIdHint || "bootstrap", channel: channelId },
      );
      setChallengeId(resp.challenge_id);
      setState("awaiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!challengeId || ["linked", "expired", "error"].includes(state)) return;
    let cancelled = false;

    function apply(status: PairingStatus) {
      if (cancelled) return;
      const wire = mapWireState(status.state);
      // Collapse the QR-specific "qr_ready" / "awaiting_user"
      // wire states into the custom flow's two non-terminal
      // names ("idle" / "awaiting") — the modal does not render
      // a QR for custom kinds.
      const next: "idle" | "awaiting" | "linked" | "expired" | "error" =
        wire === "linked"
          ? "linked"
          : wire === "expired"
            ? "expired"
            : "awaiting";
      setState(next);
      if (next === "linked") {
        const instance = status.data?.device_jid ?? "";
        window.setTimeout(() => onTerminal(true, instance), 600);
      } else if (next === "expired") {
        window.setTimeout(() => onTerminal(false, ""), 600);
      }
    }

    const closeSse = subscribePairingStream({
      challenge_id: challengeId,
      onUpdate: apply,
    });

    async function poll() {
      if (cancelled || !challengeId) return;
      try {
        const r = await adminCall<PairingStatus>(
          "nexo/admin/pairing/status",
          { challenge_id: challengeId },
        );
        apply(r);
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
  }, [challengeId]);

  return (
    <div className="space-y-3">
      {state === "idle" && (
        <Button variant="primary" size="md" onClick={start} disabled={busy}>
          {busy ? <Spinner size="md" /> : null}
          {t("wizard.pairing.continue")}
        </Button>
      )}
      {state === "awaiting" && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="md" />
          {t("wizard.pairing.custom_waiting")}
        </div>
      )}
      {state === "linked" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
          {t("wizard.pairing.linked")}
        </div>
      )}
      {state === "expired" && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
          {t("wizard.pairing.expired")}
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
