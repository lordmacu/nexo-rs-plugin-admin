// Step 2 — channel selector backed by plugin-driven pairing
// descriptors (`nexo/admin/pairing/channels`).
//
// The operator picks a channel from the catalog the daemon
// reports. Selecting one opens `PairingModal`, which routes to
// the right flow based on `channel.kind` (qr / form / info /
// custom). On success the modal closes and the wizard advances.

import { useEffect, useState } from "react";
import { listPairingChannels } from "../../api/pairing";
import type { PairingChannelInfo } from "../../api/types.gen";
import { useWizard } from "../../store/wizard";
import { useLocaleStore } from "../../i18n/store";
import { Button, Select, Spinner } from "../ui";
import { useT } from "../../i18n";
import PairingModal from "./PairingModal";

interface StepPairingProps {
  onContinue: () => void;
  /** Legacy prop kept for backwards-compat with the old wizard
   *  wiring; no longer used by this descriptor-driven version. */
  availableChannels?: string[];
}

export default function StepPairing({ onContinue }: StepPairingProps) {
  const t = useT();
  const pairing = useWizard((s) => s.pairing);
  const updatePairing = useWizard((s) => s.updatePairing);
  const agent = useWizard((s) => s.agent);
  const locale = useLocaleStore((s) => s.locale);

  const [channels, setChannels] = useState<PairingChannelInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedChannel = pairing.selected_channel || "whatsapp";

  useEffect(() => {
    let cancelled = false;
    listPairingChannels(locale)
      .then((resp) => {
        if (cancelled) return;
        setChannels(resp.channels);
        // Auto-pick the first channel that has a kind set so the
        // initial render doesn't show a blank selector.
        if (
          resp.channels.length > 0 &&
          !resp.channels.find((c) => c.channel === selectedChannel)
        ) {
          updatePairing({ selected_channel: resp.channels[0].channel });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setChannels([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const picked = channels?.find((c) => c.channel === selectedChannel) ?? null;

  function onChannelChange(ch: string) {
    updatePairing({ selected_channel: ch });
  }

  function onPaired(channel: string, instance: string) {
    const patch: Partial<{
      selected_channel: string;
      device_jid: string;
      state: "linked";
    }> = { selected_channel: channel, state: "linked" };
    if (instance) patch.device_jid = instance;
    updatePairing(patch);
    setModalOpen(false);
    onContinue();
  }

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

      {channels === null && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="md" />
          {t("wizard.pairing.loading_channels")}
        </div>
      )}

      {channels !== null && channels.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          {t("wizard.pairing.no_channels")}
        </div>
      )}

      {channels !== null && channels.length > 0 && (
        <>
          <div>
            <span className="block text-xs font-medium text-text-secondary mb-1">
              {t("wizard.pairing.channel_label")}
            </span>
            <Select
              value={selectedChannel}
              onChange={(e) => onChannelChange(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              {channels.map((ch) => (
                <option key={ch.channel} value={ch.channel}>
                  {ch.label}
                  {ch.linked_instances && ch.linked_instances.length > 0
                    ? ` · ✓`
                    : ""}
                </option>
              ))}
            </Select>
          </div>

          {picked && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setModalOpen(true)}
            >
              {t("wizard.pairing.open_modal")}
            </Button>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {picked && (
        <PairingModal
          open={modalOpen}
          channel={picked}
          agentIdHint={agent.id || ""}
          onPaired={onPaired}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
