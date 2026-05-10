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

  // Wizard

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

  // ── Marketing · followup profile editor ──────────────────

  // ── Marketing · JSON editor modal ────────────────────────

  // ── Marketing · timeline ─────────────────────────────────

  // ── Marketing · mailbox form ─────────────────────────────

  // ── Marketing · routing rule editor ──────────────────────

  // ── Marketing · seller form ──────────────────────────────

  // ── Marketing · template editor ──────────────────────────

  // ── Marketing · snippet editor ───────────────────────────

  // ── Marketing · notification templates editor ────────────

  // ── Marketing · drafts inbox ─────────────────────────────

  // ── Marketing · health view ──────────────────────────────

  // ── Marketing · settings view ────────────────────────────

  // ── Marketing on/off (kill switch) ───────────────────────

  // ── Scoring config ───────────────────────────────────────

  // ── Compose (operator-initiated outbound) ───────────────

  // ── Email templates (block-based builder) ────────────────

  // Editor pane

  // Block library labels

  // Block property labels

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

  // ── Spam / promo filter ───────────────────────────────────

  "ui.search.clear_aria": "Clear search",
  "shell.sheet.open_aria": "Open menu",
  "shell.sheet.close_aria": "Close menu",

  // ── Confirms ─────────────────────────────────────────────
  "confirm.delete_title": "Delete",
  "confirm.delete_body": "This action cannot be undone.",

  // ── LLM keys (Phase 90.3.15) ─────────────────────────────
  "llm_keys.title": "LLM keys",
  "llm_keys.action.new": "+ New",
  "llm_keys.action.reload": "Reload",
  "llm_keys.row.rotate": "Rotate credential",
  "llm_keys.row.delete": "Delete instance",
  "llm_keys.row.tenant_scope.global": "global",
  "llm_keys.empty.body": "No providers configured. Click \"+ New\" to add one.",
  "llm_keys.delete.confirm": "Delete instance \"{id}\"? Agents referencing it will stop working.",

  // ── Skills (Phase 90.3.14) ───────────────────────────────
  "skills.title": "Skills",
  "skills.action.reload": "Reload",
  "skills.row.delete": "Delete skill",
  "skills.delete.confirm": "Delete skill \"{name}\"? This removes the directory from disk.",
  "skills.deleting": "Deleting \"{name}\"…",
  "skills.empty.body": "No skills configured. Use the CLI or extension contents to add them.",
  "skills.view.empty_title": "Skills",
  "skills.view.loading": "Loading…",
  "skills.view.select_a_skill": "Select a skill from the list.",

  // ── Dashboard (Phase 90.3.13) ────────────────────────────
  "dashboard.title": "Dashboard",
  "dashboard.action.reload": "Reload",
  "dashboard.partial_outage": "Partial outage:",
  "dashboard.metric.agents": "Agents",
  "dashboard.metric.agents_hint": "Total configured agents",
  "dashboard.metric.llm_providers": "LLM providers",
  "dashboard.metric.llm_providers_hint": "Instances in llm.yaml",
  "dashboard.metric.audit_recent": "Audit 24h",
  "dashboard.metric.audit_recent_hint": "Admin RPC calls in last 24h",

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
