// M2.b.frame.emit (Phase 82.10.o framework integration) —
// operator-driven bearer rotation.
//
// Header icon button → modal with optional new-token + reason
// fields → POST nexo/admin/auth/rotate_token. The daemon
// persists the new value, pushes nexo/notify/token_rotated to
// every connected microapp's stdin queue, and emits the audit
// row on the firehose. Our LiveTokenState listener swaps the
// in-memory bearer in-place; the SPA's next admin call then
// gets a 401 → M2.b.notify-spa toast → /login redirect.
//
// UX:
// - Empty new_token → daemon generates a 32-byte hex random.
// - Length validation client-side (16 chars min) mirrors the
//   server's MIN_TOKEN_LEN floor so the operator gets immediate
//   feedback.
// - Reason capped at 200 chars (REASON_MAX_LEN); server
//   truncates beyond that, but we surface the limit in the UI
//   so audit entries stay legible.
// - On success, surface the truncated new_hash + a "vuelve a
//   iniciar sesión con el nuevo token" message; the silent-401
//   path will then take over.
// - When the daemon hasn't granted `auth_rotate`, the call
//   fails with capability_not_granted → toast surfaces it.

import { useEffect, useRef, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { adminCall } from "../api/admin";
import { useToast } from "../store/toast";
import { Button, Input } from "../components/ui";
import { useT } from "../i18n";

const MIN_TOKEN_LEN = 16;
const REASON_MAX_LEN = 200;

interface AuthRotateResponse {
  ok: boolean;
  new_hash: string;
  at_ms: number;
}

export interface RotateTokenButtonProps {
  /** Header button styling — inline icon. */
  className?: string;
}

export default function RotateTokenButton({
  className,
}: RotateTokenButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setOpen(true)}
        className={className}
        title={t("auth.token.button_title")}
        aria-label={t("auth.token.button_title")}
      >
        <KeyRound size={18} />
      </Button>
      {open && <RotateTokenModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function RotateTokenModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [new_token, setNewToken] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [validation_error, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function client_side_validate(): string | null {
    const trimmed = new_token.trim();
    if (trimmed.length === 0) return null; // empty → daemon generates
    if (trimmed.length < MIN_TOKEN_LEN)
      return t("auth.token.error_min", { min: MIN_TOKEN_LEN });
    return null;
  }

  async function submit() {
    const err = client_side_validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setBusy(true);
    const trimmed_token = new_token.trim();
    const trimmed_reason = reason.trim();
    try {
      const resp = await adminCall<AuthRotateResponse>(
        "nexo/admin/auth/rotate_token",
        {
          ...(trimmed_token.length > 0 ? { new_token: trimmed_token } : {}),
          ...(trimmed_reason.length > 0
            ? { reason: trimmed_reason.slice(0, REASON_MAX_LEN) }
            : {}),
        },
      );
      // Surface the new_hash so the operator can paste it into
      // their password manager + restart with the matching env
      // var on next boot.
      useToast.getState().push({
        kind: "info",
        text:
          trimmed_token.length > 0
            ? t("auth.token.toast_success_with_token", { hash: resp.new_hash })
            : t("auth.token.toast_success_generated", { hash: resp.new_hash }),
        ttl_ms: 12_000,
      });
      onClose();
      // The 401 on the next admin call (M2.b.notify-spa)
      // triggers the redirect-to-login flow. We don't navigate
      // here directly — keeps the UX consistent with other
      // session-invalidation paths.
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // capability_not_granted, invalid_params, transport, etc.
      // all flow through here. Shape the toast based on the
      // error code if available.
      const lower = msg.toLowerCase();
      if (lower.includes("capability_not_granted")) {
        useToast.getState().push({
          kind: "error",
          text: t("auth.token.toast_capability"),
          ttl_ms: 8000,
        });
      } else if (lower.includes("invalid_params")) {
        useToast.getState().push({
          kind: "warn",
          text: t("auth.token.toast_invalid_params", { message: msg }),
          ttl_ms: 6000,
        });
      } else {
        useToast.getState().push({
          kind: "error",
          text: t("auth.token.toast_error", { message: msg }),
          ttl_ms: 8000,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t("auth.token.modal_title")}
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4 bg-black/30"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-lg shadow-xl border  overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b ">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-text-secondary" />
            <h2 className="text-base font-medium text-text-primary">
              {t("auth.token.modal_title")}
            </h2>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={busy}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-text-secondary">
            {t("auth.token.intro")}
          </p>

          <Field
            label={t("auth.token.field_new", { min: MIN_TOKEN_LEN })}
          >
            <Input
              ref={inputRef}
              value={new_token}
              onChange={(e) => {
                setNewToken(e.target.value);
                setValidationError(null);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder={t("auth.token.field_new_placeholder")}
              className="w-full border rounded px-3 py-2 text-sm font-mono"
            />
            {validation_error && (
              <span className="block text-xs text-red-600 mt-1">
                {validation_error}
              </span>
            )}
          </Field>

          <Field label={t("auth.token.field_reason")}>
            <Input
              value={reason}
              onChange={(e) =>
                setReason(e.target.value.slice(0, REASON_MAX_LEN))
              }
              maxLength={REASON_MAX_LEN}
              placeholder={t("auth.token.reason_placeholder")}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <span className="block text-xs text-text-meta mt-1">
              {reason.length}/{REASON_MAX_LEN}
            </span>
          </Field>
        </div>

        <div className="px-4 py-3 border-t  flex items-center justify-end gap-2 bg-panel-alt/50">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? t("auth.token.rotating") : t("auth.token.rotate")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
