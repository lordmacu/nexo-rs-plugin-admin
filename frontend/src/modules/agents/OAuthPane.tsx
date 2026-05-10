// Phase 82.10.u — OAuth flow pane. Renders the SPA-side of the
// auth-code (Anthropic) and device-code (MiniMax) flows.
//
// Auth-code: open URL in new tab → operator pastes `<code>#<state>`
// from the callback page → SPA calls `oauth_finish`.
// Device-code: show user_code + verification_uri → SPA calls
// `oauth_finish` with no code; the daemon polls until success.

import { useState } from "react";
import { useOAuthFlow } from "../../lib/oauthFlow";
import { Button, Code, Input } from "../../components/ui";
import { useT } from "../../i18n";

interface Props {
  instance_id: string;
  onSuccess: (secret_id: string) => void;
  onCancel: () => void;
}

export function OAuthPane({ instance_id, onSuccess, onCancel }: Props) {
  const t = useT();
  const state = useOAuthFlow((s) => s.state);
  const finish = useOAuthFlow((s) => s.finish);
  const reset = useOAuthFlow((s) => s.reset);
  const [pasted, setPasted] = useState("");

  if (state.kind === "idle" || state.kind === "starting") {
    return (
      <div className="text-sm text-gray-500">{t("agents.oauth.starting")}</div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">
          {t("agents.oauth.error", { message: state.message })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            {t("agents.oauth.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  if (state.kind === "success") {
    // Auto-advance — modal owner reads secret_id + closes.
    onSuccess(state.secret_id);
    return null;
  }

  if (state.kind === "exchanging") {
    return (
      <div className="text-sm text-gray-500">{t("agents.oauth.exchanging")}</div>
    );
  }

  // awaiting_user
  if (state.flow_kind === "auth_code") {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {t("agents.oauth.auth_step1_prefix")}
          <a
            href={state.authorize_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {t("agents.oauth.auth_step1_link")}
          </a>
          {t("agents.oauth.auth_step1_suffix")}
        </p>
        <p className="text-sm">
          {t("agents.oauth.auth_step2_prefix")}
          <Code>
            &lt;code&gt;#&lt;state&gt;
          </Code>
          {t("agents.oauth.auth_step2_suffix")}
        </p>
        <Input
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
          placeholder={t("agents.oauth.code_placeholder")}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!pasted.trim()}
            onClick={() => finish(instance_id, pasted.trim())}
          >
            {t("agents.oauth.confirm")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            {t("agents.oauth.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  // device_code
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {t("agents.oauth.device_step1_prefix")}
        <a
          href={state.authorize_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {state.authorize_url}
        </a>
      </p>
      <p className="text-sm">{t("agents.oauth.device_step2")}</p>
      <Code>
        {state.user_code}
      </Code>
      <p className="text-sm text-gray-600">
        {t("agents.oauth.device_step3")}
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => finish(instance_id)}>
          {t("agents.oauth.confirm")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            reset();
            onCancel();
          }}
        >
          {t("agents.oauth.cancel")}
        </Button>
      </div>
    </div>
  );
}
