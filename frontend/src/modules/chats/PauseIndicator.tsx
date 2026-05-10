import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { adminCall } from "../../api/admin";
import type { Conversation } from "../../store/conversations";
import { Button } from "../../components/ui";
import { useT } from "../../i18n";

export default function PauseIndicator({ conv }: { conv: Conversation }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function resume() {
    if (busy) return;
    setBusy(true);
    try {
      // M7.c — `operator_token_hash` is stamped server-side by
      // the microapp's `/api/admin` proxy from the validated
      // bearer. The SPA no longer hashes the token client-side.
      await adminCall("nexo/admin/processing/resume", {
        scope: {
          kind: "conversation",
          agent_id: conv.agent_id,
          channel: conv.channel,
          account_id: "",
          contact_id: conv.contact_id,
        },
      });
    } catch (e) {
      console.warn("resume failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-yellow-900">
        <PauseCircle size={18} className="text-yellow-700" />
        {t("chat.pause.message")}
      </div>
      <Button variant="secondary" size="md" onClick={resume} disabled={busy}>
        {busy ? t("chat.pause.resuming") : t("chat.pause.resume")}
      </Button>
    </div>
  );
}
