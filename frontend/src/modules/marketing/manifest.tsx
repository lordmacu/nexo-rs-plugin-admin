// `marketing` module manifest. Mock — populated from
// `data/mockData.ts` instead of /api/marketing/*. Wire shapes
// match the planned M15 extension contract so swapping the
// data source later is a one-file change.

import { Mail } from "lucide-react";

import type { CmdkActionLike, ModuleManifest } from "../../shell/types";
import { useMarketingLeads } from "../../store/marketingLeads";
import { useMarketingPersons } from "../../store/marketingPersons";
import DraftsInboxView from "./DraftsInboxView";
import HealthView from "./HealthView";
import InboxEmpty from "./InboxEmpty";
import LeadContextPanel from "./LeadContextPanel";
import LeadDetail from "./LeadDetail";
import MarketingSidebar from "./MarketingSidebar";
import SettingsView, {
  SettingsAudit,
  SettingsDraftAiTemplate,
  SettingsDraftTemplates,
  SettingsFollowup,
  SettingsGuardrails,
  SettingsMailboxes,
  SettingsRules,
  SettingsSellers,
  SettingsSnippets,
  SettingsTemplates,
} from "./SettingsView";
import SpamFilterSettings from "./SpamFilterSettings";
import MarketingStateSettings from "./MarketingStateSettings";
import ScoringSettings from "./ScoringSettings";
import EmailTemplatesList from "./EmailTemplatesList";
import EmailTemplateEditor from "./EmailTemplateEditor";
import ComposeWithBuilder from "./ComposeWithBuilder";
import ComposeQuickView from "./ComposeQuickView";
import SentEmailsView from "./SentEmailsView";
import SavedDraftsView from "./SavedDraftsView";

export const manifest: ModuleManifest = {
  id: "marketing",
  // Semver triple required by ModuleManifestSchema. Mock
  // status indicated via the 0.x major.
  version: "0.1.0",
  rail: {
    icon: <Mail size={18} />,
    label: "Marketing",
    tooltip: "Email marketing — leads + automation",
    order: 50,
    badge: () => {
      // Pending drafts is the most useful "needs operator
      // attention" signal we have live; reads from the leads
      // store seeded by the firehose. Returning null hides
      // the badge when nothing's pending.
      const leads = useMarketingLeads.getState().leads;
      return leads.length > 0 ? leads.length : null;
    },
  },
  routes: [
    { path: "", element: <InboxEmpty /> },
    { path: "leads/:lead_id", element: <LeadDetail /> },
    // /compose → quick rapid page (default new email).
    // /compose/builder → full block-builder page.
    // Old /compose URLs (which used to land on the builder)
    // still work because the quick page has a header link
    // that bounces to /compose/builder.
    { path: "compose", element: <ComposeQuickView /> },
    { path: "compose/builder", element: <ComposeWithBuilder /> },
    { path: "sent", element: <SentEmailsView /> },
    { path: "drafts-saved", element: <SavedDraftsView /> },
    { path: "drafts", element: <DraftsInboxView /> },
    { path: "health", element: <HealthView /> },
    {
      path: "settings",
      element: <SettingsView />,
      children: [
        { index: true, element: <SettingsMailboxes /> },
        { path: "mailboxes", element: <SettingsMailboxes /> },
        { path: "sellers", element: <SettingsSellers /> },
        { path: "rules", element: <SettingsRules /> },
        { path: "followup", element: <SettingsFollowup /> },
        { path: "templates", element: <SettingsTemplates /> },
        { path: "drafts", element: <SettingsDraftTemplates /> },
        { path: "draft_template", element: <SettingsDraftAiTemplate /> },
        { path: "snippets", element: <SettingsSnippets /> },
        { path: "guardrails", element: <SettingsGuardrails /> },
        { path: "audit", element: <SettingsAudit /> },
        { path: "spam-filter", element: <SpamFilterSettings /> },
        { path: "scoring", element: <ScoringSettings /> },
        { path: "state", element: <MarketingStateSettings /> },
        { path: "email-templates", element: <EmailTemplatesList /> },
        { path: "email-templates/:template_id", element: <EmailTemplateEditor /> },
      ],
    },
  ],
  sidebar: MarketingSidebar,
  contextPanel: LeadContextPanel,
  // Lead context drawer is only useful when actually
  // looking at a lead — settings / compose / sent /
  // drafts pages would just show an empty pane that eats
  // viewport. Restrict the panel to the lead-detail route
  // so the rest of the module stretches to full width.
  shouldShowContextPanel: (pathname: string): boolean => {
    return /^\/m\/marketing\/leads\/[^/]+/.test(pathname);
  },
  capabilities: { tenantSwitch: true },
  cmdK: (ctx) => {
    const out: CmdkActionLike[] = [];

    // Jump to a lead — top 10 by recency from the live
    // store. Person display name comes from the persons
    // cache when hydrated; falls through to the lead's
    // person_id (an email or placeholder uuid) otherwise
    // so the suggestion still has a useful label.
    const leads = useMarketingLeads.getState().leads;
    const personsById = useMarketingPersons.getState().byId;
    [...leads]
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms)
      .slice(0, 10)
      .forEach((lead) => {
        const person = personsById[lead.person_id]?.person;
        const label = person?.primary_name ?? lead.person_id;
        out.push({
          id: `marketing:goto:${lead.id}`,
          label: `Lead · ${label} — ${lead.subject}`,
          group: "Leads",
          run: () => ctx.navigate(`/m/marketing/leads/${lead.id}`),
        });
      });

    out.push({
      id: "marketing:drafts",
      label: "Marketing · Drafts pendientes",
      group: "Acciones",
      run: () => ctx.navigate("/m/marketing/drafts"),
    });
    out.push({
      id: "marketing:health",
      label: "Marketing · Health (telemetry)",
      group: "Acciones",
      run: () => ctx.navigate("/m/marketing/health"),
    });
    out.push({
      id: "marketing:settings:mailboxes",
      label: "Marketing settings · Mailboxes",
      group: "Acciones",
      run: () => ctx.navigate("/m/marketing/settings/mailboxes"),
    });
    out.push({
      id: "marketing:settings:rules",
      label: "Marketing settings · Routing rules",
      group: "Acciones",
      run: () => ctx.navigate("/m/marketing/settings/rules"),
    });
    out.push({
      id: "marketing:settings:spam-filter",
      label: "Marketing settings · Filtros de correo",
      group: "Acciones",
      run: () => ctx.navigate("/m/marketing/settings/spam-filter"),
    });

    return out;
  },
};
