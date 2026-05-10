// Spanish catalog. Keys are namespaced `<area>.<surface>.<token>`.
// Add new entries alongside the English mirror in `en.ts` —
// the type system enforces parity at compile time.

import type { Catalog } from "../types";

const es = {
  // ── Common atoms (reused everywhere) ─────────────────────
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.confirm": "Confirmar",
  "common.skip": "Saltar por ahora",
  "common.continue": "Continuar",
  "common.back": "Volver",
  "common.loading": "Cargando…",
  "common.search": "Buscar",
  "common.clear": "Limpiar",
  "common.add": "Agregar",
  "common.start": "Empezar",
  "common.finish": "Terminar",
  "common.required": "obligatorio",
  "common.yes": "Sí",
  "common.no": "No",

  // ── Shell ────────────────────────────────────────────────
  "shell.rail.tablist_label": "Módulos del workspace",
  "shell.rail.tenant_label": "Cambiar empresa — actual: {tenant}",
  "shell.rail.module_disabled": "{label} ({reason})",
  "shell.rail.module_disabled_manifest_invalid": "manifiesto inválido",
  "shell.rail.module_disabled_migration_failed":
    "migración fallida ({from} → {to})",
  "shell.rail.module_disabled_default": "deshabilitado",
  "shell.rail.tooltip_resize_sidebar": "Redimensionar sidebar",
  "shell.rail.tooltip_resize_context": "Redimensionar panel de contexto",
  "shell.sheet.open_menu": "Abrir menú",
  "shell.sheet.close_menu": "Cerrar menú",
  "shell.sheet.close": "Cerrar",
  "shell.module_crash.title": "El módulo «{module}» no se pudo cargar.",
  "shell.module_crash.unknown": "Error desconocido.",
  "shell.module_crash.reload": "Recargar módulo",
  "shell.unknown_module.title_missing": "Selecciona un módulo",
  "shell.unknown_module.title_unknown": "Módulo desconocido «{module}»",
  "shell.unknown_module.body_missing":
    "Abre un módulo desde el rail a la izquierda.",
  "shell.unknown_module.body_unknown":
    "Este módulo no está instalado en tu workspace. Usa el rail para cambiar.",
  "shell.tenant_switcher.aria_loading": "Cargando empresas",
  "shell.tenant_switcher.aria_error": "Carga de empresas falló",
  "shell.announce.module_changed": "Cambiaste a módulo {label}",

  // ── Locale switcher ──────────────────────────────────────
  "locale.label": "Idioma",
  "locale.es": "Español",
  "locale.en": "English",

  // ── Chat module ──────────────────────────────────────────
  "chat.sidebar.title": "Conversaciones",
  "chat.sidebar.subtitle": "{count} chats",
  "chat.sidebar.live_indicator": "Inbox activo",
  "chat.sidebar.search_placeholder": "Buscar conversaciones…",
  "chat.menu.cmdk": "Paleta de comandos",
  "chat.menu.cmdk_hint": "Cmd / Ctrl + K",
  "chat.cmdk_hint.tip_title": "Tip: paleta de comandos",
  "chat.cmdk_hint.instruction_prefix": "Pulsa",
  "chat.cmdk_hint.instruction_suffix": "en cualquier momento para buscar conversaciones, pausar chats o crear agentes sin salir del teclado.",
  "chat.cmdk_hint.close_label": "Cerrar tip",
  "chat.menu.agents": "Administrar agentes",
  "chat.menu.labels": "Administrar etiquetas",
  "chat.menu.sound_off": "Silenciar notificaciones",
  "chat.menu.sound_on": "Activar sonido",
  "chat.menu.rotate_token": "Rotar token de operador",
  "chat.header.actions_more": "Más acciones",
  "chat.header.logout": "Cerrar sesión",
  "chat.empty.no_chats_title": "Sin conversaciones",
  "chat.empty.no_chats_body":
    "Cuando un agente reciba un mensaje, aparecerá acá.",
  "chat.empty.no_results_title": "Sin resultados",
  "chat.empty.no_results_body":
    "Ninguna conversación reciente coincide con «{query}».",
  "chat.empty.search_history": "Buscar en historial completo",
  "chat.empty.clear_search": "Limpiar búsqueda",
  "chat.input.placeholder": "Escribí un mensaje",
  "chat.input.send": "Enviar",
  "chat.input.emoji_soon": "Emoji (próximamente)",
  "chat.input.attach_soon": "Adjuntar (próximamente)",
  "chat.input.voice_off": "Activar respuesta por voz — el agente responde con audio (TTS)",
  "chat.input.voice_on":
    "Desactivar respuesta por voz — el agente vuelve a responder en texto",
  "chat.input.pause_off":
    "Pausar IA — vos respondés manualmente, el agente queda en silencio",
  "chat.input.pause_on":
    "Reanudar IA — el próximo mensaje del usuario lo responde el agente",

  // ── Chat · header ────────────────────────────────────────
  "chat.header.typing": "escribiendo…",
  "chat.header.paused_by_operator": "Pausado por operador",
  "chat.header.via_channel": "vía {channel}",
  "chat.header.muted_suffix": "· silenciado",
  "chat.header.mute_on_title": "Reactivar notificaciones de este chat",
  "chat.header.mute_off_title": "Silenciar notificaciones de este chat",
  "chat.header.mute_on_aria": "Reactivar notificaciones",
  "chat.header.mute_off_aria": "Silenciar notificaciones",
  "chat.header.more_options": "Más opciones",

  // ── Chat · message bubble ────────────────────────────────
  "chat.message.sender_operator": "Operador",
  "chat.message.system.paused": "Conversación pausada · {time}",
  "chat.message.system.resumed": "Conversación reanudada · {time}",
  "chat.message.system.escalation_requested":
    "Escalación solicitada: {summary} · {time}",
  "chat.message.system.escalation_resolved": "Escalación resuelta · {time}",
  "chat.message.system.pending_dropped":
    "{count} mensajes en cola descartados · {time}",

  // ── Chat · list item ─────────────────────────────────────
  "chat.list_item.time_yesterday": "ayer",
  "chat.list_item.has_prospect": "Tiene prospecto",
  "chat.list_item.actions_aria": "Acciones de la conversación",
  "chat.list_item.menu.rename": "Renombrar",
  "chat.list_item.menu.clear_alias": "Quitar alias",
  "chat.list_item.menu.labels": "Etiquetas",
  "chat.list_item.menu.edit_prospect": "Editar prospecto",
  "chat.list_item.menu.create_prospect": "Crear prospecto",
  "chat.list_item.menu.delete": "Borrar conversación",
  "chat.list_item.rename.title": "Renombrar conversación",
  "chat.list_item.rename.description":
    "El alias se guarda solo en este navegador. Reemplaza «{label}» en la lista de chats.",
  "chat.list_item.rename.placeholder": "Ej: Camilo (cliente premium)",
  "chat.list_item.delete.title": "Borrar conversación",
  "chat.list_item.delete.body":
    "¿Seguro que querés borrar {label} de la lista?",
  "chat.list_item.delete.body_hint":
    "Se borran de tu vista todos los mensajes que ya recibiste en esta conversación. La conversación volverá a aparecer si el contacto envía un mensaje nuevo.",
  "chat.list_item.labels.title": "Etiquetar conversación",
  "chat.list_item.labels.empty":
    "No hay etiquetas todavía. Creá una en el ícono de la barra superior.",
  "chat.list_item.labels.done": "Listo",
  "chat.list_item.prospect.title_edit": "Editar prospecto",
  "chat.list_item.prospect.title_create": "Crear prospecto",
  "chat.list_item.prospect.field_name": "Nombre",
  "chat.list_item.prospect.field_email": "Email",
  "chat.list_item.prospect.field_phone": "Celular",
  "chat.list_item.prospect.field_notes": "Notas",
  "chat.list_item.prospect.field_labels": "Etiquetas",
  "chat.list_item.prospect.email_placeholder": "cliente@empresa.com",
  "chat.list_item.prospect.phone_placeholder": "+57 300 123 4567",
  "chat.list_item.prospect.notes_placeholder":
    "Contexto, próxima acción, presupuesto, plazo…",
  "chat.list_item.prospect.no_labels":
    "No hay etiquetas todavía. Crealas desde el ícono de la barra superior.",
  "chat.list_item.prospect.create": "Crear",
  "chat.list_item.prospect.save_changes": "Guardar cambios",
  "chat.list_item.close_aria": "Cerrar",

  // ── Chat · bot bubble ────────────────────────────────────
  "chat.bot.toggle_open": "Chat con bots IA",
  "chat.bot.title_pick_agent": "Elegí un agente",
  "chat.bot.title_pick_bot": "{agent} · elegí un bot",
  "chat.bot.change_bot": "Cambiar bot",
  "chat.bot.change_agent": "Cambiar agente",
  "chat.bot.loading_agents": "Cargando agentes…",
  "chat.bot.agent_bindings_singular": "{provider} · {count} binding",
  "chat.bot.agent_bindings_plural": "{provider} · {count} bindings",
  "chat.bot.resolving_instance": "Resolviendo instance del agente…",
  "chat.bot.loading_bots": "Cargando bots…",
  "chat.bot.no_bots": "Sin bots asignados a este agente.",
  "chat.bot.error_label": "Error",
  "chat.bot.retry": "Reintentar",
  "chat.bot.bot_no_id": "(sin id)",
  "chat.bot.empty_chat": "Sin mensajes todavía. Escribí abajo para empezar.",
  "chat.bot.input_placeholder": "Escribí al bot…",
  "chat.bot.send": "Enviar",
  "chat.bot.sending": "…",

  // ── Chat · connection banner ─────────────────────────────
  "chat.connection.connecting": "Conectando al firehose…",
  "chat.connection.lagged":
    "Eventos en cola descartados ({count}). Recargá para sincronizar.",
  "chat.connection.disconnected": "Backend no responde. Reintentando…",

  // ── Chat · notify opt-in banner ──────────────────────────
  "chat.notify.body":
    "Habilita las notificaciones para enterarte de nuevos mensajes cuando la pestaña esté en segundo plano.",
  "chat.notify.enable": "Habilitar",
  "chat.notify.enabling": "…",
  "chat.notify.dismiss_aria": "Cerrar aviso",
  "chat.notify.toast_enabled": "Notificaciones activadas.",
  "chat.notify.toast_denied":
    "El navegador rechazó la solicitud. Habilítalas desde la configuración del sitio para reintentar.",

  // ── Chat · escalation badge ──────────────────────────────
  "chat.escalation.confirm_dismiss": "¿Dismissiar esta escalación?",
  "chat.escalation.title": "Escalación pendiente — click para resolver",
  "chat.escalation.label": "Escalado",

  // ── Chat · pause indicator ───────────────────────────────
  "chat.pause.message":
    "Conversación pausada — el agente no responderá hasta que reanudes.",
  "chat.pause.resume": "Reanudar",
  "chat.pause.resuming": "Reanudando…",

  // ── Chat · label manager modal ───────────────────────────
  "chat.labels.title": "Etiquetas",
  "chat.labels.close_aria": "Cerrar",
  "chat.labels.create_section": "Crear nueva",
  "chat.labels.name_placeholder": "Nombre (ej: VIP, Soporte, Pagado)",
  "chat.labels.color_aria": "Color",
  "chat.labels.create_aria": "Crear etiqueta",
  "chat.labels.swatch_aria": "Usar color {color}",
  "chat.labels.empty":
    "Aún no creaste etiquetas. La primera la usás para agrupar chats por motivo (VIP, soporte, lead caliente, etc.).",
  "chat.labels.row_delete_yes": "Eliminar",
  "chat.labels.row_delete_no": "No",
  "chat.labels.row_delete_aria": "Eliminar {name}",

  // ── Chat · search history modal ──────────────────────────
  "chat.search_history.dialog_aria": "Buscar en historial",
  "chat.search_history.placeholder": "Buscar en historial completo…",
  "chat.search_history.close_aria": "Cerrar",
  "chat.search_history.agent_label": "Agente:",
  "chat.search_history.agent_choose": "— elegir —",
  "chat.search_history.loading_agents": "Cargando agentes…",
  "chat.search_history.pick_agent": "Elegí un agente para buscar.",
  "chat.search_history.min_chars": "Escribí al menos 2 caracteres.",
  "chat.search_history.searching": "Buscando…",
  "chat.search_history.no_results": "Sin resultados para «{query}».",
  "chat.search_history.hit_via": "{role} · vía {plugin}",

  // ── Chat · main empty state ──────────────────────────────
  "chat.main.empty.title": "Selecciona una conversación",
  "chat.main.empty.body": "Elige un chat de la lista para ver los mensajes.",

  // ── Chat · manifest ──────────────────────────────────────
  "chat.manifest.label": "Chats",
  "chat.manifest.tooltip": "Conversaciones",
  "chat.manifest.cmdk.go_to": "Ir a {label}",
  "chat.manifest.cmdk.group_recent": "Recientes",
  "chat.manifest.cmdk.group_conversations": "Conversaciones",
  "chat.manifest.cmdk.group_actions": "Acciones",
  "chat.manifest.cmdk.pause_active": "Pausar conversación activa",
  "chat.manifest.cmdk.resume_active": "Reanudar conversación activa",

  // ── Marketing module ─────────────────────────────────────

  // Wizard

  // ── Lead drawer ──────────────────────────────────────────
  "lead.section.person": "Persona",
  "lead.section.company": "Empresa",
  "lead.section.notes": "Notas internas",
  "lead.section.followup": "Followup",
  "lead.section.timeline": "Timeline",
  "lead.notes.placeholder":
    'Notas internas, no salen al cliente. Markdown soportado.\n\nEj: "llamé a la asistente, vuelvo el miércoles".',
  "lead.notes.empty_hint":
    "Sin notas todavía. Solo el operador las ve.",
  "lead.notes.delete_title": "Borrar notas",
  "lead.notes.delete": "Borrar",
  "lead.followup.skip": "Skip",
  "lead.followup.postpone": "Postpone",
  "lead.followup.next_in": "Próximo en",
  "lead.followup.attempts": "Intentos",
  "lead.followup.no_followup": "No hay followup programado",
  "lead.followup.skip_title": "Cancelar el siguiente recordatorio",
  "lead.followup.postpone_title": "Mover el siguiente recordatorio",
  "lead.followup.apply": "Aplicar",
  "lead.followup.preset_1d": "1 día",
  "lead.followup.preset_3d": "3 días",
  "lead.followup.preset_1w": "1 semana",
  "lead.followup.cancel_title": "Cancelar",
  "lead.followup.invalid_datetime": "invalid_datetime",
  "lead.followup.attempts_max": " / 3",
  "lead.section.state": "Estado",
  "lead.section.seller": "Seller",
  "lead.section.why": "¿Por qué este lead?",
  "lead.person.alt_emails_prefix": "alt",
  "lead.company.industry": "Industria",
  "lead.company.size": "Tamaño",
  "lead.company.scraped": "✓ scraped {when}",
  "lead.company.no_corporate_email": "Personal email — sin dominio empresarial",
  "lead.company.enrichment_confidence":
    "Confianza enrichment: {percent}%",
  "lead.company.search_manual": "Buscar empresa manualmente",
  "lead.score.label": "Lead score",
  "lead.score.high": "alto",
  "lead.score.medium": "medio",
  "lead.score.low": "bajo",
  "lead.score.suffix": "/100",
  "lead.score.sentiment": "Sentiment",
  "lead.score.intent": "Intent",
  "lead.person.loading": "Cargando…",
  "lead.detail.loading_leads": "Cargando leads…",
  "lead.detail.no_extension": "Extension marketing no disponible.",
  "lead.detail.select_prompt": "Selecciona un lead de la lista.",
  "lead.detail.loading_person": "Cargando persona…",
  "lead.detail.assigned_to": "asignado a",
  "lead.detail.score": "Score {score}",
  "lead.detail.tag.live": "live",
  "lead.detail.tag.demo_off": "demo · extension off",
  "lead.detail.thread_unavailable": "Hilo no disponible · {error}",
  "lead.detail.thread_loading": "Cargando hilo…",
  "lead.detail.thread_empty":
    "Lead sin mensajes — todavía no llega ningún inbound al broker para este hilo.",
  "lead.detail.outbound_from": "Outbound desde",
  "lead.detail.draft_mode": "Mock — modo draft",
  "lead.detail.hint_placeholder":
    "Hint opcional para la IA (ej: enfocar en pricing, mencionar promo)…",
  "lead.detail.generating": "Generando…",
  "lead.detail.generate_button": "Generar borrador con IA",
  "lead.detail.hide_hint": "Ocultar hint",
  "lead.detail.add_hint": "Añadir hint",
  "draft.approved": "Draft aprobado · enviando…",
  "draft.rejected": "Draft descartado.",
  "draft.subject_placeholder": "Subject (vacío ⇒ heredar del lead)",
  "draft.subject_label": "Subject:",
  "draft.title": "IA Draft · pendiente de aprobación",
  "draft.error_prefix": "No se pudo completar la acción · {error}",
  "draft.approve.busy": "Enviando…",
  "draft.approve.label": "Aprobar y enviar",
  "draft.edit": "Editar",
  "draft.reject.busy": "Descartando…",
  "draft.reject.label": "Descartar",
  "draft.outbound_from_seller": "Outbound desde seller",
  "draft.outbound_from_seller.title": "Será enviado desde el email del seller",
  "draft.save_and_send.busy": "Guardando…",
  "draft.save_and_send.label": "Guardar y enviar",
  "draft.save_only": "Solo guardar",
  "next_step.title": "Sugerencia · próximo paso",
  "next_step.applying": "Aplicando…",
  "next_step.move_to": "Mover a {state}",
  "next_step.reason.out_of_scope": "intent: out_of_scope · cerrar lead",
  "next_step.reason.ready_pos": "ready_to_buy + sentiment positivo",
  "next_step.reason.intent_start": "intent: {intent} · iniciar conversación",
  "next_step.reason.support": "intent: support_request · resolver consulta",
  "next_step.reason.ready_very_pos": "ready_to_buy + sentiment muy positivo",
  "next_step.reason.objecting_neg":
    "objeciones + sentiment negativo · perdido",
  "next_step.reason.ready_meeting": "intent: ready_to_buy · agendar reunión",
  "next_step.reason.post_meeting": "post-reunión · marcar qualified",
  "next_step.reason.objecting_post_meeting":
    "objeciones tras reunión · perdido",
  "score_explainer.title": "Score · ¿por qué?",
  "score_explainer.rule_matched": "Rule matcheada:",
  "score_explainer.no_breakdown": "Sin desglose disponible.",
  "state_machine.current": "actual",
  "state_machine.move": "Mover →",
  "state_machine.mark_lost": "Marcar lost",
  "state_machine.reason_prompt": 'Razón del cambio a "{state}":',

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
  "wizard.welcome.title": "Configurar agente",
  "wizard.welcome.intro":
    "Conectamos un proveedor de LLM, emparejamos un número de WhatsApp y creamos el agente. Toma unos 3 minutos. Si te interrumpes, tu progreso queda guardado.",
  "wizard.welcome.step1":
    "Pegás una clave de API (MiniMax por defecto). Se valida sin abandonar este servidor.",
  "wizard.welcome.step2":
    "Escaneás un código QR con tu WhatsApp para emparejar.",
  "wizard.welcome.step3":
    "Definís la persona del agente y listo: empieza a responder.",
  "wizard.welcome.start": "Empezar",

  // ── Wizard — StepShell rail ──────────────────────────────
  "wizard.shell.app_title": "nexo-rs admin",
  "wizard.shell.app_subtitle": "Configuración inicial",
  "wizard.shell.rail.welcome.title": "Bienvenida",
  "wizard.shell.rail.welcome.blurb": "Configurar agente",
  "wizard.shell.rail.llm.title": "Proveedor LLM",
  "wizard.shell.rail.llm.blurb": "Conecta una clave de API",
  "wizard.shell.rail.pairing.title": "WhatsApp",
  "wizard.shell.rail.pairing.blurb": "Empareja un dispositivo",
  "wizard.shell.rail.agent.title": "Agente",
  "wizard.shell.rail.agent.blurb": "Define la persona",
  "wizard.shell.footer_note":
    "Puedes cerrar esta ventana — tu progreso se guarda hasta el siguiente login.",

  // ── Wizard — LLM step ────────────────────────────────────
  "wizard.llm.title": "Proveedor LLM",
  "wizard.llm.subtitle":
    "Elegí una instancia configurada. Cada instancia trae su propia API key, factory y región — el agente la usa tal cual sin tocarla acá.",
  "wizard.llm.empty":
    "Todavía no hay instancias de LLM. Crea una para que el agente pueda conectarse.",
  "wizard.llm.create_first": "Crear instancia",
  "wizard.llm.create_more": "Crear otra instancia",
  "wizard.llm.field_instance": "Instancia",
  "wizard.llm.tenant_suffix": " · tenant {tenant}",
  "wizard.llm.delete_title": "Borrar instancia",
  "wizard.llm.delete_confirm":
    "Borrar la instancia \"{id}\"? Su API key también se desvincula.",
  "wizard.llm.saving": "Guardando…",
  "wizard.llm.continue": "Continuar",

  // ── Wizard — Pairing step ────────────────────────────────
  "wizard.pairing.title": "Empareja WhatsApp",
  "wizard.pairing.subtitle":
    "Abre WhatsApp en tu teléfono → Configuración → Dispositivos vinculados → Vincular dispositivo, y escanea el código.",
  "wizard.pairing.generate_qr": "Generar código QR",
  "wizard.pairing.qr_alt": "WhatsApp QR",
  "wizard.pairing.confirming": "Confirmando en tu teléfono…",
  "wizard.pairing.waiting": "Esperando escaneo…",
  "wizard.pairing.regenerate_qr": "Regenerar QR",
  "wizard.pairing.expired": "El código QR expiró antes de escanearse.",
  "wizard.pairing.regenerate_code": "Regenerar código",
  "wizard.pairing.linked_with_jid":
    "✅ Dispositivo emparejado ({jid}). Avanzando…",
  "wizard.pairing.linked": "✅ Dispositivo emparejado. Avanzando…",

  // ── Wizard — Agent step ──────────────────────────────────
  "wizard.agent.title": "Crear agente",
  "wizard.agent.subtitle":
    "El agente recibirá los mensajes del WhatsApp emparejado en el paso anterior y responderá usando el modelo que conectaste.",
  "wizard.agent.field_name": "Nombre visible",
  "wizard.agent.name_placeholder": "Ana — soporte",
  "wizard.agent.id_label": "ID · {id}",
  "wizard.agent.field_template": "Plantilla",
  "wizard.agent.field_prompt": "Persona / system prompt",
  "wizard.agent.field_language": "Idioma",
  "wizard.agent.lang_es": "Español",
  "wizard.agent.lang_en": "English",
  "wizard.agent.submit": "Crear agente",
  "wizard.agent.error_id":
    "El id debe ser slug en minúsculas: a-z, 0-9, _, -.",
  "wizard.agent.error_name": "El nombre debe tener al menos 2 caracteres.",
  "wizard.agent.error_prompt_min":
    "El prompt del sistema necesita al menos 10 caracteres.",
  "wizard.agent.error_prompt_max":
    "Prompt demasiado largo (máx. 10000 caracteres).",

  // ── Wizard — Done step ───────────────────────────────────
  "wizard.done.title": "Listo",
  "wizard.done.subtitle":
    "Tu agente está activo. El próximo mensaje que llegue al número emparejado disparará una respuesta automática.",
  "wizard.done.go_dashboard": "Ir al dashboard",

  // ── Wizard — Page chrome ─────────────────────────────────
  "wizard.page.back": "← Atrás",
  "wizard.page.return_dashboard": "Volver al dashboard",
  "wizard.page.restart": "Empezar de nuevo",
  "wizard.page.restart_confirm": "¿Empezar de nuevo? Tu progreso se borrará.",

  // ── Auth — Login ─────────────────────────────────────────
  "auth.login.title": "nexo-rs admin",
  "auth.login.subtitle": "Pegá el token de acceso que el operador configuró.",
  "auth.login.token_placeholder": "AGENT_CREATOR_TOKEN…",
  "auth.login.error_empty": "Pegá tu token de acceso para continuar.",
  "auth.login.error_default": "Token rechazado por el daemon.",
  "auth.login.connecting": "Conectando…",
  "auth.login.connect": "Conectar",

  // ── Auth — Token rotation ────────────────────────────────
  "auth.token.button_title": "Rotar token de operador",
  "auth.token.modal_title": "Rotar token de operador",
  "auth.token.intro":
    "El daemon escribe el nuevo valor a disco, lo emite a microapps conectados (sesión actual cae en el siguiente request) y deja una entrada de auditoría en el firehose. Después de rotar, vuelve a iniciar sesión con el nuevo token.",
  "auth.token.field_new":
    "Nuevo token (opcional, mín {min} caracteres)",
  "auth.token.field_new_placeholder":
    "Vacío = generado por el daemon (32 bytes hex)",
  "auth.token.error_min":
    "El nuevo token debe tener al menos {min} caracteres.",
  "auth.token.field_reason": "Motivo (opcional, audit log)",
  "auth.token.reason_placeholder":
    "ej. \"rotación programada\", \"key compromised\"",
  "auth.token.rotating": "Rotando…",
  "auth.token.rotate": "Rotar token",
  "auth.token.toast_success_with_token":
    "Token rotado. Nuevo hash: {hash}. Iniciá sesión con el nuevo token.",
  "auth.token.toast_success_generated":
    "Token rotado. Nuevo hash: {hash}. Generated value visible in audit log; copia el nuevo bearer del daemon antes de re-iniciar sesión.",
  "auth.token.toast_capability":
    "El operador no concedió la capability `auth_rotate` a este microapp. Edita extensions.yaml.<id>.capabilities_grant.",
  "auth.token.toast_invalid_params": "Parámetros rechazados: {message}",
  "auth.token.toast_error": "Error al rotar token: {message}",

  // ── Agents — list page ───────────────────────────────────
  "agents.title": "Agentes",
  "agents.back_to_chat": "Volver al chat",
  "agents.new_agent": "Nuevo agente",
  "agents.section.instances": "Instancias de LLM",
  "agents.new_instance": "Nueva instancia",
  "agents.no_instances":
    "Sin instancias configuradas. Crea una para que tus agentes tengan API keys independientes.",
  "agents.tenant_prefix": "tenants.{scope}",
  "agents.secret_backed": "secret-backed",
  "agents.rotate_credentials": "Rotar credenciales de la instancia",
  "agents.delete_instance": "Borrar instancia",
  "agents.delete_instance_button": "Eliminar",
  "agents.delete_instance_confirm":
    "Borrar la instancia \"{id}\"? Su API key también se desvincula.",
  "agents.list.empty":
    "Aún no hay agentes configurados. Usá Nuevo agente para crear el primero.",
  "agents.list.empty_em": "Nuevo agente",
  "agents.inactive": "inactivo",
  "agents.sellers_tooltip": "Sellers de marketing usando este agente:\n{names}",
  "agents.sellers_count_one": "📧 {count} email seller",
  "agents.sellers_count_other": "📧 {count} email sellers",
  "agents.bindings_count_one": "{provider} · {count} binding",
  "agents.bindings_count_other": "{provider} · {count} bindings",
  "agents.persona_button": "Persona / conocimiento",
  "agents.persona_title": "Persona y conocimiento del agente",
  "agents.repair_button": "Reemparejar",
  "agents.repair_title": "Reemparejar WhatsApp para este agente",
  "agents.edit_button": "Editar",
  "agents.delete_title": "Eliminar agente",
  "agents.delete_button": "Eliminar",

  // ── Agents — delete confirm modal ────────────────────────
  "agents.delete.confirm_heading": "¿Eliminar agente {id}?",
  "agents.delete.body":
    "El daemon va a marcar el agente como inactivo, drenar las sesiones en vuelo y luego remover el bloque de agents.yaml. Las credenciales asociadas (WhatsApp, etc.) quedan intactas.",
  "agents.delete.warning":
    "Esta acción no es reversible — vas a tener que volver a crear y reemparejar el agente si lo querés de vuelta.",
  "agents.delete.checking_sellers": "Verificando sellers vinculados…",
  "agents.delete.affected_one":
    "📧 Marketing tiene {count} seller vinculado a este agente:",
  "agents.delete.affected_other":
    "📧 Marketing tiene {count} sellers vinculados a este agente:",
  "agents.delete.cascade_note":
    "Al confirmar, marketing.yaml se actualiza primero (se quitan agent_id + notification_settings) y luego se elimina el agente. Tendrás que re-vincularlos a otro agente desde /m/marketing/settings/sellers.",

  // ── Agents — edit modal ──────────────────────────────────
  "agents.edit.title": "Editar agente {id}",
  "agents.edit.field_instance": "Instancia LLM",
  "agents.edit.no_instances": "Sin instancias. Creá una primero.",
  "agents.edit.field_model": "Modelo",
  "agents.edit.model_uncatalogued": "{model} (no catalogado)",
  "agents.edit.live_models": "✓ {count} modelos en vivo de la API.",
  "agents.edit.field_language": "Idioma",
  "agents.edit.language_auto": "(automático)",
  "agents.edit.locale_help_prefix": "Locale BCP-47. Ej: ",
  "agents.edit.locale_help_es_ar": " ⇒ voseo + voz argentina; ",
  "agents.edit.locale_help_es_es": " ⇒ tuteo castellano + voz española; ",
  "agents.edit.locale_help_en_gb": " ⇒ ortografía británica + voz inglesa.",
  "agents.edit.field_system_prompt": "System prompt",
  "agents.edit.email_sellers": "📧 Email sellers",
  "agents.edit.no_sellers_bound": "Sin sellers vinculados a este agente.",
  "agents.edit.via_seller": "vía seller",
  "agents.edit.unbound_label": "(unbound)",
  "agents.edit.open_seller_title": "Abrir seller en Marketing",
  "agents.edit.unbind": "× Desvincular",
  "agents.edit.unbind_title": "Desvincular este seller del agente",
  "agents.edit.loading_sellers": "Cargando sellers…",
  "agents.edit.all_bound":
    "Todos los sellers ya están vinculados a este agente.",
  "agents.edit.bind_pick_placeholder": "— Vincular seller —",
  "agents.edit.bind_move_label": "{seller} (mover desde {agent})",
  "agents.edit.bind_button": "Vincular",
  "agents.edit.bind_busy": "...",
  "agents.edit.other_bindings": "Otros bindings (solo lectura)",
  "agents.edit.bind_partial_failure":
    "vinculado, pero {agent} falló: {error}",
  "agents.edit.unbind_partial_failure":
    "desvinculado, pero {agent} falló: {error}",

  // ── Agents — heartbeat field ─────────────────────────────
  "agents.heartbeat.label": "Heartbeat (tick proactivo)",
  "agents.heartbeat.toggle": "Activar heartbeat",
  "agents.heartbeat.off_help":
    "Off — el agente sólo responde a mensajes entrantes. Activa para que dispare on_heartbeat cada cierto tiempo (recordatorios, drip, polling externo).",
  "agents.heartbeat.preset_15m": "Cada 15 min",
  "agents.heartbeat.preset_30m": "Cada 30 min",
  "agents.heartbeat.preset_1h": "Cada hora",
  "agents.heartbeat.preset_4h": "Cada 4 h",
  "agents.heartbeat.preset_1d": "Cada día",
  "agents.heartbeat.preset_custom": "Custom",
  "agents.heartbeat.custom_placeholder": "ej: 90m, 12h, 7d",
  "agents.heartbeat.custom_help_prefix":
    "Literal humantime (segundos ",
  "agents.heartbeat.custom_help_minutes": ", minutos ",
  "agents.heartbeat.custom_help_hours": ", horas ",
  "agents.heartbeat.custom_help_days": ", días ",
  "agents.heartbeat.custom_help_suffix":
    "). Si la cadena queda vacía, el daemon conserva el valor anterior en yaml.",

  // ── Agents — pairing modal ───────────────────────────────
  "agents.pairing_modal.title": "Reemparejar agente {agent_id}",
  "agents.pairing_modal.generating": "Generando QR…",
  "agents.pairing_modal.qr_alt": "QR de emparejamiento",
  "agents.pairing_modal.confirm_phone":
    "Confirmá en el teléfono para terminar el enlace.",
  "agents.pairing_modal.scan_help":
    "Abrí WhatsApp en el celular → Ajustes → Dispositivos vinculados → Vincular dispositivo y escaneá.",
  "agents.pairing_modal.expired": "El QR caducó.",
  "agents.pairing_modal.linked": "✅ Reemparejado",
  "agents.pairing_modal.linked_with": "✅ Reemparejado ({jid})",
  "agents.pairing_modal.close": "Cerrar",
  "agents.pairing_modal.regenerate_qr": "Generar nuevo QR",

  // ── Agents — LLM instance create modal ───────────────────
  "agents.llm_modal.title": "Crear instancia de LLM",
  "agents.llm_modal.step_factory": "Proveedor",
  "agents.llm_modal.step_credentials": "Credenciales",
  "agents.llm_modal.step_model": "Modelo",
  "agents.llm_modal.validating": "Validando credenciales…",
  "agents.llm_modal.validation_failed": "Validación falló",
  "agents.llm_modal.validation_help":
    "Revisa la API key + base URL y reintenta. La instancia no se ha creado todavía.",
  "agents.llm_modal.saving": "Guardando instancia…",
  "agents.llm_modal.id_problem_format":
    "El id debe empezar con letra y contener solo a-z, 0-9 o '-'.",
  "agents.llm_modal.id_problem_dup": "Ya existe una instancia con id '{id}'.",
  "agents.llm_modal.factory_intro":
    "Una instancia es una configuración independiente (key + región) de un proveedor del catálogo.",
  "agents.llm_modal.field_factory": "Proveedor del catálogo",
  "agents.llm_modal.field_auth_mode": "Modo de autenticación",
  "agents.llm_modal.oauth_intro":
    "Este modo usa OAuth — el daemon abrirá un flujo de aprobación en tu navegador. La key nunca pasa por la SPA.",
  "agents.llm_modal.oauth_start": "Iniciar autenticación",
  "agents.llm_modal.field_api_key": "API key (write-through, no se loguea)",
  "agents.llm_modal.api_key_placeholder": "sk-…",
  "agents.llm_modal.live_models": "✓ {count} modelos en vivo de la API",
  "agents.llm_modal.static_catalog": "Catálogo estático ({count} modelos)",
  "agents.llm_modal.field_model": "Modelo",
  "agents.llm_modal.next": "Siguiente",
  "agents.llm_modal.start_oauth": "Iniciar OAuth",
  "agents.llm_modal.validate": "Validar",
  "agents.llm_modal.retry": "Reintentar",
  "agents.llm_modal.create": "Crear instancia",
  "agents.llm_modal.back": "Atrás",
  "agents.llm_modal.auth_api_key": "API key",
  "agents.llm_modal.auth_setup_token": "Setup token (sk-ant-oat01-…)",
  "agents.llm_modal.auth_oauth_auth_code": "OAuth Claude.ai (recomendado)",
  "agents.llm_modal.auth_oauth_device_code": "OAuth Token Plan (device code)",
  "agents.llm_modal.auth_oauth_bundle_import": "Importar bundle JSON",

  // ── Agents — OAuth pane ──────────────────────────────────
  "agents.oauth.starting": "Iniciando flujo OAuth…",
  "agents.oauth.error": "Error: {message}",
  "agents.oauth.exchanging": "Intercambiando código…",
  "agents.oauth.auth_step1_prefix":
    "1. Aprueba el acceso en la pestaña que se abrió. Si no se abrió, ",
  "agents.oauth.auth_step1_link": "haz click aquí",
  "agents.oauth.auth_step1_suffix": ".",
  "agents.oauth.auth_step2_prefix": "2. Anthropic te mostrará un código tipo ",
  "agents.oauth.auth_step2_suffix": ". Pégalo abajo:",
  "agents.oauth.code_placeholder": "abc123#def456",
  "agents.oauth.confirm": "Confirmar",
  "agents.oauth.cancel": "Cancelar",
  "agents.oauth.device_step1_prefix": "1. Abre ",
  "agents.oauth.device_step2": "2. Cuando te pida código, ingresa:",
  "agents.oauth.device_step3":
    "3. Aprueba el acceso. Click \"Confirmar\" cuando hayas terminado — el daemon valida con MiniMax.",

  // ── Agents — knowledge uploader ──────────────────────────
  "agents.knowledge.processing": "Procesando archivo…",
  "agents.knowledge.dropzone_hint":
    "Arrastrá archivos acá, o hacé click para elegir",
  "agents.knowledge.accepted_formats": ".md · .txt · .pdf · hasta 16 MB",
  "agents.knowledge.list_error": "No pude listar el conocimiento: {error}",
  "agents.knowledge.uploaded_count": "Documentos cargados ({count})",
  "agents.knowledge.tokens_per_turn": "~{count} tokens por turno",
  "agents.knowledge.refreshing": "Refrescando…",
  "agents.knowledge.empty": "Aún no subiste ningún documento.",
  "agents.knowledge.size_b": "{size} B",
  "agents.knowledge.size_kb": "{size} KB",
  "agents.knowledge.size_mb": "{size} MB",
  "agents.knowledge.size_tokens": "{size} · ~{tokens} tokens",
  "agents.knowledge.delete_aria": "Eliminar {filename}",

  // ── Toast host ───────────────────────────────────────────
  "toast.region_label": "Notificaciones",
  "toast.dismiss_aria": "Cerrar notificación",

  // ── Command palette (Cmd+K) ──────────────────────────────
  "cmdk.dialog_label": "Paleta de comandos",
  "cmdk.search_placeholder": "Buscar acciones o conversaciones…",
  "cmdk.shortcuts_title": "Atajos de teclado",
  "cmdk.shortcut_toggle": "Abrir / cerrar paleta de comandos",
  "cmdk.shortcut_navigate": "Navegar resultados",
  "cmdk.shortcut_run": "Ejecutar acción",
  "cmdk.shortcut_close": "Cerrar paleta",
  "cmdk.shortcut_focus_search": "Enfocar búsqueda en el sidebar",
  "cmdk.back_to_list": "← Volver a la lista",
  "cmdk.no_results": "Sin resultados",
  "cmdk.results_overflow": "{count} resultados — desliza para ver más",

  // ── App-level chrome ─────────────────────────────────────
  "app.bootstrap.error_title": "Error al contactar el daemon",
  "app.bootstrap.retry": "Reintentar",
  "app.bootstrap.loading": "Cargando…",

  // ── Tail-end strings (post-batch additions) ──────────────
  "chat.input.error_no_recipient":
    "No se conoce el destinatario aún (esperá un mensaje entrante primero)",
  "chat.input.error_state_change": "Error al cambiar estado",
  "chat.input.error_send": "Error al enviar",

  // ── Spam / promo filter ───────────────────────────────────

  "ui.search.clear_aria": "Limpiar búsqueda",
  "shell.sheet.open_aria": "Abrir menú",
  "shell.sheet.close_aria": "Cerrar menú",

  // ── Confirms ─────────────────────────────────────────────
  "confirm.delete_title": "Eliminar",
  "confirm.delete_body": "Esta acción no se puede deshacer.",

  // ── Tenants (Phase 90.3.21) ──────────────────────────────
  "tenants.title": "Empresas",
  "tenants.col.id": "ID",
  "tenants.col.name": "Nombre",
  "tenants.col.status": "Estado",
  "tenants.col.active": "Activa",
  "tenants.status.active": "Activa",
  "tenants.status.inactive": "Inactiva",
  "tenants.row.viewing": "Viendo",
  "tenants.empty.body": "No hay empresas autorizadas para este token.",
  "tenants.deferred.crud_note": "El operador de configuración (crear / renombrar / desactivar) llegará cuando los wrappers admin tenants/* estén expuestos en api/tenants.ts.",

  // ── MCP servers (Phase 90.3.19 — placeholder) ───────────
  "mcp_servers.title": "Servidores MCP",
  "mcp_servers.deferred.title": "Endpoints MCP pendientes",
  "mcp_servers.deferred.body": "Los servidores MCP se gestionan hoy via CLI / archivo de config; la API admin RPC para list/upsert/delete está pendiente:",
  "mcp_servers.deferred.followup": "Phase 90.x — admin/mcp/list + admin/mcp/upsert + admin/mcp/delete",

  // ── Memory (Phase 90.3.17 — placeholder) ─────────────────
  "memory.title": "Memoria",
  "memory.deferred.title": "Endpoints de memoria pendientes",
  "memory.deferred.body": "El admin RPC para query/snapshot de memoria del agente todavía no está expuesto. Mientras tanto, usa el CLI:",
  "memory.deferred.followup": "Phase 90.x — admin/memory/query + admin/memory/snapshot",

  // ── Plugins (Phase 90.3.18 — placeholder) ────────────────
  "plugins.title": "Plugins",
  "plugins.deferred.title": "Endpoint pendiente",
  "plugins.deferred.body": "El admin RPC para el doctor de plugins (lista, capabilities, status de spawn) aún no está expuesto. Mientras tanto, ejecuta el CLI:",
  "plugins.deferred.followup": "Phase 90.x — admin/plugins/list + admin/plugins/doctor",

  // ── Settings (Phase 90.3.20) ─────────────────────────────
  "settings.title": "Configuración",
  "settings.auth.title": "Token de operador",
  "settings.auth.subtitle": "Rota el bearer del admin RPC. Las sesiones activas se invalidan; los operadores deberán volver a iniciar sesión.",
  "settings.auth.action.rotate": "Rotar token",
  "settings.auth.rotating": "Rotando…",
  "settings.auth.rotate_confirm": "¿Rotar el token? Se cerrarán todas las sesiones activas.",
  "settings.auth.rotated": "Token rotado. Hash nuevo: {hash}",
  "settings.system.title": "Sistema",
  "settings.system.deferred_note": "La inspección de broker, capabilities y rutas activas llegará cuando los endpoints admin RPC correspondientes estén expuestos.",

  // ── LLM keys (Phase 90.3.15) ─────────────────────────────
  "llm_keys.title": "Llaves LLM",
  "llm_keys.action.new": "Crear nueva",
  "llm_keys.action.reload": "Actualizar",
  "llm_keys.row.rotate": "Rotar credencial",
  "llm_keys.row.delete": "Eliminar instancia",
  "llm_keys.row.tenant_scope.global": "global",
  "llm_keys.empty.body": "No hay proveedores configurados. Pulsa «Crear nueva» para añadir uno.",
  "llm_keys.delete.confirm": "¿Eliminar la instancia «{id}»? Los agentes que la referencien dejarán de funcionar.",

  // ── Skills (Phase 90.3.14) ───────────────────────────────
  "skills.title": "Skills",
  "skills.action.reload": "Actualizar",
  "skills.row.delete": "Eliminar skill",
  "skills.delete.confirm": "¿Eliminar la skill «{name}»? Esto borra el directorio del disco.",
  "skills.deleting": "Eliminando «{name}»…",
  "skills.empty.body": "No hay skills configuradas. Use la CLI o el contenido de extensión para añadirlas.",
  "skills.view.empty_title": "Skills",
  "skills.view.loading": "Cargando…",
  "skills.view.select_a_skill": "Selecciona una skill de la lista.",

  // ── Dashboard (Phase 90.3.13) ────────────────────────────
  "dashboard.title": "Panel",
  "dashboard.action.reload": "Actualizar",
  "dashboard.partial_outage": "Falla parcial:",
  "dashboard.metric.agents": "Agentes",
  "dashboard.metric.agents_hint": "Total de agentes configurados",
  "dashboard.metric.llm_providers": "Proveedores LLM",
  "dashboard.metric.llm_providers_hint": "Instancias en llm.yaml",
  "dashboard.metric.audit_recent": "Auditoría 24h",
  "dashboard.metric.audit_recent_hint": "Llamadas admin RPC últimas 24h",

  // ── Audit log (Phase 83.12.audit-page) ───────────────────
  "audit.title": "Registro de auditoría",
  "audit.filter.method": "Método",
  "audit.filter.method_placeholder": "Ej. nexo/admin/agents/upsert",
  "audit.filter.result": "Resultado",
  "audit.filter.result.all": "Todos",
  "audit.filter.result.ok": "OK",
  "audit.filter.result.error": "Error",
  "audit.filter.result.denied": "Denegado",
  "audit.filter.microapp": "Microapp",
  "audit.filter.microapp_placeholder": "Ej. agent-creator",
  "audit.filter.since": "Desde",
  "audit.filter.since.24h": "Últimas 24h",
  "audit.filter.since.7d": "Últimos 7 días",
  "audit.filter.since.30d": "Últimos 30 días",
  "audit.filter.reload": "Recargar",
  "audit.row.copy_hash": "Copiar hash",
  "audit.row.copied": "Copiado",
  "audit.empty.title": "Sin entradas",
  "audit.empty.body":
    "Las llamadas administrativas aparecerán aquí. Ajusta los filtros si esperabas ver actividad.",
  "audit.load_more": "Cargar más",
  "audit.load_more_count": "Mostrando {shown} de {total}",
  "audit.error.banner": "Error al cargar registro: {message}",
} as const satisfies Catalog;

export default es;
export type CatalogKey = keyof typeof es;
