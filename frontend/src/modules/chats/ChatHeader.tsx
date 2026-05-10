// Conversation header. Phase 3 rewrite: composes the
// shared `<Header>` primitive instead of redefining the
// avatar + title + actions layout locally.

import { Bell, BellOff, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Header } from "../../components/ui";
import EscalationBadge from "./EscalationBadge";
import type { Conversation } from "../../store/conversations";
import { useMutes } from "../../store/mutes";
import { useT } from "../../i18n";

export default function ChatHeader({ conv }: { conv: Conversation }) {
  const t = useT();
  const muted = useMutes((s) => s.muted.has(conv.key));
  const toggleMute = useMutes((s) => s.toggle);

  // Phase 82.10.r — re-render every 1 s while typing is active so
  // the indicator self-clears once `peer_typing_until_ms` passes.
  // Idle when no peer typing is in flight (no interval registered).
  const [now, setNow] = useState(() => Date.now());
  const typing_active =
    conv.peer_typing_until_ms !== null && conv.peer_typing_until_ms > now;
  useEffect(() => {
    if (conv.peer_typing_until_ms === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [conv.peer_typing_until_ms]);

  const subtitle = typing_active ? (
    <span className="italic text-accent">{t("chat.header.typing")}</span>
  ) : conv.is_paused ? (
    t("chat.header.paused_by_operator")
  ) : (
    <>
      {t("chat.header.via_channel", { channel: conv.channel })}
      {muted && (
        <span className="ml-2 text-text-meta">
          {t("chat.header.muted_suffix")}
        </span>
      )}
    </>
  );

  return (
    <Header
      avatarSeed={conv.key}
      avatarName={conv.contact_label}
      title={conv.contact_label}
      subtitle={subtitle}
      actions={
        <>
          {conv.has_pending_escalation && <EscalationBadge conv={conv} />}
          <Button
            variant="ghost"
            size="md"
            onClick={() => toggleMute(conv.key)}
            title={
              muted
                ? t("chat.header.mute_on_title")
                : t("chat.header.mute_off_title")
            }
            aria-label={
              muted
                ? t("chat.header.mute_on_aria")
                : t("chat.header.mute_off_aria")
            }
            aria-pressed={muted}
          >
            {muted ? <BellOff size={16} /> : <Bell size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="md"
            title={t("chat.header.more_options")}
            disabled
          >
            <MoreVertical size={16} />
          </Button>
        </>
      }
    />
  );
}
