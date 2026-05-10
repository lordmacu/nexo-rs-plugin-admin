import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { adminCall } from "../../api/admin";
import type { Conversation } from "../../store/conversations";
import { Button } from "../../components/ui";
import { useT, t as tStatic } from "../../i18n";

export default function EscalationBadge({ conv }: { conv: Conversation }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    if (!confirm(tStatic("chat.escalation.confirm_dismiss"))) return;
    setBusy(true);
    try {
      await adminCall("nexo/admin/escalations/resolve", {
        scope: {
          kind: "conversation",
          agent_id: conv.agent_id,
          channel: conv.channel,
          account_id: "",
          contact_id: conv.contact_id,
        },
        by: "dismissed",
        dismiss_reason: "Operator dismissed via UI",
      });
    } catch (e) {
      console.warn("escalation resolve failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={dismiss}
      disabled={busy}
      title={t("chat.escalation.title")}
    >
      <AlertOctagon size={14} />
      {t("chat.escalation.label")}
    </Button>
  );
}
