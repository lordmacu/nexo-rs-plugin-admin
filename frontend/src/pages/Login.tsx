import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, KeyRound } from "lucide-react";

import { useAuth } from "../store/auth";
import { adminCall } from "../api/admin";
import { reset_session_expired_dedup } from "../api/client";
import { Button, Textarea } from "../components/ui";
import { useT } from "../i18n";

async function fetchAutoToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token");
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: string; token?: string };
    return data.ok === "true" && data.token ? data.token : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const t = useT();
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // null = checking, false = strict mode (show form), true = auto-logging in
  const [autoLogging, setAutoLogging] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAutoToken().then(async (autoToken) => {
      if (cancelled) return;
      if (!autoToken) {
        setAutoLogging(false);
        return;
      }
      setAutoLogging(true);
      login(autoToken);
      reset_session_expired_dedup();
      if (!cancelled) nav("/m/chats", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [login, nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setError(t("auth.login.error_empty"));
      return;
    }
    setBusy(true);
    login(trimmed);
    reset_session_expired_dedup();
    try {
      await adminCall("nexo/admin/agents/list", {});
      nav("/chat", { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("auth.login.error_default");
      setError(msg);
      setBusy(false);
    }
  }

  // Still checking or auto-login in progress — show nothing (avoids flash).
  if (autoLogging !== false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-panel-alt">
        <div className="text-text-meta text-sm">{t("app.bootstrap.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-alt">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <KeyRound className="text-white" size={32} />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-text-primary text-center mb-2">
          {t("auth.login.title")}
        </h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          {t("auth.login.subtitle")}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t("auth.login.token_placeholder")}
            rows={3}
            className="w-full px-3 py-2 border  rounded-md text-sm font-mono focus:outline-none focus:border-accent resize-none"
            autoFocus
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <Button variant="primary" size="md" type="submit" disabled={busy}>
            <LogIn size={18} />
            {busy ? t("auth.login.connecting") : t("auth.login.connect")}
          </Button>
        </form>
      </div>
    </div>
  );
}
