// Empty state when no lead is selected. Reads everything
// from the live stores: leads + mailboxes config + drafts
// inbox (count of pending). When the extension is offline
// the counters render as zeros + the bottom banner flips
// to "Extension off" so the operator sees a clean empty
// state instead of mock fixtures.

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Inbox, Sparkles } from "lucide-react";

import { EmptyState, Stat } from "../../components/ui";
import { useT } from "../../i18n";
import { listDraftsInbox } from "../../api/marketing";
import { useMarketingConfig } from "../../store/marketingConfig";
import { useMarketingLeads } from "../../store/marketingLeads";
import MarketingWizard, {
  useMarketingWizardVisibility,
} from "./MarketingWizard";

export default function InboxEmpty() {
  const t = useT();
  const liveLeads = useMarketingLeads((s) => s.leads);
  const source = useMarketingLeads((s) => s.source);
  const fetchLeads = useMarketingLeads((s) => s.fetch);
  const startLive = useMarketingLeads((s) => s.startLive);

  const mailboxesSlice = useMarketingConfig((s) => s.mailboxes);
  const fetchAllConfig = useMarketingConfig((s) => s.fetchAll);

  const [pendingDrafts, setPendingDrafts] = useState<number | null>(null);

  useEffect(() => {
    void fetchLeads();
    void fetchAllConfig();
  }, [fetchLeads, fetchAllConfig]);

  useEffect(() => {
    return startLive();
  }, [startLive]);

  useEffect(() => {
    let cancelled = false;
    listDraftsInbox({ limit: 200 })
      .then((r) => {
        if (!cancelled) setPendingDrafts(r.count);
      })
      .catch(() => {
        if (!cancelled) setPendingDrafts(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalLeads = liveLeads.length;
  const followups = liveLeads.filter(
    (l) =>
      l.next_check_at_ms !== null &&
      l.next_check_at_ms < Date.now() + 86_400_000,
  ).length;
  const mailboxesCount =
    mailboxesSlice.source === "api" ? mailboxesSlice.data.length : 0;

  // First-run wizard. Auto-shows when the marketing config is
  // empty AND the operator hasn't dismissed yet. Once mailbox
  // + seller exist, `useMarketingWizardVisibility` returns
  // `false` permanently for this tenant.
  const wizard = useMarketingWizardVisibility();

  const sourceTone =
    source === "api"
      ? "text-success"
      : source === "error"
        ? "text-danger"
        : "text-warning";
  const sourceLabel =
    source === "api"
      ? t("marketing.health.live", {
          leads: liveLeads.length,
          mailboxes: mailboxesCount,
        })
      : source === "error"
        ? t("marketing.health.error")
        : t("marketing.health.loading");

  return (
    <>
      {wizard.visible && <MarketingWizard onClose={wizard.dismiss} />}
      <EmptyState
        icon={<Inbox size={32} />}
        title={t("marketing.empty.title")}
        body={t("marketing.empty.body")}
      >
        <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            icon={<Inbox size={14} />}
            n={totalLeads}
            label={t("marketing.stat.leads")}
            tone="info"
          />
          <Stat
            icon={<Sparkles size={14} />}
            n={pendingDrafts}
            label={t("marketing.stat.drafts_pending")}
            tone="accent"
          />
          <Stat
            icon={<Clock size={14} />}
            n={followups}
            label={t("marketing.stat.followups_today")}
            tone="warning"
          />
        </div>
        <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border bg-panel px-4 py-2 text-xs text-text-secondary shadow-sm">
          <CheckCircle2 size={12} className={sourceTone} />
          {sourceLabel}
        </div>
      </EmptyState>
    </>
  );
}
