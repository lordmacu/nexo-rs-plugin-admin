// English catalog. The TypeScript signature mirrors `es.ts`
// — adding a key here without adding it to `es.ts` (or vice
// versa) is a compile error via `Catalog` from `../types`.

import type { Catalog } from "../types";

const en = {
  // ── Common atoms ─────────────────────────────────────────
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.confirm": "Confirm",
  "common.skip": "Skip for now",
  "common.continue": "Continue",
  "common.back": "Back",
  "common.loading": "Loading…",
  "common.search": "Search",
  "common.clear": "Clear",
  "common.add": "Add",
  "common.start": "Start",
  "common.finish": "Finish",
  "common.required": "required",
  "common.yes": "Yes",
  "common.no": "No",

  // ── Shell ────────────────────────────────────────────────
  "shell.rail.tablist_label": "Workspace modules",
  "shell.rail.tenant_label": "Switch tenant — current: {tenant}",
  "shell.rail.module_disabled": "{label} ({reason})",
  "shell.rail.module_disabled_manifest_invalid": "manifest invalid",
  "shell.rail.module_disabled_migration_failed":
    "migration failed ({from} → {to})",
  "shell.rail.module_disabled_default": "disabled",
  "shell.rail.tooltip_resize_sidebar": "Resize sidebar",
  "shell.rail.tooltip_resize_context": "Resize context panel",
  "shell.sheet.open_menu": "Open menu",
  "shell.sheet.close_menu": "Close menu",
  "shell.sheet.close": "Close",
  "shell.module_crash.title": "Module “{module}” failed to load.",
  "shell.module_crash.unknown": "Unknown error.",
  "shell.module_crash.reload": "Reload module",
  "shell.unknown_module.title_missing": "Pick a module",
  "shell.unknown_module.title_unknown": "Unknown module “{module}”",
  "shell.unknown_module.body_missing":
    "Open a module from the rail on the left.",
  "shell.unknown_module.body_unknown":
    "This module isn't installed in your workspace. Use the rail to switch.",
  "shell.tenant_switcher.aria_loading": "Loading tenants",
  "shell.tenant_switcher.aria_error": "Tenant load failed",
  "shell.announce.module_changed": "Moved to module {label}",

  // ── Locale switcher ──────────────────────────────────────
  "locale.label": "Language",
  "locale.es": "Spanish",
  "locale.en": "English",

  // ── Chat module ──────────────────────────────────────────
  "chat.sidebar.title": "Conversations",
  "chat.sidebar.subtitle": "{count} chats",
  "chat.sidebar.live_indicator": "Inbox active",
  "chat.sidebar.search_placeholder": "Search conversations…",
  "chat.menu.cmdk": "Command palette",
  "chat.menu.cmdk_hint": "Cmd / Ctrl + K",
  "chat.cmdk_hint.tip_title": "Tip: command palette",
  "chat.cmdk_hint.instruction_prefix": "Press",
  "chat.cmdk_hint.instruction_suffix": "anytime to search conversations, pause chats, or create agents without leaving the keyboard.",
  "chat.cmdk_hint.close_label": "Close tip",
  "chat.menu.agents": "Manage agents",
  "chat.menu.labels": "Manage labels",
  "chat.menu.sound_off": "Mute notifications",
  "chat.menu.sound_on": "Enable sound",
  "chat.menu.rotate_token": "Rotate operator token",
  "chat.header.actions_more": "More actions",
  "chat.header.logout": "Sign out",
  "chat.empty.no_chats_title": "No conversations",
  "chat.empty.no_chats_body":
    "When an agent receives a message, it'll show up here.",
  "chat.empty.no_results_title": "No matches",
  "chat.empty.no_results_body":
    "No recent conversation matches “{query}”.",
  "chat.empty.search_history": "Search full history",
  "chat.empty.clear_search": "Clear search",
  "chat.input.placeholder": "Type a message",
  "chat.input.send": "Send",
  "chat.input.emoji_soon": "Emoji (coming soon)",
  "chat.input.attach_soon": "Attach (coming soon)",
  "chat.input.voice_off": "Enable voice reply — the agent replies with audio (TTS)",
  "chat.input.voice_on":
    "Disable voice reply — the agent goes back to text",
  "chat.input.pause_off":
    "Pause AI — you reply manually, the agent stays silent",
  "chat.input.pause_on":
    "Resume AI — the next user message goes through the agent",

  // ── Chat · header ────────────────────────────────────────
  "chat.header.typing": "typing…",
  "chat.header.paused_by_operator": "Paused by operator",
  "chat.header.via_channel": "via {channel}",
  "chat.header.muted_suffix": "· muted",
  "chat.header.mute_on_title": "Re-enable notifications for this chat",
  "chat.header.mute_off_title": "Mute notifications for this chat",
  "chat.header.mute_on_aria": "Re-enable notifications",
  "chat.header.mute_off_aria": "Mute notifications",
  "chat.header.more_options": "More options",

  // ── Chat · message bubble ────────────────────────────────
  "chat.message.sender_operator": "Operator",
  "chat.message.system.paused": "Conversation paused · {time}",
  "chat.message.system.resumed": "Conversation resumed · {time}",
  "chat.message.system.escalation_requested":
    "Escalation requested: {summary} · {time}",
  "chat.message.system.escalation_resolved": "Escalation resolved · {time}",
  "chat.message.system.pending_dropped":
    "{count} queued messages dropped · {time}",

  // ── Chat · list item ─────────────────────────────────────
  "chat.list_item.time_yesterday": "yesterday",
  "chat.list_item.has_prospect": "Has a prospect",
  "chat.list_item.actions_aria": "Conversation actions",
  "chat.list_item.menu.rename": "Rename",
  "chat.list_item.menu.clear_alias": "Remove alias",
  "chat.list_item.menu.labels": "Labels",
  "chat.list_item.menu.edit_prospect": "Edit prospect",
  "chat.list_item.menu.create_prospect": "Create prospect",
  "chat.list_item.menu.delete": "Delete conversation",
  "chat.list_item.rename.title": "Rename conversation",
  "chat.list_item.rename.description":
    "The alias is stored locally in this browser. It replaces “{label}” in the chat list.",
  "chat.list_item.rename.placeholder": "e.g. Camilo (premium client)",
  "chat.list_item.delete.title": "Delete conversation",
  "chat.list_item.delete.body":
    "Are you sure you want to delete {label} from the list?",
  "chat.list_item.delete.body_hint":
    "All the messages you've already received in this conversation are removed from your view. The conversation will reappear if the contact sends a new message.",
  "chat.list_item.labels.title": "Tag conversation",
  "chat.list_item.labels.empty":
    "No labels yet. Create one from the icon in the top bar.",
  "chat.list_item.labels.done": "Done",
  "chat.list_item.prospect.title_edit": "Edit prospect",
  "chat.list_item.prospect.title_create": "Create prospect",
  "chat.list_item.prospect.field_name": "Name",
  "chat.list_item.prospect.field_email": "Email",
  "chat.list_item.prospect.field_phone": "Phone",
  "chat.list_item.prospect.field_notes": "Notes",
  "chat.list_item.prospect.field_labels": "Labels",
  "chat.list_item.prospect.email_placeholder": "client@company.com",
  "chat.list_item.prospect.phone_placeholder": "+57 300 123 4567",
  "chat.list_item.prospect.notes_placeholder":
    "Context, next action, budget, deadline…",
  "chat.list_item.prospect.no_labels":
    "No labels yet. Create them from the icon in the top bar.",
  "chat.list_item.prospect.create": "Create",
  "chat.list_item.prospect.save_changes": "Save changes",
  "chat.list_item.close_aria": "Close",

  // ── Chat · bot bubble ────────────────────────────────────
  "chat.bot.toggle_open": "Chat with AI bots",
  "chat.bot.title_pick_agent": "Pick an agent",
  "chat.bot.title_pick_bot": "{agent} · pick a bot",
  "chat.bot.change_bot": "Change bot",
  "chat.bot.change_agent": "Change agent",
  "chat.bot.loading_agents": "Loading agents…",
  "chat.bot.agent_bindings_singular": "{provider} · {count} binding",
  "chat.bot.agent_bindings_plural": "{provider} · {count} bindings",
  "chat.bot.resolving_instance": "Resolving agent instance…",
  "chat.bot.loading_bots": "Loading bots…",
  "chat.bot.no_bots": "No bots assigned to this agent.",
  "chat.bot.error_label": "Error",
  "chat.bot.retry": "Retry",
  "chat.bot.bot_no_id": "(no id)",
  "chat.bot.empty_chat": "No messages yet. Type below to start.",
  "chat.bot.input_placeholder": "Write to the bot…",
  "chat.bot.send": "Send",
  "chat.bot.sending": "…",

  // ── Chat · connection banner ─────────────────────────────
  "chat.connection.connecting": "Connecting to firehose…",
  "chat.connection.lagged":
    "Queued events dropped ({count}). Reload to sync.",
  "chat.connection.disconnected": "Backend not responding. Retrying…",

  // ── Chat · notify opt-in banner ──────────────────────────
  "chat.notify.body":
    "Enable notifications to be alerted of new messages while the tab is in the background.",
  "chat.notify.enable": "Enable",
  "chat.notify.enabling": "…",
  "chat.notify.dismiss_aria": "Dismiss notice",
  "chat.notify.toast_enabled": "Notifications enabled.",
  "chat.notify.toast_denied":
    "The browser rejected the request. Enable them from site settings to retry.",

  // ── Chat · escalation badge ──────────────────────────────
  "chat.escalation.confirm_dismiss": "Dismiss this escalation?",
  "chat.escalation.title": "Pending escalation — click to resolve",
  "chat.escalation.label": "Escalated",

  // ── Chat · pause indicator ───────────────────────────────
  "chat.pause.message":
    "Conversation paused — the agent won't reply until you resume.",
  "chat.pause.resume": "Resume",
  "chat.pause.resuming": "Resuming…",

  // ── Chat · label manager modal ───────────────────────────
  "chat.labels.title": "Labels",
  "chat.labels.close_aria": "Close",
  "chat.labels.create_section": "Create new",
  "chat.labels.name_placeholder": "Name (e.g. VIP, Support, Paid)",
  "chat.labels.color_aria": "Color",
  "chat.labels.create_aria": "Create label",
  "chat.labels.swatch_aria": "Use color {color}",
  "chat.labels.empty":
    "No labels yet. The first one is for grouping chats by reason (VIP, support, hot lead, etc.).",
  "chat.labels.row_delete_yes": "Delete",
  "chat.labels.row_delete_no": "No",
  "chat.labels.row_delete_aria": "Delete {name}",

  // ── Chat · search history modal ──────────────────────────
  "chat.search_history.dialog_aria": "Search history",
  "chat.search_history.placeholder": "Search full history…",
  "chat.search_history.close_aria": "Close",
  "chat.search_history.agent_label": "Agent:",
  "chat.search_history.agent_choose": "— pick one —",
  "chat.search_history.loading_agents": "Loading agents…",
  "chat.search_history.pick_agent": "Pick an agent to search.",
  "chat.search_history.min_chars": "Type at least 2 characters.",
  "chat.search_history.searching": "Searching…",
  "chat.search_history.no_results": "No results for “{query}”.",
  "chat.search_history.hit_via": "{role} · via {plugin}",

  // ── Chat · main empty state ──────────────────────────────
  "chat.main.empty.title": "Pick a conversation",
  "chat.main.empty.body": "Choose a chat from the list to see the messages.",

  // ── Chat · manifest ──────────────────────────────────────
  "chat.manifest.label": "Chats",
  "chat.manifest.tooltip": "Conversations",
  "chat.manifest.cmdk.go_to": "Go to {label}",
  "chat.manifest.cmdk.group_recent": "Recent",
  "chat.manifest.cmdk.group_conversations": "Conversations",
  "chat.manifest.cmdk.group_actions": "Actions",
  "chat.manifest.cmdk.pause_active": "Pause active conversation",
  "chat.manifest.cmdk.resume_active": "Resume active conversation",

  // ── Marketing module ─────────────────────────────────────
  "marketing.sidebar.title": "Marketing",
  "marketing.sidebar.subtitle": "{leads} leads · {unread} unread",
  "marketing.sidebar.search_placeholder":
    "Search by client, subject, domain…",
  "marketing.sidebar.firehose_live": "Firehose live",
  "marketing.sidebar.firehose_lagged":
    "Firehose lagged — reconciling via REST",
  "marketing.sidebar.firehose_disconnected": "Firehose disconnected",
  "marketing.empty.title": "Marketing inbox",
  "marketing.empty.body":
    "Pick a lead from the list to see the full thread + the AI-suggested reply. Routing and enrichment decisions are recorded in the timeline on the right panel.",
  "marketing.stat.leads": "Leads",
  "marketing.stat.drafts_pending": "Drafts pending",
  "marketing.stat.followups_today": "Followups today",
  "marketing.health.live":
    "Live · {leads} leads · {mailboxes} mailboxes watched",
  "marketing.health.error": "Marketing extension unavailable",
  "marketing.health.loading": "Loading…",

  // Wizard
  "marketing.wizard.welcome.title": "Configure Marketing",
  "marketing.wizard.welcome.body":
    "To start receiving leads we need two things: a mailbox that listens for inbound mail and a seller with SMTP credentials to reply. Takes less than a minute. You can edit the values later in Settings.",
  "marketing.wizard.step.welcome": "Welcome",
  "marketing.wizard.step.mailbox": "Mailbox",
  "marketing.wizard.step.seller": "Seller",
  "marketing.wizard.step.done": "Done",
  "marketing.wizard.mailbox.title": "Primary mailbox",
  "marketing.wizard.mailbox.body":
    "We'll connect to your inbound mail to read incoming leads. If you use Gmail, Outlook, Zoho, or a common provider, the connection details auto-fill as you type your email.",
  "marketing.wizard.seller.title": "First seller",
  "marketing.wizard.seller.body":
    'Each seller has their own SMTP credentials — drafts are sent from their mailbox, not from an "AI" account. If you leave it blank, the signature is generated as —\\n{name}.',
  "marketing.wizard.done.title": "All set!",
  "marketing.wizard.done.body":
    "Marketing is now listening. When the first email arrives, you'll see a pending draft to approve at /m/marketing/drafts. You can edit mailboxes + sellers anytime from Settings.",
  "marketing.wizard.see_inbox": "See inbox",
  "marketing.wizard.save_mailbox": "Save and continue",
  "marketing.wizard.save_seller": "Save and finish",

  // ── Lead drawer ──────────────────────────────────────────
  "lead.section.person": "Person",
  "lead.section.company": "Company",
  "lead.section.notes": "Internal notes",
  "lead.section.followup": "Followup",
  "lead.section.timeline": "Timeline",
  "lead.notes.placeholder":
    'Internal notes, never sent to the client. Markdown supported.\n\nEx: "called the assistant, will follow up Wednesday".',
  "lead.notes.empty_hint":
    "No notes yet. Operator-only.",
  "lead.notes.delete_title": "Delete notes",
  "lead.notes.delete": "Delete",
  "lead.followup.skip": "Skip",
  "lead.followup.postpone": "Postpone",
  "lead.followup.next_in": "Next in",
  "lead.followup.attempts": "Attempts",
  "lead.followup.no_followup": "No followup scheduled",
  "lead.followup.skip_title": "Cancel the next reminder",
  "lead.followup.postpone_title": "Move the next reminder",
  "lead.followup.apply": "Apply",
  "lead.followup.preset_1d": "1 day",
  "lead.followup.preset_3d": "3 days",
  "lead.followup.preset_1w": "1 week",
  "lead.followup.cancel_title": "Cancel",
  "lead.followup.invalid_datetime": "invalid_datetime",
  "lead.followup.attempts_max": " / 3",
  "lead.section.state": "State",
  "lead.section.seller": "Seller",
  "lead.section.why": "Why this lead?",
  "lead.person.alt_emails_prefix": "alt",
  "lead.company.industry": "Industry",
  "lead.company.size": "Size",
  "lead.company.scraped": "✓ scraped {when}",
  "lead.company.no_corporate_email": "Personal email — no corporate domain",
  "lead.company.enrichment_confidence":
    "Enrichment confidence: {percent}%",
  "lead.company.search_manual": "Search company manually",
  "lead.score.label": "Lead score",
  "lead.score.high": "high",
  "lead.score.medium": "medium",
  "lead.score.low": "low",
  "lead.score.suffix": "/100",
  "lead.score.sentiment": "Sentiment",
  "lead.score.intent": "Intent",
  "lead.person.loading": "Loading…",
  "lead.detail.loading_leads": "Loading leads…",
  "lead.detail.no_extension": "Marketing extension unavailable.",
  "lead.detail.select_prompt": "Select a lead from the list.",
  "lead.detail.loading_person": "Loading person…",
  "lead.detail.assigned_to": "assigned to",
  "lead.detail.score": "Score {score}",
  "lead.detail.tag.live": "live",
  "lead.detail.tag.demo_off": "demo · extension off",
  "lead.detail.thread_unavailable": "Thread unavailable · {error}",
  "lead.detail.thread_loading": "Loading thread…",
  "lead.detail.thread_empty":
    "Lead has no messages — no inbound has reached the broker for this thread yet.",
  "lead.detail.outbound_from": "Outbound from",
  "lead.detail.draft_mode": "Mock — draft mode",
  "lead.detail.hint_placeholder":
    "Optional hint for the AI (e.g. focus on pricing, mention promo)…",
  "lead.detail.generating": "Generating…",
  "lead.detail.generate_button": "Generate AI draft",
  "lead.detail.hide_hint": "Hide hint",
  "lead.detail.add_hint": "Add hint",
  "draft.approved": "Draft approved · sending…",
  "draft.rejected": "Draft discarded.",
  "draft.subject_placeholder": "Subject (empty ⇒ inherit from lead)",
  "draft.subject_label": "Subject:",
  "draft.title": "AI Draft · pending approval",
  "draft.error_prefix": "Action could not be completed · {error}",
  "draft.approve.busy": "Sending…",
  "draft.approve.label": "Approve & send",
  "draft.edit": "Edit",
  "draft.reject.busy": "Discarding…",
  "draft.reject.label": "Discard",
  "draft.outbound_from_seller": "Outbound from seller",
  "draft.outbound_from_seller.title": "Will be sent from the seller's email",
  "draft.save_and_send.busy": "Saving…",
  "draft.save_and_send.label": "Save & send",
  "draft.save_only": "Save only",
  "next_step.title": "Suggestion · next step",
  "next_step.applying": "Applying…",
  "next_step.move_to": "Move to {state}",
  "next_step.reason.out_of_scope": "intent: out_of_scope · close lead",
  "next_step.reason.ready_pos": "ready_to_buy + positive sentiment",
  "next_step.reason.intent_start": "intent: {intent} · start conversation",
  "next_step.reason.support": "intent: support_request · resolve query",
  "next_step.reason.ready_very_pos": "ready_to_buy + very positive sentiment",
  "next_step.reason.objecting_neg":
    "objections + negative sentiment · lost",
  "next_step.reason.ready_meeting": "intent: ready_to_buy · schedule meeting",
  "next_step.reason.post_meeting": "post-meeting · mark qualified",
  "next_step.reason.objecting_post_meeting":
    "objections after meeting · lost",
  "score_explainer.title": "Score · why?",
  "score_explainer.rule_matched": "Matched rule:",
  "score_explainer.no_breakdown": "No breakdown available.",
  "state_machine.current": "current",
  "state_machine.move": "Move →",
  "state_machine.mark_lost": "Mark lost",
  "state_machine.reason_prompt": 'Reason for change to "{state}":',

  // ── Marketing · enrichment card ──────────────────────────
  "marketing.enrichment.header_prefix": "Inferred enrichment · {source}",
  "marketing.enrichment.source.none": "not enriched",
  "marketing.enrichment.source.signature_parsed": "email signature",
  "marketing.enrichment.source.llm_extracted": "AI extraction",
  "marketing.enrichment.source.cross_linked": "cross-thread",
  "marketing.enrichment.source.api_enriched": "Apollo / Hunter",
  "marketing.enrichment.source.manual": "manual",
  "marketing.enrichment.source.personal_only_giveup":
    "personal email · no company",
  "marketing.enrichment.no_company": "(no company)",
  "marketing.enrichment.label_person": "Person: ",
  "marketing.enrichment.label_company": "Company: ",
  "marketing.enrichment.field_person_name": "Person name",
  "marketing.enrichment.field_company_name": "Company name",
  "marketing.enrichment.company_placeholder":
    "Acme Corp (empty to skip company assignment)",
  "marketing.enrichment.confirming": "Confirming…",
  "marketing.enrichment.confirm": "Confirm",
  "marketing.enrichment.discard": "Discard",
  "marketing.enrichment.saving": "Saving…",
  "marketing.enrichment.save_and_confirm": "Save and confirm",

  // ── Marketing · followup profile editor ──────────────────
  "marketing.followup_profile.id": "ID",
  "marketing.followup_profile.max_attempts": "Max attempts",
  "marketing.followup_profile.stop_on_reply":
    "Stop chain when client replies",
  "marketing.followup_profile.cadence": "Cadence",
  "marketing.followup_profile.no_intervals":
    "No intervals — add at least one.",
  "marketing.followup_profile.unit_hours": "hours",
  "marketing.followup_profile.unit_days": "days",
  "marketing.followup_profile.add_interval": "Add interval",
  "marketing.followup_profile.delete_profile": "Delete profile",
  "marketing.followup_profile.timeline_preview": "Timeline preview",
  "marketing.followup_profile.day_zero": "Day 0 → first send",
  "marketing.followup_profile.day_label": "Day +{days}",
  "marketing.followup_profile.hour_label": "Hour +{hours}",
  "marketing.followup_profile.followup_step": "followup #{step}",

  // ── Marketing · JSON editor modal ────────────────────────
  "marketing.json_editor.json_invalid": "Invalid JSON: {error}",
  "marketing.json_editor.server_rejected": "Server rejected: {error}",
  "marketing.json_editor.saved": "Saved.",
  "marketing.json_editor.banner_persists":
    "Banner stays up — restart recommended.",
  "marketing.json_editor.closing": "Closing…",
  "marketing.json_editor.aria_label": "JSON editor",

  // ── Marketing · timeline ─────────────────────────────────
  "marketing.timeline.loading": "Loading timeline…",
  "marketing.timeline.unavailable": "Timeline unavailable · {error}",
  "marketing.timeline.empty": "No audited events yet.",
  "marketing.timeline.lead_created": "Lead created",
  "marketing.timeline.lead_created_detail": "{from} · seller {seller}",
  "marketing.timeline.routed_score": "Routed · score {score}",
  "marketing.timeline.no_route_score": "No route · score {score}",
  "marketing.timeline.transitioned": "Transition · {from} → {to}",
  "marketing.timeline.notification": "Notification · {kind}",
  "marketing.timeline.notification_detail": "seller {seller} · channel {channel}",
  "marketing.timeline.guardrail": "Guardrail · {rule}",
  "marketing.timeline.guardrail_action_block": "blocked",
  "marketing.timeline.guardrail_action_force_approval": "force-approval",
  "marketing.timeline.guardrail_detail": "{action} · {excerpt}",
  "marketing.timeline.duplicate": "Possible duplicate · {id}",
  "marketing.timeline.duplicate_detail": "signal {signal} · {percent}%",
  "marketing.timeline.thread_bumped": "Thread updated",
  "marketing.timeline.followup_skipped": "Followup · skipped",
  "marketing.timeline.followup_postponed": "Followup · postponed to {when}",
  "marketing.timeline.followup_postponed_unknown": "Followup · postponed to —",

  // ── Marketing · mailbox form ─────────────────────────────
  "marketing.mailbox_form.id": "ID",
  "marketing.mailbox_form.address": "Address",
  "marketing.mailbox_form.address_placeholder": "sales@company.com",
  "marketing.mailbox_form.email_plugin_instance": "Email plugin instance",
  "marketing.mailbox_form.email_plugin_placeholder": "default",
  "marketing.mailbox_form.email_plugin_hint":
    "IMAP connection. The email plugin manages host / port / credentials under the named instance. OAuth (Gmail / Outlook) not supported in v1 — use IMAP with app-password.",
  "marketing.mailbox_form.inbound_polling": "Inbound polling",
  "marketing.mailbox_form.mode_idle": "IDLE (push, recommended)",
  "marketing.mailbox_form.mode_adaptive": "Adaptive (IDLE + poll)",
  "marketing.mailbox_form.mode_poll": "Poll only",
  "marketing.mailbox_form.poll_interval": "Poll interval (s)",
  "marketing.mailbox_form.active": "Mailbox active",
  "marketing.mailbox_form.draft_mode": "Draft + approve (manual)",
  "marketing.mailbox_form.hours_enabled": "Active polling window",
  "marketing.mailbox_form.timezone_label": "Timezone (IANA)",
  "marketing.mailbox_form.timezone_placeholder": "America/Bogota",
  "marketing.mailbox_form.off_hours_poll": "Off-hours poll (s)",
  "marketing.mailbox_form.day_mon_fri": "Mon-Fri",
  "marketing.mailbox_form.day_saturday": "Saturday",
  "marketing.mailbox_form.day_sunday": "Sunday",
  "marketing.mailbox_form.hours_invalid":
    "Activate at least one day and verify each start < end (HH:MM).",
  "marketing.mailbox_form.delete": "Delete mailbox",

  // ── Marketing · routing rule editor ──────────────────────
  "marketing.routing_rule.id": "ID",
  "marketing.routing_rule.name": "Name",
  "marketing.routing_rule.active": "Rule active",
  "marketing.routing_rule.followup_profile": "Followup profile",
  "marketing.routing_rule.followup_default": "(default)",
  "marketing.routing_rule.predicate.domain_kind": "Domain kind",
  "marketing.routing_rule.predicate.sender_email": "Sender email match",
  "marketing.routing_rule.predicate.company_industry": "Company industry",
  "marketing.routing_rule.predicate.person_tag": "Person tag",
  "marketing.routing_rule.predicate.score_gte": "Score ≥",
  "marketing.routing_rule.predicate.body_contains": "Body contains",
  "marketing.routing_rule.predicate.subject_contains": "Subject contains",
  "marketing.routing_rule.placeholder.sender_pattern": "*@acme.com",
  "marketing.routing_rule.placeholder.industry": "saas",
  "marketing.routing_rule.placeholder.tag": "vip",
  "marketing.routing_rule.placeholder.body": "keyword",
  "marketing.routing_rule.placeholder.subject": "quote",
  "marketing.routing_rule.assign_seller": "Seller",
  "marketing.routing_rule.assign_round_robin": "Round-robin pool",
  "marketing.routing_rule.assign_drop": "Drop",
  "marketing.routing_rule.placeholder.seller_id": "seller-id",
  "marketing.routing_rule.placeholder.pool": "seller-1, seller-2, seller-3",
  "marketing.routing_rule.drop_silent": "Silent inbound · no lead",
  "marketing.routing_rule.conditions_title":
    "Conditions (AND — all must match)",
  "marketing.routing_rule.no_conditions":
    "No conditions — the rule matches any inbound.",
  "marketing.routing_rule.add_condition": "Add condition",
  "marketing.routing_rule.assigns_to": "Assigns to",
  "marketing.routing_rule.delete": "Delete rule",

  // ── Marketing · seller form ──────────────────────────────
  "marketing.seller_form.title_edit": "Edit seller · {id}",
  "marketing.seller_form.title_new": "New seller",
  "marketing.seller_form.id_label": "ID",
  "marketing.seller_form.id_hint":
    "Immutable. Kebab-case suggested (pedro-garcia).",
  "marketing.seller_form.name_label": "Name",
  "marketing.seller_form.primary_email_label": "Primary email",
  "marketing.seller_form.primary_email_hint":
    "AI will send from this email.",
  "marketing.seller_form.alt_emails_label": "Alt emails",
  "marketing.seller_form.alt_emails_hint":
    "Cross-thread linker recognises messages from these for the same person. Press Enter / comma to add.",
  "marketing.seller_form.alt_emails_placeholder": "another@acme.com",
  "marketing.seller_form.signature_label": "Signature",
  "marketing.seller_form.signature_hint":
    "Plain text. AI respects this signature exactly.",
  "marketing.seller_form.draft_template_label": "Draft template (override)",
  "marketing.seller_form.draft_template_hint":
    "Handlebars. Empty = inherit tenant template. Available variables: {{person.name}}, {{seller.name}}, {{seller.signature_text}}, {{lead.subject}}, {{last_inbound.body}}, {{operator_hint}}.",
  "marketing.seller_form.draft_template_placeholder":
    "Hi {{person.name}}, this is {{seller.name}}…",
  "marketing.seller_form.draft_template_empty":
    "No override — uses tenant template.",
  "marketing.seller_form.smtp_section": "SMTP outbound",
  "marketing.seller_form.smtp_instance_label": "Instance",
  "marketing.seller_form.smtp_instance_hint":
    "Suffix for plugin.outbound.email.<instance> topic. Convention: <tenant>-<seller_id>.",
  "marketing.seller_form.smtp_instance_placeholder": "acme-pedro",
  "marketing.seller_form.smtp_host_label": "Host",
  "marketing.seller_form.smtp_host_hint": "SMTP server hostname",
  "marketing.seller_form.smtp_host_placeholder": "smtp.gmail.com",
  "marketing.seller_form.smtp_port_label": "Port",
  "marketing.seller_form.smtp_port_hint": "587 STARTTLS · 465 TLS",
  "marketing.seller_form.smtp_starttls_label": "STARTTLS",
  "marketing.seller_form.smtp_starttls_hint": "Recommended",
  "marketing.seller_form.smtp_starttls_enabled": "enabled",
  "marketing.seller_form.smtp_username_label": "Username",
  "marketing.seller_form.smtp_username_hint": "Usually the same email",
  "marketing.seller_form.smtp_username_placeholder": "pedro@acme.com",
  "marketing.seller_form.smtp_password_env_label": "Password env var",
  "marketing.seller_form.smtp_password_env_hint":
    "Env var name (e.g. MARKETING_SMTP_PEDRO_PASS). Operator sets it in systemd / docker; the YAML stores only the NAME, never the value.",
  "marketing.seller_form.smtp_password_env_placeholder":
    "MARKETING_SMTP_PEDRO_PASS",
  "marketing.seller_form.hours_section": "Working hours",
  "marketing.seller_form.timezone_label": "Timezone",
  "marketing.seller_form.timezone_hint":
    "IANA (e.g. America/Bogota, America/Mexico_City, Europe/Madrid).",
  "marketing.seller_form.day_mon_fri": "Mon–Fri",
  "marketing.seller_form.day_saturday": "Saturday",
  "marketing.seller_form.day_sunday": "Sunday",
  "marketing.seller_form.vacation_label": "Seller on vacation",
  "marketing.seller_form.vacation_until": "Vacation end (optional)",
  "marketing.seller_form.vacation_clear": "Clear",
  "marketing.seller_form.vacation_indefinite": "No date = indefinite vacation",
  "marketing.seller_form.agent_label": "AI agent",
  "marketing.seller_form.agent_hint":
    "Reuses the agent's model + system prompt + WhatsApp. Without an agent = manual outbound.",
  "marketing.seller_form.agent_loading": "Loading agents…",
  "marketing.seller_form.agent_error": "Error: {error}",
  "marketing.seller_form.agent_none": "— No agent (manual) —",
  "marketing.seller_form.agent_option":
    "{id} · {provider} · {count} channel{plural}",
  "marketing.seller_form.agent_inactive_suffix": " (inactive)",
  "marketing.seller_form.agent_default_model": "Agent default model: ",
  "marketing.seller_form.override_label": "Model for emails",
  "marketing.seller_form.override_hint":
    "Defaults to the agent's model. Pick a different one (e.g. cheaper) only if you want this seller to use it when answering emails.",
  "marketing.seller_form.override_provider_placeholder":
    "provider (e.g. anthropic)",
  "marketing.seller_form.override_model_placeholder":
    "model (e.g. claude-opus-4-7)",
  "marketing.seller_form.override_use_agent_default":
    "Use agent's model · {model}",
  "marketing.seller_form.override_no_override":
    "Use agent's model",
  "marketing.seller_form.override_agent_marker": "(default)",
  "marketing.seller_form.notify_section":
    "Operator notifications",
  "marketing.seller_form.notify_events": "Events",
  "marketing.seller_form.notify_lead_created": "New lead",
  "marketing.seller_form.notify_lead_replied": "Client replied",
  "marketing.seller_form.notify_lead_transitioned": "State transition",
  "marketing.seller_form.notify_draft_pending": "Pending draft",
  "marketing.seller_form.notify_meeting_intent": "Meeting intent",
  "marketing.seller_form.notify_channel_label": "Channel",
  "marketing.seller_form.notify_channel_hint":
    "WhatsApp uses the agent's binding; email sends via the framework email plugin; disabled keeps log-only.",
  "marketing.seller_form.notify_channel_whatsapp":
    "WhatsApp (agent channel)",
  "marketing.seller_form.notify_channel_email":
    "Email (to another address)",
  "marketing.seller_form.notify_channel_disabled":
    "Disabled (publish without forward)",
  "marketing.seller_form.notify_from_instance_label":
    "From instance (email plugin)",
  "marketing.seller_form.notify_from_instance_hint":
    "Mailbox id of the framework email plugin that sends via SMTP. Typically matches a mailbox configured in /m/marketing/settings/mailboxes.",
  "marketing.seller_form.notify_from_instance_placeholder": "ventas-acme",
  "marketing.seller_form.notify_email_to_label": "Email recipient",
  "marketing.seller_form.notify_email_to_placeholder": "ops@acme.com",
  "marketing.seller_form.notify_whatsapp_warning_prefix": "⚠ Agent ",
  "marketing.seller_form.notify_whatsapp_warning_suffix":
    " has no WhatsApp binding — the forwarder skips silently. Pair it via \"Reemparejar\" in /agents or change the channel to email / disabled.",
  "marketing.seller_form.notify_no_agent_warning":
    "⚠ Notifications require a bound agent. Pick one above or disable notifications.",
  "marketing.seller_form.saving": "Saving…",
  "marketing.seller_form.save_changes": "Save changes",
  "marketing.seller_form.create": "Create seller",
  "marketing.seller_form.aria_remove_chip": "Remove {value}",
  "marketing.seller_form.error_id_required": "id is required.",
  "marketing.seller_form.error_name_required": "name is required.",
  "marketing.seller_form.error_email_invalid":
    "primary_email must be a valid email.",
  "marketing.seller_form.error_override_partial":
    "model_override requires both provider AND model — set both or leave both empty.",
  "marketing.seller_form.error_alt_email_invalid":
    "alt_emails entry \"{email}\" is not a valid email.",
  "marketing.seller_form.error_timezone_required":
    "Working hours require an IANA timezone (e.g. America/Bogota).",
  "marketing.seller_form.error_window_format":
    "{label}: start/end must be HH:MM (got \"{start}\" / \"{end}\").",
  "marketing.seller_form.error_window_order":
    "{label}: start ({start}) must be before end ({end}).",
  "marketing.seller_form.error_notify_email_to":
    "Email notification requires a valid recipient.",
  "marketing.seller_form.error_notify_email_from":
    "Email notification requires a 'from instance' (email plugin mailbox id).",
  "marketing.seller_form.error_notify_agent_loading":
    "WhatsApp notification requires the agent loaded first — wait for the dropdown to hydrate.",
  "marketing.seller_form.error_notify_no_whatsapp":
    "Agent {agent} has no resolved WhatsApp binding. Pair it via \"Reemparejar\" in /agents first, or change the channel to Email / Disabled.",
  "marketing.seller_form.error_smtp_port":
    "SMTP port must be an integer between 1 and 65535.",
  "marketing.seller_form.error_smtp_instance":
    "SMTP instance is required (e.g. \"acme-pedro\"). Used as suffix for plugin.outbound.email.<instance> topic.",
  "marketing.seller_form.error_smtp_host": "SMTP host required.",
  "marketing.seller_form.error_smtp_username": "SMTP username required.",
  "marketing.seller_form.error_smtp_password_env":
    "SMTP password_env required — env var name with the password / app-password / OAuth token. The password does NOT live in the YAML.",

  // ── Marketing · template editor ──────────────────────────
  "marketing.template_editor.id": "ID",
  "marketing.template_editor.name": "Name",
  "marketing.template_editor.description": "Description (optional)",
  "marketing.template_editor.description_placeholder":
    "When to use this template",
  "marketing.template_editor.body": "Body (mustache-lite — {example}, etc.)",
  "marketing.template_editor.delete": "Delete",

  // ── Marketing · snippet editor ───────────────────────────
  "marketing.snippet_editor.id": "ID",
  "marketing.snippet_editor.shortcut": "Shortcut (optional)",
  "marketing.snippet_editor.shortcut_placeholder": "/saludo",
  "marketing.snippet_editor.name": "Name",
  "marketing.snippet_editor.body": "Body (mustache-lite — {example}, etc.)",
  "marketing.snippet_editor.delete": "Delete",

  // ── Marketing · notification templates editor ────────────
  "marketing.notification_template.kind.lead_created": "Lead created",
  "marketing.notification_template.kind.lead_replied": "Lead replied",
  "marketing.notification_template.kind.lead_transitioned":
    "Lead transitioned",
  "marketing.notification_template.kind.meeting_intent":
    "Meeting intent detected",
  "marketing.notification_template.kind.draft_pending":
    "Draft pending approval",
  "marketing.notification_template.locale_es": "ES",
  "marketing.notification_template.locale_en": "EN",
  "marketing.notification_template.saved": "✓ Saved",
  "marketing.notification_template.saved_with_note": "✓ Saved · {note}",
  "marketing.notification_template.saving": "Saving…",
  "marketing.notification_template.save_button": "Save templates",

  // ── Marketing · drafts inbox ─────────────────────────────
  "marketing.drafts_inbox.title": "Pending drafts",
  "marketing.drafts_inbox.loading": "Loading…",
  "marketing.drafts_inbox.empty_short": "Inbox clear",
  "marketing.drafts_inbox.count_singular":
    "{count} approval waiting",
  "marketing.drafts_inbox.count_plural":
    "{count} approvals waiting",
  "marketing.drafts_inbox.refresh": "Refresh",
  "marketing.drafts_inbox.unavailable": "Inbox unavailable · {error}",
  "marketing.drafts_inbox.bulk_ok": "{count} OK",
  "marketing.drafts_inbox.bulk_failed": "{count} failed",
  "marketing.drafts_inbox.empty_done":
    "🎉 No pending drafts. Queue fully processed.",
  "marketing.drafts_inbox.filter_seller": "Seller",
  "marketing.drafts_inbox.filter_state": "State",
  "marketing.drafts_inbox.visible_count": "{visible} of {total} visible",
  "marketing.drafts_inbox.confirm_bulk_approve":
    "Send {count} drafts? Each will trigger an outbound email.",
  "marketing.drafts_inbox.selection_empty": "Empty selection",
  "marketing.drafts_inbox.selection_singular": "{count} selected",
  "marketing.drafts_inbox.selection_plural": "{count} selected",
  "marketing.drafts_inbox.bulk_approve_busy": "Sending {count}…",
  "marketing.drafts_inbox.bulk_approve_label": "Approve ({count})",
  "marketing.drafts_inbox.bulk_reject_label": "Discard ({count})",
  "marketing.drafts_inbox.no_match": "No draft matches the active filter.",
  "marketing.drafts_inbox.row_sending": "Sending…",
  "marketing.drafts_inbox.row_approve": "Approve",
  "marketing.drafts_inbox.row_discarding": "Discarding…",
  "marketing.drafts_inbox.row_discard": "Discard",
  "marketing.drafts_inbox.row_go_to_lead": "Go to lead",

  // ── Marketing · health view ──────────────────────────────
  "marketing.health.title": "Marketing health",
  "marketing.health.subtitle": "Aggregated snapshot · auto-refresh every 30 s",
  "marketing.health.window_label": "Window",
  "marketing.health.refresh": "Refresh",
  "marketing.health.unavailable": "Telemetry unavailable · {error}",
  "marketing.health.loading_snapshot": "Loading snapshot…",
  "marketing.health.state.cold": "Cold",
  "marketing.health.state.engaged": "Engaged",
  "marketing.health.state.meeting_scheduled": "Meeting",
  "marketing.health.state.qualified": "Qualified",
  "marketing.health.state.lost": "Lost",
  "marketing.health.headline.drafts_pending": "Pending drafts",
  "marketing.health.headline.drafts_pending_hint": "Manual approval",
  "marketing.health.headline.inbound": "Inbound",
  "marketing.health.headline.outbound": "Outbound",
  "marketing.health.headline.last_window_hours": "Last {hours}h",
  "marketing.health.tenant_footer":
    "tenant {tenant} · window since {since}",

  // ── Marketing · settings view ────────────────────────────
  "marketing.settings.title": "Marketing settings",
  "marketing.settings.tab.mailboxes": "Mailboxes",
  "marketing.settings.tab.sellers": "Sellers",
  "marketing.settings.tab.rules": "Routing rules",
  "marketing.settings.tab.followup": "Followup profiles",
  "marketing.settings.tab.templates": "Notif. templates",
  "marketing.settings.tab.drafts": "Draft templates",
  "marketing.settings.tab.draft_template": "Draft AI template",
  "marketing.settings.tab.snippets": "Snippets",
  "marketing.settings.tab.guardrails": "Guardrails",
  "marketing.settings.tab.audit": "Audit",
  "marketing.settings.tab.spam_filter": "Filters",
  "marketing.settings.tab.scoring": "Scoring",
  "marketing.settings.tab.state": "State",

  // ── Marketing on/off (kill switch) ───────────────────────
  "marketing.state.title": "Marketing state",
  "marketing.state.subtitle":
    "Pause every automated effect (AI drafts, notifications, follow-ups). Emails still arrive as leads so the inbox keeps populating — only automated effects pause.",
  "marketing.state.toggle_enabled": "Marketing active",
  "marketing.state.toggle_disabled": "Marketing paused",
  "marketing.state.reason_label":
    "Pause reason (optional, visible to teammates)",
  "marketing.state.reason_placeholder":
    "e.g. testing routing rules, tuning agent prompt",
  "marketing.state.save_button": "Save",
  "marketing.state.save_ok": "State saved",
  "marketing.state.save_failed": "Could not save: {message}",
  "marketing.state.banner.paused":
    "⏸ Marketing paused{reason} — remember to re-enable when done",
  "marketing.state.banner.paused_reason_prefix": " · ",
  "marketing.state.banner.resume": "Resume",

  // ── Scoring config ───────────────────────────────────────
  "marketing.scoring.title": "Lead scoring",
  "marketing.scoring.subtitle":
    "Weights + keywords the system uses to prioritize leads. Raise positives to push important leads up; lower negatives if you're filtering too aggressively.",
  "marketing.scoring.weight.corporate_domain": "Corporate-domain boost",
  "marketing.scoring.weight.personal_domain": "Personal-domain penalty (gmail, hotmail, …)",
  "marketing.scoring.weight.substantive_min": "Minimum words for body to count as \"substantive\"",
  "marketing.scoring.weight.substantive_boost": "Boost when body is substantive",
  "marketing.scoring.weight.brief_max": "Maximum words for body to count as \"brief\" (auto-reply)",
  "marketing.scoring.weight.brief_penalty": "Penalty when body is brief",
  "marketing.scoring.weight.purchase_intent": "Purchase-intent boost",
  "marketing.scoring.weight.senior_signature": "Senior-role display-name boost",
  "marketing.scoring.keywords.purchase": "Purchase-intent keywords",
  "marketing.scoring.keywords.purchase_hint":
    "One word or phrase per line. Case-insensitive match against subject + body.",
  "marketing.scoring.keywords.senior": "Senior-role tokens",
  "marketing.scoring.keywords.senior_hint":
    "One token per line. Case-insensitive match against the sender display name.",
  "marketing.scoring.save_button": "Save",
  "marketing.scoring.reset_button": "Reset to defaults",
  "marketing.scoring.save_ok": "Scoring saved",
  "marketing.scoring.save_failed": "Could not save: {message}",
  "marketing.scoring.reset_confirm":
    "Reset scoring to bundled defaults? Your custom values will be lost.",

  // ── Compose (operator-initiated outbound) ───────────────
  "marketing.compose.button": "New email",
  "marketing.compose.title": "New email",
  "marketing.compose.subtitle":
    "Start a conversation with a customer. Sent with tracking pixel + rewritten links (configurable).",
  "marketing.compose.field.to_email": "To (email)",
  "marketing.compose.field.to_email_placeholder": "someone@example.com",
  "marketing.compose.field.to_name": "Name (optional)",
  "marketing.compose.field.to_name_placeholder": "Jane Doe",
  "marketing.compose.field.seller": "Send as",
  "marketing.compose.field.subject": "Subject",
  "marketing.compose.field.subject_placeholder": "Get to know our platform",
  "marketing.compose.field.body": "Message",
  "marketing.compose.field.body_placeholder":
    "Write the email body. The seller's signature is appended automatically.",
  "marketing.compose.field.with_tracking": "Include tracking pixel + rewritten links",
  "marketing.compose.send_button": "Send",
  "marketing.compose.cancel_button": "Cancel",
  "marketing.compose.sending": "Sending…",
  "marketing.compose.success": "Email sent · lead created",
  "marketing.compose.failed": "Could not send: {message}",
  "marketing.compose.no_sellers":
    "No sellers configured. Add one in Settings → Sellers before composing.",
  "marketing.compose.field.template": "Template",
  "marketing.compose.template_none": "No template",
  "marketing.compose.template_loading": "Loading template…",
  "marketing.compose.mode_hint":
    "Need rich layout? Switch to the visual block builder.",
  "marketing.compose.open_builder": "Open builder",
  "marketing.compose.open_quick": "Quick mode",
  "marketing.compose.to_email": "To (email)",
  "marketing.compose.to_name": "Name (optional)",
  "marketing.compose.to_name_placeholder": "Jane Doe",
  "marketing.compose.subject": "Subject",
  "marketing.compose.seller": "Send as",
  "marketing.compose.with_tracking": "Include tracking pixel + rewritten links",
  "marketing.compose.send": "Send",
  "marketing.compose.cancel": "Cancel",
  "marketing.compose.builder.load_template": "Load template",
  "marketing.compose.builder.blank": "Blank canvas",
  "marketing.compose.builder.fill_required":
    "Fill To / Subject / Seller to enable Send",

  // ── Email templates (block-based builder) ────────────────
  "marketing.settings.tab.email_templates": "Email templates",
  "marketing.email_templates.title": "Email templates",
  "marketing.email_templates.subtitle":
    "Design reusable block-based templates. Apply them when composing an email to start with the structure pre-built.",
  "marketing.email_templates.new_button": "New template",
  "marketing.email_templates.empty":
    "No templates yet. Create the first one with the button above.",
  "marketing.email_templates.list.name": "Name",
  "marketing.email_templates.list.updated": "Updated",
  "marketing.email_templates.list.actions": "Actions",
  "marketing.email_templates.action.edit": "Edit",
  "marketing.email_templates.action.delete": "Delete",
  "marketing.email_templates.delete_confirm":
    "Delete the template \"{name}\"? This cannot be undone.",
  "marketing.email_templates.field.name": "Name",
  "marketing.email_templates.field.name_placeholder": "e.g. Welcome — onboarding",

  // Editor pane
  "marketing.email_templates.editor.library": "Blocks",
  "marketing.email_templates.editor.canvas": "Design",
  "marketing.email_templates.editor.properties": "Properties",
  "marketing.email_templates.editor.preview": "Preview",
  "marketing.email_templates.editor.preview_desktop": "Desktop",
  "marketing.email_templates.editor.preview_mobile": "Mobile",
  "marketing.email_templates.editor.two_column_help":
    "Each column accepts the same blocks as the main canvas, except another two-column block.",
  "marketing.email_templates.editor.column_left": "Left column",
  "marketing.email_templates.editor.column_right": "Right column",
  "marketing.email_templates.editor.column_empty": "Empty column",
  "marketing.email_templates.editor.edit_inner_block": "Edit block",
  "marketing.email_templates.editor.done": "Done",
  "marketing.email_templates.editor.empty_canvas":
    "Add blocks from the left to get started.",
  "marketing.email_templates.editor.no_selection":
    "Select a block from the design to edit its properties.",
  "marketing.email_templates.editor.move_up": "Move up",
  "marketing.email_templates.editor.move_down": "Move down",
  "marketing.email_templates.editor.delete": "Delete block",
  "marketing.email_templates.editor.edit": "Edit",
  "marketing.email_templates.editor.save": "Save",
  "marketing.email_templates.editor.cancel": "Cancel",
  "marketing.email_templates.editor.save_ok": "Template saved",
  "marketing.email_templates.editor.save_failed":
    "Could not save: {message}",

  // Block library labels
  "marketing.email_templates.block.heading": "Heading",
  "marketing.email_templates.block.paragraph": "Paragraph",
  "marketing.email_templates.block.button": "Button",
  "marketing.email_templates.block.image": "Image",
  "marketing.email_templates.block.divider": "Divider",
  "marketing.email_templates.block.spacer": "Spacer",
  "marketing.email_templates.block.two_column": "Two columns",
  "marketing.email_templates.block.row": "Row",
  "marketing.email_templates.block.list": "List",
  "marketing.email_templates.row.help":
    "Pick a layout, then drop elements into each column. Drag the width % to fine-tune.",
  "marketing.email_templates.row.layout": "Layout",
  "marketing.email_templates.row.column_n": "Column {n}",
  "marketing.email_templates.row.confirm_trim":
    "This layout has fewer columns. Content in the trimmed columns will be lost. Continue?",
  "marketing.email_templates.row.background": "Row background",
  "marketing.email_templates.row.background_image": "Row background image",
  "marketing.email_templates.field.page_background": "Page",
  "marketing.email_templates.field.page_background_image_placeholder":
    "Background image URL (https://…)",
  "marketing.email_templates.row.column_background": "Column background",
  "marketing.email_templates.row.column_background_image": "Image:",
  "marketing.email_templates.row.clear_background": "Clear",
  "marketing.email_templates.picker.title": "Add element",
  "marketing.email_templates.picker.subtitle":
    "Pick a block type. The element will be added to the column you were editing.",
  "marketing.email_templates.canvas.add_row": "+ Add row",
  "marketing.email_templates.canvas.empty":
    "Empty canvas. Click '+ Add row' to start.",
  "marketing.email_templates.canvas.col_empty": "empty column",

  // Block property labels
  "marketing.email_templates.prop.text": "Text",
  "marketing.email_templates.prop.color": "Color",
  "marketing.email_templates.prop.bg_color": "Background color",
  "marketing.email_templates.prop.text_color": "Text color",
  "marketing.email_templates.prop.align": "Alignment",
  "marketing.email_templates.prop.align.left": "Left",
  "marketing.email_templates.prop.align.center": "Center",
  "marketing.email_templates.prop.align.right": "Right",
  "marketing.email_templates.prop.font_size": "Font size (px)",
  "marketing.email_templates.prop.level": "Level (1=large, 3=small)",
  "marketing.email_templates.prop.url": "URL",
  "marketing.email_templates.prop.image_url": "Image URL",
  "marketing.email_templates.prop.alt": "Alt text",
  "marketing.email_templates.prop.width": "Width (px, empty = 100%)",
  "marketing.email_templates.prop.link_url": "Link URL (optional)",
  "marketing.email_templates.prop.height": "Height (px)",
  "marketing.email_templates.prop.items": "Items (one per line)",
  "marketing.email_templates.prop.ordered": "Numbered list",
  "marketing.email_templates.upload.button": "Choose image",
  "marketing.email_templates.upload.replace": "Change image",
  "marketing.email_templates.upload.optimized": "Optimized: {saved}",
  "marketing.email_templates.upload.failed": "Upload failed: {error}",
  "marketing.media.title": "Media library",
  "marketing.media.search_placeholder": "Filter (sha prefix or mime)",
  "marketing.media.upload": "Upload new",
  "marketing.media.uploading": "Uploading…",
  "marketing.media.empty":
    "Library empty. Upload your first image with the tile above.",
  "marketing.media.no_match": "No assets match the filter.",
  "marketing.media.loading": "Loading…",
  "marketing.media.confirm_delete":
    "Delete this asset? Templates that reference it will lose the image.",
  "marketing.media.selected": "Selected · {size}",
  "marketing.media.no_selection": "Pick an asset or upload a new one",
  "marketing.media.cancel": "Cancel",
  "marketing.media.use": "Use selection",
  "marketing.attachments.label": "Attachments",
  "marketing.attachments.none": "No attachments",
  "marketing.attachments.add": "Attach file",
  "marketing.attachments.library_title": "Attachment library",
  "marketing.attachments.search_placeholder": "Filter by filename or type",
  "marketing.attachments.upload": "Upload new",
  "marketing.attachments.uploading": "Uploading…",
  "marketing.attachments.empty":
    "No attachments yet. Upload your first file with the button above.",
  "marketing.attachments.no_match": "No attachments match the filter.",
  "marketing.attachments.loading": "Loading…",
  "marketing.attachments.confirm_delete":
    "Delete this attachment? Drafts and templates that reference it will fail to send.",
  "marketing.attachments.selected_zero": "Nothing selected",
  "marketing.attachments.selected_count": "{count} selected",
  "marketing.attachments.cancel": "Cancel",
  "marketing.attachments.use_zero": "Use selection",
  "marketing.attachments.use_count": "Attach {count}",
  "marketing.compose.save_draft": "Save draft",
  "marketing.compose.draft_saved": "Saved · {at}",
  "marketing.sent.title": "Sent",
  "marketing.sent.subtitle": "Every outbound this tenant has published. Click a row to open the lead.",
  "marketing.sent.filter.seller": "Seller",
  "marketing.sent.filter.all_sellers": "All sellers",
  "marketing.sent.filter.from_date": "From",
  "marketing.sent.filter.to_date": "To",
  "marketing.sent.filter.search": "Search",
  "marketing.sent.filter.search_placeholder": "subject or body…",
  "marketing.sent.col.date": "Sent at",
  "marketing.sent.col.recipient": "Recipient",
  "marketing.sent.col.subject": "Subject",
  "marketing.sent.col.seller": "Seller",
  "marketing.sent.loading": "Loading…",
  "marketing.sent.empty": "Nothing sent yet.",
  "marketing.sent.no_match": "No emails match these filters.",
  "marketing.sent.range": "{start}–{end} of {total}",
  "marketing.sent.prev": "Prev",
  "marketing.sent.next": "Next",
  "marketing.saved_drafts.title": "Saved drafts",
  "marketing.saved_drafts.subtitle": "Outbounds you started writing and want to come back to. Distinct from AI drafts on inbound leads.",
  "marketing.saved_drafts.loading": "Loading…",
  "marketing.saved_drafts.empty": "No saved drafts yet. Use 'Save draft' from a compose to keep WIP for later.",
  "marketing.saved_drafts.no_title": "(untitled)",
  "marketing.saved_drafts.no_recipient": "(no recipient)",
  "marketing.saved_drafts.open": "Open",
  "marketing.saved_drafts.delete": "Delete",
  "marketing.saved_drafts.confirm_delete": "Delete this draft?",
  "marketing.saved_drafts.mode.rapid": "Quick",
  "marketing.saved_drafts.mode.builder": "Builder",
  "marketing.email_templates.prop.embed": "Image delivery",
  "marketing.email_templates.embed.url": "Public URL (recommended)",
  "marketing.email_templates.embed.cid": "Inline (CID embed)",
  "marketing.email_templates.embed.url_help":
    "Recipient's mail client fetches the image over HTTPS. Smaller email, lets us count opens.",
  "marketing.email_templates.embed.cid_help":
    "Bytes ride along inside the email. Heavier message but renders even when external images are blocked (Outlook by default).",
  "marketing.settings.mailboxes.intro":
    "Watched mailboxes. AI reads inbound here and replies from the assigned seller's mailbox.",
  "marketing.settings.mailboxes.new": "+ New mailbox",
  "marketing.settings.mailboxes.edit_json": "Edit JSON",
  "marketing.settings.mailboxes.json_title": "Edit mailboxes",
  "marketing.settings.mailboxes.json_hint":
    "Array of mailboxes. Fields: id, tenant_id, address, provider, mode (idle|adaptive|poll), poll_interval_seconds, active, draft_mode, email_plugin_instance.",
  "marketing.settings.mailboxes.json_array_required":
    "Payload must be an array of mailboxes.",
  "marketing.settings.mailboxes.confirm_delete":
    'Delete mailbox "{id}"?',
  "marketing.settings.mailboxes.live": "live",
  "marketing.settings.mailboxes.draft_mode": "Draft + approve",
  "marketing.settings.mailboxes.autonomous": "Autonomous",
  "marketing.settings.mailboxes.poll_suffix": " · poll {seconds}s",
  "marketing.settings.mailboxes.loading": "Loading mailboxes…",
  "marketing.settings.mailboxes.empty":
    "No mailboxes configured. Click '+ New mailbox' to start.",
  "marketing.settings.sellers.intro":
    "Each seller has their outbound email + signature + optional AI agent. When an agent is bound, marketing reuses its model + system prompt; the model override allows using a more powerful one only for emails.",
  "marketing.settings.sellers.new": "New seller",
  "marketing.settings.sellers.filter_banner":
    "🔎 Filtered to sellers of ",
  "marketing.settings.sellers.filter_count": "({visible} of {total})",
  "marketing.settings.sellers.clear_filter": "Clear filter",
  "marketing.settings.sellers.confirm_delete":
    'Delete seller "{id}"?',
  "marketing.settings.sellers.on_vacation": "on vacation",
  "marketing.settings.sellers.agent_prefix": "🤖 agent: {id}",
  "marketing.settings.sellers.no_agent": "no agent",
  "marketing.settings.sellers.model_override": "model override",
  "marketing.settings.sellers.model_override_title":
    "Override: {provider}/{model}",
  "marketing.settings.sellers.delete_aria": "Delete {id}",
  "marketing.settings.sellers.loading": "Loading sellers…",
  "marketing.settings.sellers.empty":
    "No sellers configured. Click '+ New seller' to start.",
  "marketing.settings.rules.intro":
    "Routing rules — order matters, first match wins. Default round-robin across active sellers. Changes apply without restart.",
  "marketing.settings.rules.new": "+ New rule",
  "marketing.settings.rules.edit_json": "Edit JSON",
  "marketing.settings.rules.json_title": "Edit routing rules",
  "marketing.settings.rules.json_hint":
    "RuleSet document. Fields: tenant_id, version, rules[], default_target ({kind:'drop'} | {kind:'seller', id} | {kind:'round_robin', pool:[]}).",
  "marketing.settings.rules.json_object_required":
    "Payload must be a RuleSet object.",
  "marketing.settings.rules.confirm_delete": 'Delete rule "{id}"?',
  "marketing.settings.rules.active": "active",
  "marketing.settings.rules.paused": "paused",
  "marketing.settings.rules.no_name": "(no name)",
  "marketing.settings.rules.empty":
    "No rules defined. Default target below applies to every inbound.",
  "marketing.settings.rules.default_target_label":
    "Default target — applies when no rule matches",
  "marketing.settings.rules.loading": "Loading rules…",
  "marketing.settings.rules.empty_full":
    "No RuleSet configured. Click '+ New rule' to start.",
  "marketing.settings.rules.describe_no_conditions": "no conditions",
  "marketing.settings.rules.describe_conditions": "{count} cond.",
  "marketing.settings.rules.describe_drop": "→ drop",
  "marketing.settings.rules.describe_seller": "→ {id}",
  "marketing.settings.rules.describe_pool": "→ pool [{ids}]",
  "marketing.settings.followup.intro":
    "Cadence profiles. Per-rule + per-lead override.",
  "marketing.settings.followup.new": "+ New profile",
  "marketing.settings.followup.edit_json": "Edit JSON",
  "marketing.settings.followup.json_title": "Edit followup profiles",
  "marketing.settings.followup.json_hint":
    "Array of profiles. Fields: id, cadence (e.g. ['24h','72h','7d']), max_attempts, stop_on_reply (default true).",
  "marketing.settings.followup.json_array_required":
    "Payload must be an array of profiles.",
  "marketing.settings.followup.confirm_delete": 'Delete profile "{id}"?',
  "marketing.settings.followup.day_label": "Day +{cadence} → followup #{step}",
  "marketing.settings.followup.summary":
    "max attempts: {max} · stop_on_reply: {stop}",
  "marketing.settings.followup.summary_check": "✓",
  "marketing.settings.followup.summary_x": "✗",
  "marketing.settings.templates.title": "📝 Notification templates",
  "marketing.settings.templates.intro_html":
    "Per-tenant overrides for the operator alerts the marketing extension publishes (`agent.email.notification.<agent_id>`). Set per kind (lead_created · lead_replied · lead_transitioned · meeting_intent · draft_pending) and per locale (es · en). Empty fields → framework defaults.",
  "marketing.settings.templates.placeholders_prefix": "Placeholders: ",
  "marketing.settings.templates.placeholders_transition_prefix":
    ". Transitioned adds ",
  "marketing.settings.templates.placeholders_meeting_prefix":
    ". Meeting intent adds ",
  "marketing.settings.templates.edit_json": "Edit JSON (advanced)",
  "marketing.settings.templates.json_title": "Edit notification templates",
  "marketing.settings.templates.json_hint":
    "NotificationTemplates document. Each kind: { es?: string, en?: string }. Placeholders use {{name}} syntax.",
  "marketing.settings.templates.json_object_required":
    "Payload must be a NotificationTemplates object.",
  "marketing.settings.templates.restart_required_note":
    "Templates saved on disk but the in-memory lookup wasn't wired in this deployment. Restart the extension to apply.",
  "marketing.settings.guardrails.title": "🛡️ Topic guardrails",
  "marketing.settings.guardrails.intro_prefix":
    "Regex tagger that scans every inbound body. Each rule fires ",
  "marketing.settings.guardrails.intro_force_approval":
    " (demote AI to draft mode) or ",
  "marketing.settings.guardrails.intro_block":
    " (refuse to draft). Tags persist on the lead row + the audit log.",
  "marketing.settings.guardrails.syntax_prefix": "Pattern syntax: ",
  "marketing.settings.guardrails.syntax_middle":
    " crate. ASCII case-insensitive by default — prefix with ",
  "marketing.settings.guardrails.syntax_suffix":
    " to opt out. Multiple patterns inside one rule OR together.",
  "marketing.settings.guardrails.compile_error_title":
    "⚠️ Compile error",
  "marketing.settings.guardrails.compile_error_footer":
    "PUT was not persisted. The rule in the list that matches stays flagged red until the next successful save.",
  "marketing.settings.guardrails.empty":
    "No guardrails configured — autonomous reply without restrictions.",
  "marketing.settings.guardrails.action_block": "block",
  "marketing.settings.guardrails.action_force_approval": "force approval",
  "marketing.settings.guardrails.edit_json": "Edit JSON",
  "marketing.settings.guardrails.json_title": "Edit topic guardrails",
  "marketing.settings.guardrails.json_hint":
    'Array of GuardrailRule. Each: { id, name, patterns: ["regex", ...], action: "force_approval" | "block" }. Server validates regex + dup ids before persisting.',
  "marketing.settings.guardrails.json_array_required":
    "Payload must be an array of GuardrailRule.",
  "marketing.settings.guardrails.restart_required_note":
    "Guardrails saved on disk but the in-memory handle wasn't wired in this deployment. Restart the extension to apply.",
  "marketing.settings.guardrails.invalid_pattern_with_id":
    "Rule `{id}` pattern #{index} invalid: {error}",
  "marketing.settings.guardrails.invalid_pattern_with_id_no_error":
    "Rule `{id}` pattern #{index} invalid",
  "marketing.settings.guardrails.invalid_pattern_generic":
    "Invalid regex pattern",
  "marketing.settings.guardrails.duplicate_with_id":
    "Rule `{id}` is duplicated — ids must be unique",
  "marketing.settings.guardrails.duplicate_generic":
    "Duplicate rule id",
  "marketing.settings.guardrails.empty_with_id":
    "Rule `{id}` has no patterns — add at least one",
  "marketing.settings.guardrails.empty_generic":
    "A rule has no patterns",
  "marketing.settings.draft_templates.title": "📝 Draft templates",
  "marketing.settings.draft_templates.intro_prefix":
    "Operator-authored draft bodies the AI uses as starting points for outbound replies. Mustache-lite syntax: ",
  "marketing.settings.draft_templates.intro_suffix":
    ". Sandboxed — no helpers, no eval, no IO.",
  "marketing.settings.draft_templates.missing_paths_prefix":
    "Missing paths render as ",
  "marketing.settings.draft_templates.missing_paths_suffix":
    " so a typo in the path doesn't crash the renderer.",
  "marketing.settings.draft_templates.new": "+ New template",
  "marketing.settings.draft_templates.edit_json": "Edit JSON",
  "marketing.settings.draft_templates.confirm_delete":
    'Delete template "{id}"?',
  "marketing.settings.draft_templates.empty":
    "No templates configured — operator hasn't authored any yet.",
  "marketing.settings.draft_templates.json_title": "Edit draft templates",
  "marketing.settings.draft_templates.json_hint":
    "Array of Template. Each: { id, name, description?, body }. Body uses {{path.to.field}} substitution.",
  "marketing.settings.draft_templates.json_array_required":
    "Payload must be an array of Template.",
  "marketing.settings.draft_ai.title": "✨ AI draft template",
  "marketing.settings.draft_ai.intro":
    "Sandboxed Handlebars template. Used by the lead drawer's \"Generate AI draft\" button to produce the initial draft body. Hot-swap: saving here impacts the next generate without restarting the extension.",
  "marketing.settings.draft_ai.variables_prefix": "Available variables: ",
  "marketing.settings.draft_ai.variables_blocks": ". Blocks ",
  "marketing.settings.draft_ai.variables_blocks_middle": " / ",
  "marketing.settings.draft_ai.variables_blocks_suffix":
    " allowed. Custom helpers + partials are blocked (sandbox).",
  "marketing.settings.draft_ai.source_label": "Current source: ",
  "marketing.settings.draft_ai.saved_toast": "✓ Saved · hot-swap applied",
  "marketing.settings.draft_ai.loading": "Loading template…",
  "marketing.settings.draft_ai.saving": "Saving…",
  "marketing.settings.draft_ai.save": "Save + hot-swap",
  "marketing.settings.draft_ai.rendering": "Rendering…",
  "marketing.settings.draft_ai.preview": "Preview",
  "marketing.settings.draft_ai.reset": "Reset to default",
  "marketing.settings.draft_ai.chars": "{count} chars",
  "marketing.settings.draft_ai.preview_summary": "Optional hint for preview",
  "marketing.settings.draft_ai.preview_placeholder": 'E.g. "focus on pricing"',
  "marketing.settings.draft_ai.preview_note":
    "Only affects the preview · saving doesn't persist it.",
  "marketing.settings.draft_ai.preview_render": "Preview render",
  "marketing.settings.snippets.title": "✂️ Snippets",
  "marketing.settings.snippets.intro_prefix":
    "Reusable phrases the operator inserts inline in the draft editor. Optional ",
  "marketing.settings.snippets.intro_middle": " (",
  "marketing.settings.snippets.intro_middle2": ", ",
  "marketing.settings.snippets.intro_suffix":
    ") maps to keyboard insertion. Same renderer as Draft templates — sandboxed mustache-lite.",
  "marketing.settings.snippets.new": "+ New snippet",
  "marketing.settings.snippets.edit_json": "Edit JSON",
  "marketing.settings.snippets.confirm_delete":
    'Delete snippet "{id}"?',
  "marketing.settings.snippets.empty": "No snippets configured.",
  "marketing.settings.snippets.json_title": "Edit snippets",
  "marketing.settings.snippets.json_hint":
    "Array of Snippet. Each: { id, name, shortcut?, body }. Body uses {{path}} substitution.",
  "marketing.settings.snippets.json_array_required":
    "Payload must be an array of Snippet.",
  "marketing.settings.audit.title": "📜 Audit log",
  "marketing.settings.audit.intro":
    "Every AI decision — routing, state transition, notification, guardrail, duplicate — persisted per tenant. Filter by kind / lead_id / date; click a row to view the full detail.",
  "marketing.settings.audit.filter_kind": "Kind",
  "marketing.settings.audit.filter_lead_id": "Lead id",
  "marketing.settings.audit.filter_lead_id_placeholder": "lead-…",
  "marketing.settings.audit.filter_limit": "Limit",
  "marketing.settings.audit.apply": "Apply",
  "marketing.settings.audit.clear": "Clear",
  "marketing.settings.audit.loading": "Loading…",
  "marketing.settings.audit.empty":
    "No rows for the active filter combination. Only the active tenant's rows are visible.",
  "marketing.settings.audit.kind_all": "(all kinds)",
  "marketing.settings.audit.kind_routing_decided": "Routing decided",
  "marketing.settings.audit.kind_lead_transitioned": "Lead transitioned",
  "marketing.settings.audit.kind_notification_published":
    "Notification published",
  "marketing.settings.audit.kind_topic_guardrail_fired": "Guardrail fired",
  "marketing.settings.audit.kind_duplicate_person_detected":
    "Duplicate detected",
  "marketing.settings.source.loading": "Loading…",
  "marketing.settings.source.error":
    "Extension unavailable — {error} · demo data",
  "marketing.settings.source.error_unknown": "unknown error",
  "marketing.settings.source.mock":
    "Demo data (empty config in extension)",

  // ── Wizard — Welcome step ────────────────────────────────
  "wizard.welcome.title": "Configure agent",
  "wizard.welcome.intro":
    "We connect an LLM provider, pair a WhatsApp number, and create the agent. It takes about 3 minutes. If you stop, your progress is saved.",
  "wizard.welcome.step1":
    "Paste an API key (MiniMax by default). Validated without leaving this server.",
  "wizard.welcome.step2": "Scan a QR code with your WhatsApp to pair.",
  "wizard.welcome.step3":
    "Define the agent's persona and you're done — it starts replying.",
  "wizard.welcome.start": "Start",

  // ── Wizard — StepShell rail ──────────────────────────────
  "wizard.shell.app_title": "nexo-rs admin",
  "wizard.shell.app_subtitle": "Initial setup",
  "wizard.shell.rail.welcome.title": "Welcome",
  "wizard.shell.rail.welcome.blurb": "Configure agent",
  "wizard.shell.rail.llm.title": "LLM provider",
  "wizard.shell.rail.llm.blurb": "Connect an API key",
  "wizard.shell.rail.pairing.title": "WhatsApp",
  "wizard.shell.rail.pairing.blurb": "Pair a device",
  "wizard.shell.rail.agent.title": "Agent",
  "wizard.shell.rail.agent.blurb": "Define the persona",
  "wizard.shell.footer_note":
    "You can close this window — your progress is saved until next login.",

  // ── Wizard — LLM step ────────────────────────────────────
  "wizard.llm.title": "LLM provider",
  "wizard.llm.subtitle":
    "Pick a configured instance. Each instance brings its own API key, factory and region — the agent uses it as-is without touching it here.",
  "wizard.llm.empty":
    "There are no LLM instances yet. Create one so the agent can connect.",
  "wizard.llm.create_first": "Create instance",
  "wizard.llm.create_more": "Create another instance",
  "wizard.llm.field_instance": "Instance",
  "wizard.llm.tenant_suffix": " · tenant {tenant}",
  "wizard.llm.delete_title": "Delete instance",
  "wizard.llm.delete_confirm":
    "Delete instance \"{id}\"? Its API key will also be unlinked.",
  "wizard.llm.saving": "Saving…",
  "wizard.llm.continue": "Continue",

  // ── Wizard — Pairing step ────────────────────────────────
  "wizard.pairing.title": "Pair WhatsApp",
  "wizard.pairing.subtitle":
    "Open WhatsApp on your phone → Settings → Linked devices → Link a device, and scan the code.",
  "wizard.pairing.generate_qr": "Generate QR code",
  "wizard.pairing.qr_alt": "WhatsApp QR",
  "wizard.pairing.confirming": "Confirming on your phone…",
  "wizard.pairing.waiting": "Waiting for scan…",
  "wizard.pairing.regenerate_qr": "Regenerate QR",
  "wizard.pairing.expired": "The QR code expired before being scanned.",
  "wizard.pairing.regenerate_code": "Regenerate code",
  "wizard.pairing.linked_with_jid":
    "✅ Device paired ({jid}). Advancing…",
  "wizard.pairing.linked": "✅ Device paired. Advancing…",

  // ── Wizard — Agent step ──────────────────────────────────
  "wizard.agent.title": "Create agent",
  "wizard.agent.subtitle":
    "The agent will receive messages from the WhatsApp paired in the previous step and reply using the model you connected.",
  "wizard.agent.field_name": "Display name",
  "wizard.agent.name_placeholder": "Ana — support",
  "wizard.agent.id_label": "ID · {id}",
  "wizard.agent.field_template": "Template",
  "wizard.agent.field_prompt": "Persona / system prompt",
  "wizard.agent.field_language": "Language",
  "wizard.agent.lang_es": "Spanish",
  "wizard.agent.lang_en": "English",
  "wizard.agent.submit": "Create agent",
  "wizard.agent.error_id":
    "The id must be a lowercase slug: a-z, 0-9, _, -.",
  "wizard.agent.error_name": "The name must be at least 2 characters.",
  "wizard.agent.error_prompt_min":
    "The system prompt needs at least 10 characters.",
  "wizard.agent.error_prompt_max":
    "Prompt too long (max 10000 characters).",

  // ── Wizard — Done step ───────────────────────────────────
  "wizard.done.title": "Done",
  "wizard.done.subtitle":
    "Your agent is active. The next message arriving at the paired number will trigger an automatic reply.",
  "wizard.done.go_dashboard": "Go to dashboard",

  // ── Wizard — Page chrome ─────────────────────────────────
  "wizard.page.back": "← Back",
  "wizard.page.return_dashboard": "Back to dashboard",
  "wizard.page.restart": "Start over",
  "wizard.page.restart_confirm": "Start over? Your progress will be erased.",

  // ── Auth — Login ─────────────────────────────────────────
  "auth.login.title": "nexo-rs admin",
  "auth.login.subtitle": "Paste the access token your operator configured.",
  "auth.login.token_placeholder": "AGENT_CREATOR_TOKEN…",
  "auth.login.error_empty": "Paste your access token to continue.",
  "auth.login.error_default": "Token rejected by the daemon.",
  "auth.login.connecting": "Connecting…",
  "auth.login.connect": "Connect",

  // ── Auth — Token rotation ────────────────────────────────
  "auth.token.button_title": "Rotate operator token",
  "auth.token.modal_title": "Rotate operator token",
  "auth.token.intro":
    "The daemon writes the new value to disk, broadcasts to connected microapps (the current session falls on the next request) and writes an audit entry to the firehose. After rotating, sign in again with the new token.",
  "auth.token.field_new":
    "New token (optional, min {min} characters)",
  "auth.token.field_new_placeholder":
    "Empty = generated by the daemon (32 bytes hex)",
  "auth.token.error_min":
    "The new token must be at least {min} characters.",
  "auth.token.field_reason": "Reason (optional, audit log)",
  "auth.token.reason_placeholder":
    "e.g. \"scheduled rotation\", \"key compromised\"",
  "auth.token.rotating": "Rotating…",
  "auth.token.rotate": "Rotate token",
  "auth.token.toast_success_with_token":
    "Token rotated. New hash: {hash}. Sign in with the new token.",
  "auth.token.toast_success_generated":
    "Token rotated. New hash: {hash}. Generated value visible in audit log; copy the new bearer from the daemon before signing back in.",
  "auth.token.toast_capability":
    "The operator did not grant the `auth_rotate` capability to this microapp. Edit extensions.yaml.<id>.capabilities_grant.",
  "auth.token.toast_invalid_params": "Parameters rejected: {message}",
  "auth.token.toast_error": "Error rotating token: {message}",

  // ── Agents — list page ───────────────────────────────────
  "agents.title": "Agents",
  "agents.back_to_chat": "Back to chat",
  "agents.new_agent": "New agent",
  "agents.section.instances": "LLM instances",
  "agents.new_instance": "New instance",
  "agents.no_instances":
    "No instances configured. Create one so your agents have independent API keys.",
  "agents.tenant_prefix": "tenants.{scope}",
  "agents.secret_backed": "secret-backed",
  "agents.rotate_credentials": "Rotate instance credentials",
  "agents.delete_instance": "Delete instance",
  "agents.delete_instance_button": "Delete",
  "agents.delete_instance_confirm":
    "Delete instance \"{id}\"? Its API key will also be unlinked.",
  "agents.list.empty":
    "No agents configured yet. Use New agent to create the first one.",
  "agents.list.empty_em": "New agent",
  "agents.inactive": "inactive",
  "agents.sellers_tooltip": "Marketing sellers using this agent:\n{names}",
  "agents.sellers_count_one": "📧 {count} email seller",
  "agents.sellers_count_other": "📧 {count} email sellers",
  "agents.bindings_count_one": "{provider} · {count} binding",
  "agents.bindings_count_other": "{provider} · {count} bindings",
  "agents.persona_button": "Persona / knowledge",
  "agents.persona_title": "Agent persona and knowledge",
  "agents.repair_button": "Re-pair",
  "agents.repair_title": "Re-pair WhatsApp for this agent",
  "agents.edit_button": "Edit",
  "agents.delete_title": "Delete agent",
  "agents.delete_button": "Delete",

  // ── Agents — delete confirm modal ────────────────────────
  "agents.delete.confirm_heading": "Delete agent {id}?",
  "agents.delete.body":
    "The daemon will mark the agent as inactive, drain in-flight sessions and then remove the block from agents.yaml. Associated credentials (WhatsApp, etc.) remain intact.",
  "agents.delete.warning":
    "This action is not reversible — you'll need to recreate and re-pair the agent if you want it back.",
  "agents.delete.checking_sellers": "Checking bound sellers…",
  "agents.delete.affected_one":
    "📧 Marketing has {count} seller bound to this agent:",
  "agents.delete.affected_other":
    "📧 Marketing has {count} sellers bound to this agent:",
  "agents.delete.cascade_note":
    "On confirm, marketing.yaml is updated first (agent_id + notification_settings are removed) and then the agent is deleted. You'll have to re-bind them to another agent from /m/marketing/settings/sellers.",

  // ── Agents — edit modal ──────────────────────────────────
  "agents.edit.title": "Edit agent {id}",
  "agents.edit.field_instance": "LLM instance",
  "agents.edit.no_instances": "No instances. Create one first.",
  "agents.edit.field_model": "Model",
  "agents.edit.model_uncatalogued": "{model} (not catalogued)",
  "agents.edit.live_models": "✓ {count} live models from the API.",
  "agents.edit.field_language": "Language",
  "agents.edit.language_auto": "(auto)",
  "agents.edit.locale_help_prefix": "BCP-47 locale. e.g.: ",
  "agents.edit.locale_help_es_ar": " ⇒ voseo + Argentine voice; ",
  "agents.edit.locale_help_es_es": " ⇒ Castilian tuteo + Spanish voice; ",
  "agents.edit.locale_help_en_gb": " ⇒ British spelling + English voice.",
  "agents.edit.field_system_prompt": "System prompt",
  "agents.edit.email_sellers": "📧 Email sellers",
  "agents.edit.no_sellers_bound": "No sellers bound to this agent.",
  "agents.edit.via_seller": "via seller",
  "agents.edit.unbound_label": "(unbound)",
  "agents.edit.open_seller_title": "Open seller in Marketing",
  "agents.edit.unbind": "× Unbind",
  "agents.edit.unbind_title": "Unbind this seller from the agent",
  "agents.edit.loading_sellers": "Loading sellers…",
  "agents.edit.all_bound": "All sellers are already bound to this agent.",
  "agents.edit.bind_pick_placeholder": "— Bind seller —",
  "agents.edit.bind_move_label": "{seller} (move from {agent})",
  "agents.edit.bind_button": "Bind",
  "agents.edit.bind_busy": "...",
  "agents.edit.other_bindings": "Other bindings (read-only)",
  "agents.edit.bind_partial_failure":
    "bound, but {agent} failed: {error}",
  "agents.edit.unbind_partial_failure":
    "unbound, but {agent} failed: {error}",

  // ── Agents — heartbeat field ─────────────────────────────
  "agents.heartbeat.label": "Heartbeat (proactive tick)",
  "agents.heartbeat.toggle": "Enable heartbeat",
  "agents.heartbeat.off_help":
    "Off — the agent only responds to incoming messages. Enable to fire on_heartbeat at intervals (reminders, drip, external polling).",
  "agents.heartbeat.preset_15m": "Every 15 min",
  "agents.heartbeat.preset_30m": "Every 30 min",
  "agents.heartbeat.preset_1h": "Every hour",
  "agents.heartbeat.preset_4h": "Every 4 h",
  "agents.heartbeat.preset_1d": "Every day",
  "agents.heartbeat.preset_custom": "Custom",
  "agents.heartbeat.custom_placeholder": "e.g. 90m, 12h, 7d",
  "agents.heartbeat.custom_help_prefix": "humantime literal (seconds ",
  "agents.heartbeat.custom_help_minutes": ", minutes ",
  "agents.heartbeat.custom_help_hours": ", hours ",
  "agents.heartbeat.custom_help_days": ", days ",
  "agents.heartbeat.custom_help_suffix":
    "). If the string is empty, the daemon keeps the prior yaml value.",

  // ── Agents — pairing modal ───────────────────────────────
  "agents.pairing_modal.title": "Re-pair agent {agent_id}",
  "agents.pairing_modal.generating": "Generating QR…",
  "agents.pairing_modal.qr_alt": "Pairing QR",
  "agents.pairing_modal.confirm_phone":
    "Confirm on the phone to finish the link.",
  "agents.pairing_modal.scan_help":
    "Open WhatsApp on the phone → Settings → Linked devices → Link a device and scan.",
  "agents.pairing_modal.expired": "The QR expired.",
  "agents.pairing_modal.linked": "✅ Re-paired",
  "agents.pairing_modal.linked_with": "✅ Re-paired ({jid})",
  "agents.pairing_modal.close": "Close",
  "agents.pairing_modal.regenerate_qr": "Generate new QR",

  // ── Agents — LLM instance create modal ───────────────────
  "agents.llm_modal.title": "Create LLM instance",
  "agents.llm_modal.step_factory": "Provider",
  "agents.llm_modal.step_credentials": "Credentials",
  "agents.llm_modal.step_model": "Model",
  "agents.llm_modal.validating": "Validating credentials…",
  "agents.llm_modal.validation_failed": "Validation failed",
  "agents.llm_modal.validation_help":
    "Check the API key + base URL and retry. The instance has not been created yet.",
  "agents.llm_modal.saving": "Saving instance…",
  "agents.llm_modal.id_problem_format":
    "The id must start with a letter and contain only a-z, 0-9 or '-'.",
  "agents.llm_modal.id_problem_dup": "An instance with id '{id}' already exists.",
  "agents.llm_modal.factory_intro":
    "An instance is an independent configuration (key + region) of a provider from the catalog.",
  "agents.llm_modal.field_factory": "Catalog provider",
  "agents.llm_modal.field_auth_mode": "Authentication mode",
  "agents.llm_modal.oauth_intro":
    "This mode uses OAuth — the daemon will open an approval flow in your browser. The key never passes through the SPA.",
  "agents.llm_modal.oauth_start": "Start authentication",
  "agents.llm_modal.field_api_key": "API key (write-through, not logged)",
  "agents.llm_modal.api_key_placeholder": "sk-…",
  "agents.llm_modal.live_models": "✓ {count} live models from the API",
  "agents.llm_modal.static_catalog": "Static catalog ({count} models)",
  "agents.llm_modal.field_model": "Model",
  "agents.llm_modal.next": "Next",
  "agents.llm_modal.start_oauth": "Start OAuth",
  "agents.llm_modal.validate": "Validate",
  "agents.llm_modal.retry": "Retry",
  "agents.llm_modal.create": "Create instance",
  "agents.llm_modal.back": "Back",
  "agents.llm_modal.auth_api_key": "API key",
  "agents.llm_modal.auth_setup_token": "Setup token (sk-ant-oat01-…)",
  "agents.llm_modal.auth_oauth_auth_code": "OAuth Claude.ai (recommended)",
  "agents.llm_modal.auth_oauth_device_code": "OAuth Token Plan (device code)",
  "agents.llm_modal.auth_oauth_bundle_import": "Import bundle JSON",

  // ── Agents — OAuth pane ──────────────────────────────────
  "agents.oauth.starting": "Starting OAuth flow…",
  "agents.oauth.error": "Error: {message}",
  "agents.oauth.exchanging": "Exchanging code…",
  "agents.oauth.auth_step1_prefix":
    "1. Approve access in the tab that opened. If it didn't open, ",
  "agents.oauth.auth_step1_link": "click here",
  "agents.oauth.auth_step1_suffix": ".",
  "agents.oauth.auth_step2_prefix": "2. Anthropic will show you a code like ",
  "agents.oauth.auth_step2_suffix": ". Paste it below:",
  "agents.oauth.code_placeholder": "abc123#def456",
  "agents.oauth.confirm": "Confirm",
  "agents.oauth.cancel": "Cancel",
  "agents.oauth.device_step1_prefix": "1. Open ",
  "agents.oauth.device_step2": "2. When prompted for a code, enter:",
  "agents.oauth.device_step3":
    "3. Approve access. Click \"Confirm\" once you've finished — the daemon validates with MiniMax.",

  // ── Agents — knowledge uploader ──────────────────────────
  "agents.knowledge.processing": "Processing file…",
  "agents.knowledge.dropzone_hint": "Drag files here, or click to choose",
  "agents.knowledge.accepted_formats": ".md · .txt · .pdf · up to 16 MB",
  "agents.knowledge.list_error": "Could not list knowledge: {error}",
  "agents.knowledge.uploaded_count": "Uploaded documents ({count})",
  "agents.knowledge.tokens_per_turn": "~{count} tokens per turn",
  "agents.knowledge.refreshing": "Refreshing…",
  "agents.knowledge.empty": "You haven't uploaded any documents yet.",
  "agents.knowledge.size_b": "{size} B",
  "agents.knowledge.size_kb": "{size} KB",
  "agents.knowledge.size_mb": "{size} MB",
  "agents.knowledge.size_tokens": "{size} · ~{tokens} tokens",
  "agents.knowledge.delete_aria": "Delete {filename}",

  // ── Toast host ───────────────────────────────────────────
  "toast.region_label": "Notifications",
  "toast.dismiss_aria": "Dismiss notification",

  // ── Command palette (Cmd+K) ──────────────────────────────
  "cmdk.dialog_label": "Command palette",
  "cmdk.search_placeholder": "Search actions or conversations…",
  "cmdk.shortcuts_title": "Keyboard shortcuts",
  "cmdk.shortcut_toggle": "Open / close command palette",
  "cmdk.shortcut_navigate": "Navigate results",
  "cmdk.shortcut_run": "Run action",
  "cmdk.shortcut_close": "Close palette",
  "cmdk.shortcut_focus_search": "Focus search in the sidebar",
  "cmdk.back_to_list": "← Back to the list",
  "cmdk.no_results": "No results",
  "cmdk.results_overflow": "{count} results — scroll for more",

  // ── App-level chrome ─────────────────────────────────────
  "app.bootstrap.error_title": "Error contacting the daemon",
  "app.bootstrap.retry": "Retry",
  "app.bootstrap.loading": "Loading…",

  // ── Tail-end strings (post-batch additions) ──────────────
  "chat.input.error_no_recipient":
    "Recipient not known yet (wait for an inbound message first)",
  "chat.input.error_state_change": "Error changing state",
  "chat.input.error_send": "Error sending",
  "marketing.sidebar.no_match": "No leads match the filters.",
  "marketing.wizard.error.address_invalid": "Address must be a valid email.",
  "marketing.wizard.error.imap_host_required": "IMAP host required.",
  "marketing.wizard.error.imap_username_required":
    "IMAP username required (typically the same address).",
  "marketing.wizard.error.name_required": "Name required.",
  "marketing.wizard.error.primary_email_invalid":
    "Primary email must be valid.",
  "marketing.wizard.error.smtp_host_username_required":
    "SMTP host + username required.",
  "marketing.wizard.field.imap_username":
    "Username (typically same as address)",
  "marketing.wizard.field.seller_name_placeholder": "Pedro García",
  "marketing.wizard.field.signature_hint":
    'Empty = generated as "—\\n{name}". Plain text.',
  "marketing.wizard.field.agent_label": "AI agent",
  "marketing.wizard.field.agent_hint":
    "The agent whose prompt + model we'll use to draft replies. Without an agent there are no auto-drafts.",
  "marketing.wizard.field.agent_pick": "Select an agent…",
  "marketing.wizard.field.agent_inactive": " (inactive)",
  "marketing.wizard.field.agent_none_yet":
    "No agents created yet. Create one from the Agents module and come back.",
  "marketing.wizard.error.agent_required":
    "Select an agent so the seller can generate AI drafts.",
  "marketing.wizard.field.auto_detected": "Detected: {provider}",
  "marketing.credentials.password_label": "Password",
  "marketing.credentials.password_placeholder": "••••••••",
  "marketing.credentials.password_hint":
    "Stored securely.",
  "marketing.credentials.password_hint_existing":
    "Empty = keep the current password. Type a new one to overwrite.",
  "marketing.credentials.probe_button": "Test connection",
  "marketing.credentials.probing": "Testing…",
  "marketing.credentials.probe_ok": "Credentials valid",
  "marketing.credentials.probe_fail": "Could not connect · {message}",
  "marketing.credentials.probe_need_password":
    "Type the password to test the connection.",
  "marketing.credentials.save_failed":
    "Could not save password: {message}",
  "marketing.followup_profile.cadence_day": "Day +{n}",
  "marketing.followup_profile.cadence_hour": "Hour +{n}",

  // ── Spam / promo filter ───────────────────────────────────
  "marketing.spamFilter.title": "Email filters",
  "marketing.spamFilter.subtitle":
    "Spam and promo detector. Customize blocked domains, keywords, and the classifier sensitivity.",
  "marketing.spamFilter.tab": "Filters",
  "marketing.spamFilter.sensitivity.title": "Sensitivity",
  "marketing.spamFilter.sensitivity.subtitle":
    "How aggressive the classifier should be. Stricter = less spam but higher risk of blocking legitimate mail.",
  "marketing.spamFilter.sensitivity.preset.lax": "Lax",
  "marketing.spamFilter.sensitivity.preset.lax_desc":
    "Only blocks mails with no visible text (image-only).",
  "marketing.spamFilter.sensitivity.preset.balanced": "Balanced",
  "marketing.spamFilter.sensitivity.preset.balanced_desc":
    "Recommended. Blocks newsletters, no-reply senders with promo keywords, and weak-signal combinations.",
  "marketing.spamFilter.sensitivity.preset.strict": "Strict",
  "marketing.spamFilter.sensitivity.preset.strict_desc":
    "More aggressive: catches mails with as few as 2 images and little text. May block valid mail.",
  "marketing.spamFilter.sensitivity.preset.custom": "Custom",
  "marketing.spamFilter.sensitivity.preset.custom_desc":
    "Set your own thresholds with the advanced controls.",
  "marketing.spamFilter.thresholds.image_only_drop": "Block image-only emails",
  "marketing.spamFilter.thresholds.image_heavy_drop":
    "Block emails with many images and little text",
  "marketing.spamFilter.thresholds.image_heavy_min_count":
    "Minimum images to count as image-heavy",
  "marketing.spamFilter.thresholds.image_heavy_max_text_chars":
    "Max visible text (characters)",
  "marketing.spamFilter.thresholds.role_keyword_drop":
    "Block no-reply senders with promo keywords",
  "marketing.spamFilter.thresholds.multi_weak_drop":
    "Block when multiple weak signals stack",
  "marketing.spamFilter.thresholds.multi_weak_threshold":
    "Number of weak signals required to block",
  "marketing.spamFilter.rules.title": "Custom lists",
  "marketing.spamFilter.rules.subtitle":
    "\"Always allow\" lists override everything else. \"Block\" lists fire before the auto classifier.",
  "marketing.spamFilter.rules.section.domain_block": "Blocked domains",
  "marketing.spamFilter.rules.section.domain_allow": "Always-allow domains",
  "marketing.spamFilter.rules.section.keyword_block": "Blocked keywords",
  "marketing.spamFilter.rules.section.keyword_allow": "Always-allow keywords",
  "marketing.spamFilter.rules.section.sender_block": "Blocked senders",
  "marketing.spamFilter.rules.section.sender_allow": "Always-allow senders",
  "marketing.spamFilter.rules.empty": "No rules in this category",
  "marketing.spamFilter.rules.add_placeholder.domain": "example.com",
  "marketing.spamFilter.rules.add_placeholder.keyword": "limited time offer",
  "marketing.spamFilter.rules.add_placeholder.sender": "someone@example.com",
  "marketing.spamFilter.rules.add_button": "Add",
  "marketing.spamFilter.rules.delete_aria": "Delete rule",
  "marketing.spamFilter.test.title": "Test the filter",
  "marketing.spamFilter.test.subtitle":
    "Paste a sample email to see how the filter would classify it with the current configuration.",
  "marketing.spamFilter.test.from_label": "Sender",
  "marketing.spamFilter.test.from_placeholder": "someone@example.com",
  "marketing.spamFilter.test.subject_label": "Subject",
  "marketing.spamFilter.test.body_label": "Body (plain text or HTML)",
  "marketing.spamFilter.test.run_button": "Test",
  "marketing.spamFilter.test.verdict_human": "Would be accepted as a lead",
  "marketing.spamFilter.test.verdict_promo": "Would be blocked",
  "marketing.spamFilter.test.signal.image_count": "Images detected",
  "marketing.spamFilter.test.signal.visible_text_chars": "Visible text (chars)",
  "marketing.spamFilter.test.signal.keyword_hits": "Matched keywords",
  "marketing.spamFilter.test.signal.sender_role": "No-reply style sender",
  "marketing.spamFilter.reason.domain_blocklist": "Domain in your block list",
  "marketing.spamFilter.reason.sender_blocklist": "Sender in your block list",
  "marketing.spamFilter.reason.image_only": "Image-only body",
  "marketing.spamFilter.reason.image_heavy_low_text":
    "Too many images and very little text",
  "marketing.spamFilter.reason.noreply_with_keyword":
    "No-reply sender with a promo keyword",
  "marketing.spamFilter.reason.multi_weak_signals":
    "Multiple promo signals stacked",
  "marketing.spamFilter.save_ok": "Settings saved",
  "marketing.spamFilter.save_failed":
    "Could not save settings: {message}",
  "marketing.spamFilter.rule_add_failed":
    "Could not add rule: {message}",
  "marketing.spamFilter.rule_delete_failed":
    "Could not delete rule: {message}",
  "marketing.spamFilter.test_failed":
    "Could not run the test: {message}",

  "ui.search.clear_aria": "Clear search",
  "shell.sheet.open_aria": "Open menu",
  "shell.sheet.close_aria": "Close menu",

  // ── Confirms ─────────────────────────────────────────────
  "confirm.delete_title": "Delete",
  "confirm.delete_body": "This action cannot be undone.",

  // ── Audit log (Phase 83.12.audit-page) ───────────────────
  "audit.title": "Audit log",
  "audit.filter.method": "Method",
  "audit.filter.method_placeholder": "e.g. nexo/admin/agents/upsert",
  "audit.filter.result": "Result",
  "audit.filter.result.all": "All",
  "audit.filter.result.ok": "OK",
  "audit.filter.result.error": "Error",
  "audit.filter.result.denied": "Denied",
  "audit.filter.microapp": "Microapp",
  "audit.filter.microapp_placeholder": "e.g. agent-creator",
  "audit.filter.since": "Since",
  "audit.filter.since.24h": "Last 24h",
  "audit.filter.since.7d": "Last 7 days",
  "audit.filter.since.30d": "Last 30 days",
  "audit.filter.reload": "Reload",
  "audit.row.copy_hash": "Copy hash",
  "audit.row.copied": "Copied",
  "audit.empty.title": "No entries",
  "audit.empty.body":
    "Admin calls will appear here. Adjust filters if you expected to see activity.",
  "audit.load_more": "Load more",
  "audit.load_more_count": "Showing {shown} of {total}",
  "audit.error.banner": "Error loading audit log: {message}",
} as const satisfies Catalog;

export default en;
