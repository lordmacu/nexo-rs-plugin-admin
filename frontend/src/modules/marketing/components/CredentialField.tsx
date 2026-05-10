// Password input + "Probar conexión" button. Used by the
// marketing wizard, MailboxFormEditor, and SellerForm so the
// operator never sees the underlying env-var name; they just
// type a password and (optionally) hit Probar to confirm the
// credentials authenticate against the configured host.
//
// The save flow lives in the parent: this component owns the
// password state + the live probe, but does NOT call
// `saveCredential` itself. Parents call it once they're ready
// to commit (typically right before PUT /config/{mailboxes,sellers}).

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button, Field, Input, Text } from "../../../components/ui";
import { useT } from "../../../i18n";
import {
  probeImap,
  probeSmtp,
  type CredentialProbeResponse,
} from "../../../api/marketing";

export interface CredentialFieldProps {
  /** `imap` ⇒ probe runs against IMAP; `smtp` ⇒ SMTP. */
  scope: "imap" | "smtp";
  value: string;
  onChange: (next: string) => void;
  /** When `true`, hint copy reflects "leave empty to keep
   *  current password" (edit flow). When `false`, password is
   *  required (first-time setup flow). */
  hasExistingSecret?: boolean;
  /** Connection params used by the live probe button. */
  probe: {
    host: string;
    port: number;
    username: string;
    /** IMAP only — `"implicittls"` (993) | `"starttls"` (143). */
    tls?: "implicittls" | "starttls";
    /** SMTP only — `true` ⇒ STARTTLS (587), `false` ⇒ implicit (465). */
    starttls?: boolean;
  };
  /** Forwarded to the underlying `<Input>` for assertions. */
  inputTestId?: string;
}

export default function CredentialField({
  scope,
  value,
  onChange,
  hasExistingSecret = false,
  probe,
  inputTestId,
}: CredentialFieldProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CredentialProbeResponse | null>(null);
  const [needsPasswordWarning, setNeedsPasswordWarning] = useState(false);

  const onProbe = async () => {
    if (!value.trim()) {
      setNeedsPasswordWarning(true);
      setResult(null);
      return;
    }
    setNeedsPasswordWarning(false);
    setBusy(true);
    setResult(null);
    try {
      const r =
        scope === "imap"
          ? await probeImap({
              host: probe.host,
              port: probe.port,
              username: probe.username,
              password: value,
              tls: probe.tls ?? "implicittls",
            })
          : await probeSmtp({
              host: probe.host,
              port: probe.port,
              username: probe.username,
              password: value,
              starttls: probe.starttls ?? true,
            });
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const hint = hasExistingSecret
    ? t("marketing.credentials.password_hint_existing")
    : t("marketing.credentials.password_hint");

  return (
    <Field label={t("marketing.credentials.password_label")} hint={hint}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
        <Input
          type="password"
          value={value}
          onChange={(e) => {
            // Strip whitespace — Google app passwords ship with
            // spaces ("xxxx xxxx xxxx xxxx") and operators tend
            // to paste them verbatim. Auth fails because the
            // wire shape rejects spaces.
            onChange(e.target.value.replace(/\s+/g, ""));
            setNeedsPasswordWarning(false);
            setResult(null);
          }}
          onPaste={(e) => {
            // Belt + suspenders for the paste path: some browsers
            // dispatch onPaste before the value is committed via
            // onChange, which would let a stray newline land for
            // a frame.
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            onChange(pasted.replace(/\s+/g, ""));
            setNeedsPasswordWarning(false);
            setResult(null);
          }}
          placeholder={t("marketing.credentials.password_placeholder")}
          autoComplete="new-password"
          className="flex-1"
          {...(inputTestId ? { "data-testid": inputTestId } : {})}
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          busy={busy}
          onClick={() => void onProbe()}
        >
          {busy
            ? t("marketing.credentials.probing")
            : t("marketing.credentials.probe_button")}
        </Button>
      </div>
      {needsPasswordWarning && (
        <Text tone="meta" size="xs">
          {t("marketing.credentials.probe_need_password")}
        </Text>
      )}
      {result && (
        <div
          className={`mt-1 flex items-start gap-1.5 rounded px-2 py-1 text-xs ${
            result.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? (
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={13} className="mt-0.5 shrink-0" />
          )}
          <span className="break-words">
            {result.ok
              ? t("marketing.credentials.probe_ok", { message: result.message })
              : t("marketing.credentials.probe_fail", {
                  message: result.message,
                })}
          </span>
        </div>
      )}
    </Field>
  );
}
