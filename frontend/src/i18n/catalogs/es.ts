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
  "marketing.sidebar.title": "Marketing",
  "marketing.sidebar.subtitle": "{leads} leads · {unread} sin leer",
  "marketing.sidebar.search_placeholder":
    "Buscar cliente, asunto, dominio…",
  "marketing.sidebar.firehose_live": "Firehose live",
  "marketing.sidebar.firehose_lagged":
    "Firehose lagged — reconciling via REST",
  "marketing.sidebar.firehose_disconnected": "Firehose desconectado",
  "marketing.empty.title": "Bandeja de marketing",
  "marketing.empty.body":
    "Selecciona un lead de la lista para ver el hilo completo + la respuesta sugerida por la IA. Las decisiones de routing y enrichment quedan en la línea de tiempo del panel derecho.",
  "marketing.stat.leads": "Leads",
  "marketing.stat.drafts_pending": "Drafts pendientes",
  "marketing.stat.followups_today": "Followups hoy",
  "marketing.health.live":
    "Live · {leads} leads · {mailboxes} mailboxes vigiladas",
  "marketing.health.error": "Extension marketing no disponible",
  "marketing.health.loading": "Cargando…",

  // Wizard
  "marketing.wizard.welcome.title": "Configurar Marketing",
  "marketing.wizard.welcome.body":
    "Para empezar a recibir leads necesitamos dos cosas: un mailbox que escuche el correo entrante y un seller con credenciales SMTP para responder. Toma menos de un minuto. Puedes editar los valores después en Settings.",
  "marketing.wizard.step.welcome": "Bienvenida",
  "marketing.wizard.step.mailbox": "Mailbox",
  "marketing.wizard.step.seller": "Seller",
  "marketing.wizard.step.done": "Listo",
  "marketing.wizard.mailbox.title": "Mailbox principal",
  "marketing.wizard.mailbox.body":
    "Conectaremos tu correo entrante para leer los leads que llegan. Si usas Gmail, Outlook, Zoho o un proveedor común, completaremos los datos automáticamente al escribir tu email.",
  "marketing.wizard.seller.title": "Primer seller",
  "marketing.wizard.seller.body":
    'Cada seller tiene sus propias credenciales SMTP — los drafts se envían desde su mailbox, no desde una cuenta "IA". Si lo dejas vacío, la firma se genera como —\\n{nombre}.',
  "marketing.wizard.done.title": "¡Listo!",
  "marketing.wizard.done.body":
    "Marketing está escuchando. Cuando llegue el primer email, verás un draft pendiente de aprobar en /m/marketing/drafts. Puedes editar mailboxes + sellers en cualquier momento desde Settings.",
  "marketing.wizard.see_inbox": "Ver inbox",
  "marketing.wizard.save_mailbox": "Guardar y continuar",
  "marketing.wizard.save_seller": "Guardar y terminar",

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
  "marketing.enrichment.header_prefix": "Enriquecimiento inferido · {source}",
  "marketing.enrichment.source.none": "sin enriquecer",
  "marketing.enrichment.source.signature_parsed": "firma del email",
  "marketing.enrichment.source.llm_extracted": "extracción IA",
  "marketing.enrichment.source.cross_linked": "hilo cruzado",
  "marketing.enrichment.source.api_enriched": "Apollo / Hunter",
  "marketing.enrichment.source.manual": "manual",
  "marketing.enrichment.source.personal_only_giveup":
    "email personal · sin empresa",
  "marketing.enrichment.no_company": "(sin empresa)",
  "marketing.enrichment.label_person": "Persona: ",
  "marketing.enrichment.label_company": "Empresa: ",
  "marketing.enrichment.field_person_name": "Nombre de la persona",
  "marketing.enrichment.field_company_name": "Nombre de la empresa",
  "marketing.enrichment.company_placeholder":
    "Acme Corp (vacío para no asignar empresa)",
  "marketing.enrichment.confirming": "Confirmando…",
  "marketing.enrichment.confirm": "Confirmar",
  "marketing.enrichment.discard": "Descartar",
  "marketing.enrichment.saving": "Guardando…",
  "marketing.enrichment.save_and_confirm": "Guardar y confirmar",

  // ── Marketing · followup profile editor ──────────────────
  "marketing.followup_profile.id": "ID",
  "marketing.followup_profile.max_attempts": "Max attempts",
  "marketing.followup_profile.stop_on_reply":
    "Detener cadena cuando el cliente responde",
  "marketing.followup_profile.cadence": "Cadencia",
  "marketing.followup_profile.no_intervals":
    "Sin intervalos — agrega al menos uno.",
  "marketing.followup_profile.unit_hours": "horas",
  "marketing.followup_profile.unit_days": "días",
  "marketing.followup_profile.add_interval": "Añadir intervalo",
  "marketing.followup_profile.delete_profile": "Eliminar profile",
  "marketing.followup_profile.timeline_preview": "Timeline preview",
  "marketing.followup_profile.day_zero": "Día 0 → primer envío",
  "marketing.followup_profile.day_label": "Día +{days}",
  "marketing.followup_profile.hour_label": "Hora +{hours}",
  "marketing.followup_profile.followup_step": "followup #{step}",

  // ── Marketing · JSON editor modal ────────────────────────
  "marketing.json_editor.json_invalid": "JSON inválido: {error}",
  "marketing.json_editor.server_rejected": "Servidor rechazó: {error}",
  "marketing.json_editor.saved": "Guardado.",
  "marketing.json_editor.banner_persists":
    "Banner permanece arriba — reinicio recomendado.",
  "marketing.json_editor.closing": "Cerrando…",
  "marketing.json_editor.aria_label": "JSON editor",

  // ── Marketing · timeline ─────────────────────────────────
  "marketing.timeline.loading": "Cargando timeline…",
  "marketing.timeline.unavailable": "Timeline no disponible · {error}",
  "marketing.timeline.empty": "Sin eventos auditados todavía.",
  "marketing.timeline.lead_created": "Lead creado",
  "marketing.timeline.lead_created_detail": "{from} · seller {seller}",
  "marketing.timeline.routed_score": "Ruteado · score {score}",
  "marketing.timeline.no_route_score": "Sin ruta · score {score}",
  "marketing.timeline.transitioned": "Transición · {from} → {to}",
  "marketing.timeline.notification": "Notificación · {kind}",
  "marketing.timeline.notification_detail": "seller {seller} · canal {channel}",
  "marketing.timeline.guardrail": "Guardrail · {rule}",
  "marketing.timeline.guardrail_action_block": "bloqueado",
  "marketing.timeline.guardrail_action_force_approval": "force-approval",
  "marketing.timeline.guardrail_detail": "{action} · {excerpt}",
  "marketing.timeline.duplicate": "Duplicado posible · {id}",
  "marketing.timeline.duplicate_detail": "signal {signal} · {percent}%",
  "marketing.timeline.thread_bumped": "Hilo actualizado",
  "marketing.timeline.followup_skipped": "Followup · skipped",
  "marketing.timeline.followup_postponed": "Followup · pospuesto a {when}",
  "marketing.timeline.followup_postponed_unknown": "Followup · pospuesto a —",

  // ── Marketing · mailbox form ─────────────────────────────
  "marketing.mailbox_form.id": "ID",
  "marketing.mailbox_form.address": "Address",
  "marketing.mailbox_form.address_placeholder": "ventas@empresa.com",
  "marketing.mailbox_form.email_plugin_instance": "Email plugin instance",
  "marketing.mailbox_form.email_plugin_placeholder": "default",
  "marketing.mailbox_form.email_plugin_hint":
    "Conexión IMAP. El plugin de email gestiona host / port / credenciales bajo la instancia indicada. OAuth (Gmail / Outlook) no soportado en v1 — usa IMAP con app-password.",
  "marketing.mailbox_form.inbound_polling": "Inbound polling",
  "marketing.mailbox_form.mode_idle": "IDLE (push, recommended)",
  "marketing.mailbox_form.mode_adaptive": "Adaptive (IDLE + poll)",
  "marketing.mailbox_form.mode_poll": "Poll only",
  "marketing.mailbox_form.poll_interval": "Poll interval (s)",
  "marketing.mailbox_form.active": "Mailbox activa",
  "marketing.mailbox_form.draft_mode": "Draft + approve (manual)",
  "marketing.mailbox_form.hours_enabled": "Ventana de polling activa",
  "marketing.mailbox_form.timezone_label": "Timezone (IANA)",
  "marketing.mailbox_form.timezone_placeholder": "America/Bogota",
  "marketing.mailbox_form.off_hours_poll": "Off-hours poll (s)",
  "marketing.mailbox_form.day_mon_fri": "Lun-Vie",
  "marketing.mailbox_form.day_saturday": "Sábado",
  "marketing.mailbox_form.day_sunday": "Domingo",
  "marketing.mailbox_form.hours_invalid":
    "Activa al menos un día y verifica que cada start < end (HH:MM).",
  "marketing.mailbox_form.delete": "Eliminar mailbox",

  // ── Marketing · routing rule editor ──────────────────────
  "marketing.routing_rule.id": "ID",
  "marketing.routing_rule.name": "Nombre",
  "marketing.routing_rule.active": "Regla activa",
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
  "marketing.routing_rule.placeholder.body": "palabra clave",
  "marketing.routing_rule.placeholder.subject": "cotización",
  "marketing.routing_rule.assign_seller": "Seller",
  "marketing.routing_rule.assign_round_robin": "Round-robin pool",
  "marketing.routing_rule.assign_drop": "Drop",
  "marketing.routing_rule.placeholder.seller_id": "seller-id",
  "marketing.routing_rule.placeholder.pool": "seller-1, seller-2, seller-3",
  "marketing.routing_rule.drop_silent": "Inbound silencioso · sin lead",
  "marketing.routing_rule.conditions_title":
    "Conditions (AND — todas deben matchear)",
  "marketing.routing_rule.no_conditions":
    "Sin condiciones — la regla matchea cualquier inbound.",
  "marketing.routing_rule.add_condition": "Añadir condición",
  "marketing.routing_rule.assigns_to": "Assigns to",
  "marketing.routing_rule.delete": "Eliminar regla",

  // ── Marketing · seller form ──────────────────────────────
  "marketing.seller_form.title_edit": "Editar seller · {id}",
  "marketing.seller_form.title_new": "Nuevo seller",
  "marketing.seller_form.id_label": "ID",
  "marketing.seller_form.id_hint":
    "Inmutable. Kebab-case sugerido (pedro-garcia).",
  "marketing.seller_form.name_label": "Nombre",
  "marketing.seller_form.primary_email_label": "Email primario",
  "marketing.seller_form.primary_email_hint":
    "La IA enviará desde este email.",
  "marketing.seller_form.alt_emails_label": "Alt emails",
  "marketing.seller_form.alt_emails_hint":
    "Cross-thread linker reconoce mensajes desde estos para esta misma persona. Enter / coma para agregar.",
  "marketing.seller_form.alt_emails_placeholder": "another@acme.com",
  "marketing.seller_form.signature_label": "Firma",
  "marketing.seller_form.signature_hint":
    "Texto plano. La IA respeta esta firma exactamente.",
  "marketing.seller_form.draft_template_label": "Plantilla de draft (override)",
  "marketing.seller_form.draft_template_hint":
    "Handlebars. Vacío = hereda la plantilla del tenant. Variables disponibles: {{person.name}}, {{seller.name}}, {{seller.signature_text}}, {{lead.subject}}, {{last_inbound.body}}, {{operator_hint}}.",
  "marketing.seller_form.draft_template_placeholder":
    "Hola {{person.name}}, soy {{seller.name}}…",
  "marketing.seller_form.draft_template_empty":
    "Sin override — usa la plantilla del tenant.",
  "marketing.seller_form.smtp_section": "SMTP outbound",
  "marketing.seller_form.smtp_instance_label": "Instance",
  "marketing.seller_form.smtp_instance_hint":
    "Suffix del topic plugin.outbound.email.<instance>. Convención: <tenant>-<seller_id>.",
  "marketing.seller_form.smtp_instance_placeholder": "acme-pedro",
  "marketing.seller_form.smtp_host_label": "Host",
  "marketing.seller_form.smtp_host_hint": "SMTP server hostname",
  "marketing.seller_form.smtp_host_placeholder": "smtp.gmail.com",
  "marketing.seller_form.smtp_port_label": "Port",
  "marketing.seller_form.smtp_port_hint": "587 STARTTLS · 465 TLS",
  "marketing.seller_form.smtp_starttls_label": "STARTTLS",
  "marketing.seller_form.smtp_starttls_hint": "Recomendado",
  "marketing.seller_form.smtp_starttls_enabled": "enabled",
  "marketing.seller_form.smtp_username_label": "Username",
  "marketing.seller_form.smtp_username_hint": "Suele ser el mismo email",
  "marketing.seller_form.smtp_username_placeholder": "pedro@acme.com",
  "marketing.seller_form.smtp_password_env_label": "Password env var",
  "marketing.seller_form.smtp_password_env_hint":
    "Nombre de la env var (ej: MARKETING_SMTP_PEDRO_PASS). El operador la setea en systemd / docker; el YAML solo guarda el NOMBRE, nunca el valor.",
  "marketing.seller_form.smtp_password_env_placeholder":
    "MARKETING_SMTP_PEDRO_PASS",
  "marketing.seller_form.hours_section": "Horario laboral",
  "marketing.seller_form.timezone_label": "Timezone",
  "marketing.seller_form.timezone_hint":
    "IANA (e.g. America/Bogota, America/Mexico_City, Europe/Madrid).",
  "marketing.seller_form.day_mon_fri": "Lun–Vie",
  "marketing.seller_form.day_saturday": "Sábado",
  "marketing.seller_form.day_sunday": "Domingo",
  "marketing.seller_form.vacation_label": "Seller en vacaciones",
  "marketing.seller_form.vacation_until": "Fin de vacaciones (opcional)",
  "marketing.seller_form.vacation_clear": "Limpiar",
  "marketing.seller_form.vacation_indefinite": "Sin fecha = vacaciones indefinidas",
  "marketing.seller_form.agent_label": "Agente IA",
  "marketing.seller_form.agent_hint":
    "Reusa el modelo + system prompt + WhatsApp del agente. Sin agente = manual outbound.",
  "marketing.seller_form.agent_loading": "Cargando agentes…",
  "marketing.seller_form.agent_error": "Error: {error}",
  "marketing.seller_form.agent_none": "— Sin agente (manual) —",
  "marketing.seller_form.agent_option":
    "{id} · {provider} · {count} canal{plural}",
  "marketing.seller_form.agent_inactive_suffix": " (inactivo)",
  "marketing.seller_form.agent_default_model": "Modelo por defecto del agente: ",
  "marketing.seller_form.override_label": "Modelo para emails",
  "marketing.seller_form.override_hint":
    "Por defecto se usa el modelo del agente. Cambia aquí solo si quieres uno distinto (ej. más barato) cuando este seller responde correos.",
  "marketing.seller_form.override_provider_placeholder":
    "provider (ej. anthropic)",
  "marketing.seller_form.override_model_placeholder":
    "model (ej. claude-opus-4-7)",
  "marketing.seller_form.override_use_agent_default":
    "Usar el del agente · {model}",
  "marketing.seller_form.override_no_override":
    "Usar el del agente",
  "marketing.seller_form.override_agent_marker": "(predeterminado)",
  "marketing.seller_form.notify_section":
    "Notificaciones a operador",
  "marketing.seller_form.notify_events": "Eventos",
  "marketing.seller_form.notify_lead_created": "Nuevo lead",
  "marketing.seller_form.notify_lead_replied": "Cliente respondió",
  "marketing.seller_form.notify_lead_transitioned": "Transición de estado",
  "marketing.seller_form.notify_draft_pending": "Draft pendiente",
  "marketing.seller_form.notify_meeting_intent": "Intent de reunión",
  "marketing.seller_form.notify_channel_label": "Canal",
  "marketing.seller_form.notify_channel_hint":
    "WhatsApp usa el binding del agente; email envía vía el plugin email del framework; disabled deja sólo log.",
  "marketing.seller_form.notify_channel_whatsapp":
    "WhatsApp (canal del agente)",
  "marketing.seller_form.notify_channel_email":
    "Email (a otra dirección)",
  "marketing.seller_form.notify_channel_disabled":
    "Disabled (publicar sin forward)",
  "marketing.seller_form.notify_from_instance_label":
    "From instance (email plugin)",
  "marketing.seller_form.notify_from_instance_hint":
    "ID de la mailbox del framework email plugin que envía vía SMTP. Típicamente coincide con un mailbox configurado en /m/marketing/settings/mailboxes.",
  "marketing.seller_form.notify_from_instance_placeholder": "ventas-acme",
  "marketing.seller_form.notify_email_to_label": "Destinatario email",
  "marketing.seller_form.notify_email_to_placeholder": "ops@acme.com",
  "marketing.seller_form.notify_whatsapp_warning_prefix": "⚠ El agente ",
  "marketing.seller_form.notify_whatsapp_warning_suffix":
    " no tiene un binding de WhatsApp — el forwarder skipping silenciosa. Pareálo via \"Reemparejar\" en /agents o cambia el canal a email / disabled.",
  "marketing.seller_form.notify_no_agent_warning":
    "⚠ Las notificaciones requieren un agente vinculado. Pick uno arriba o desactiva las notificaciones.",
  "marketing.seller_form.saving": "Guardando…",
  "marketing.seller_form.save_changes": "Guardar cambios",
  "marketing.seller_form.create": "Crear seller",
  "marketing.seller_form.aria_remove_chip": "Remove {value}",
  "marketing.seller_form.error_id_required": "id es obligatorio.",
  "marketing.seller_form.error_name_required": "name es obligatorio.",
  "marketing.seller_form.error_email_invalid":
    "primary_email debe ser un email válido.",
  "marketing.seller_form.error_override_partial":
    "model_override requiere provider Y model — pon ambos o deja ambos vacíos.",
  "marketing.seller_form.error_alt_email_invalid":
    "alt_emails entry \"{email}\" is not a valid email.",
  "marketing.seller_form.error_timezone_required":
    "Working hours requiere un IANA timezone (e.g. America/Bogota).",
  "marketing.seller_form.error_window_format":
    "{label}: start/end must be HH:MM (got \"{start}\" / \"{end}\").",
  "marketing.seller_form.error_window_order":
    "{label}: start ({start}) must be before end ({end}).",
  "marketing.seller_form.error_notify_email_to":
    "Notificación por email requiere un destinatario válido.",
  "marketing.seller_form.error_notify_email_from":
    "Notificación por email requiere un 'from instance' (mailbox id del email plugin).",
  "marketing.seller_form.error_notify_agent_loading":
    "Notificación WhatsApp requiere que el agente esté cargado primero — espera a que el dropdown termine de hidratarse.",
  "marketing.seller_form.error_notify_no_whatsapp":
    "El agente {agent} no tiene un binding WhatsApp con instance resuelto. Pareálo via \"Reemparejar\" en /agents primero, o cambia el canal a Email / Disabled.",
  "marketing.seller_form.error_smtp_port":
    "SMTP port debe ser un entero 1..65535.",
  "marketing.seller_form.error_smtp_instance":
    "SMTP instance es obligatorio (ej: \"acme-pedro\"). Sirve como suffix del topic plugin.outbound.email.<instance>.",
  "marketing.seller_form.error_smtp_host": "SMTP host obligatorio.",
  "marketing.seller_form.error_smtp_username": "SMTP username obligatorio.",
  "marketing.seller_form.error_smtp_password_env":
    "SMTP password_env obligatorio — nombre de la env var con la password / app-password / OAuth token. La password NO va en el YAML.",

  // ── Marketing · template editor ──────────────────────────
  "marketing.template_editor.id": "ID",
  "marketing.template_editor.name": "Nombre",
  "marketing.template_editor.description": "Descripción (opcional)",
  "marketing.template_editor.description_placeholder":
    "Cuándo usar esta plantilla",
  "marketing.template_editor.body": "Body (mustache-lite — {example}, etc.)",
  "marketing.template_editor.delete": "Eliminar",

  // ── Marketing · snippet editor ───────────────────────────
  "marketing.snippet_editor.id": "ID",
  "marketing.snippet_editor.shortcut": "Shortcut (opcional)",
  "marketing.snippet_editor.shortcut_placeholder": "/saludo",
  "marketing.snippet_editor.name": "Nombre",
  "marketing.snippet_editor.body": "Body (mustache-lite — {example}, etc.)",
  "marketing.snippet_editor.delete": "Eliminar",

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
  "marketing.notification_template.saved": "✓ Guardado",
  "marketing.notification_template.saved_with_note": "✓ Guardado · {note}",
  "marketing.notification_template.saving": "Guardando…",
  "marketing.notification_template.save_button": "Guardar templates",

  // ── Marketing · drafts inbox ─────────────────────────────
  "marketing.drafts_inbox.title": "Drafts pendientes",
  "marketing.drafts_inbox.loading": "Cargando…",
  "marketing.drafts_inbox.empty_short": "Inbox limpio",
  "marketing.drafts_inbox.count_singular":
    "{count} aprobacion esperando",
  "marketing.drafts_inbox.count_plural":
    "{count} aprobaciones esperando",
  "marketing.drafts_inbox.refresh": "Refrescar",
  "marketing.drafts_inbox.unavailable": "Inbox no disponible · {error}",
  "marketing.drafts_inbox.bulk_ok": "{count} OK",
  "marketing.drafts_inbox.bulk_failed": "{count} fallaron",
  "marketing.drafts_inbox.empty_done":
    "🎉 Sin drafts pendientes. Toda la cola fue procesada.",
  "marketing.drafts_inbox.filter_seller": "Seller",
  "marketing.drafts_inbox.filter_state": "Estado",
  "marketing.drafts_inbox.visible_count": "{visible} de {total} visibles",
  "marketing.drafts_inbox.confirm_bulk_approve":
    "Confirmar envío de {count} drafts? Cada uno disparará un email outbound.",
  "marketing.drafts_inbox.selection_empty": "Selección vacía",
  "marketing.drafts_inbox.selection_singular": "{count} seleccionado",
  "marketing.drafts_inbox.selection_plural": "{count} seleccionados",
  "marketing.drafts_inbox.bulk_approve_busy": "Enviando {count}…",
  "marketing.drafts_inbox.bulk_approve_label": "Aprobar ({count})",
  "marketing.drafts_inbox.bulk_reject_label": "Descartar ({count})",
  "marketing.drafts_inbox.no_match": "Ningún draft coincide con el filtro activo.",
  "marketing.drafts_inbox.row_sending": "Enviando…",
  "marketing.drafts_inbox.row_approve": "Aprobar",
  "marketing.drafts_inbox.row_discarding": "Descartando…",
  "marketing.drafts_inbox.row_discard": "Descartar",
  "marketing.drafts_inbox.row_go_to_lead": "Ir al lead",

  // ── Marketing · health view ──────────────────────────────
  "marketing.health.title": "Marketing health",
  "marketing.health.subtitle": "Snapshot agregado · auto-refresh cada 30 s",
  "marketing.health.window_label": "Ventana",
  "marketing.health.refresh": "Refrescar",
  "marketing.health.unavailable": "Telemetría no disponible · {error}",
  "marketing.health.loading_snapshot": "Cargando snapshot…",
  "marketing.health.state.cold": "Cold",
  "marketing.health.state.engaged": "Engaged",
  "marketing.health.state.meeting_scheduled": "Meeting",
  "marketing.health.state.qualified": "Qualified",
  "marketing.health.state.lost": "Lost",
  "marketing.health.headline.drafts_pending": "Drafts pendientes",
  "marketing.health.headline.drafts_pending_hint": "Aprobación manual",
  "marketing.health.headline.inbound": "Inbound",
  "marketing.health.headline.outbound": "Outbound",
  "marketing.health.headline.last_window_hours": "Últimas {hours}h",
  "marketing.health.tenant_footer":
    "tenant {tenant} · ventana desde {since}",

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
  "marketing.settings.tab.spam_filter": "Filtros",
  "marketing.settings.tab.scoring": "Scoring",
  "marketing.settings.tab.state": "Estado",

  // ── Marketing on/off (kill switch) ───────────────────────
  "marketing.state.title": "Estado del marketing",
  "marketing.state.subtitle":
    "Pausa todos los efectos automáticos (drafts IA, notificaciones, follow-ups). Los emails siguen ingresando como leads para que tu inbox no pierda nada — sólo los efectos automatizados se detienen.",
  "marketing.state.toggle_enabled": "Marketing activo",
  "marketing.state.toggle_disabled": "Marketing pausado",
  "marketing.state.reason_label":
    "Razón de la pausa (opcional, visible para el equipo)",
  "marketing.state.reason_placeholder":
    "ej: probando reglas de routing, ajustando prompt del agente",
  "marketing.state.save_button": "Guardar",
  "marketing.state.save_ok": "Estado guardado",
  "marketing.state.save_failed": "No se pudo guardar: {message}",
  "marketing.state.banner.paused":
    "⏸ Marketing pausado{reason} — recuerda reactivar cuando termines",
  "marketing.state.banner.paused_reason_prefix": " · ",
  "marketing.state.banner.resume": "Reanudar",

  // ── Scoring config ───────────────────────────────────────
  "marketing.scoring.title": "Scoring de leads",
  "marketing.scoring.subtitle":
    "Pesos y palabras clave que el sistema usa para priorizar leads. Sube los positivos para empujar leads importantes; baja los negativos si descartas demasiado por error.",
  "marketing.scoring.weight.corporate_domain": "Boost por dominio corporativo",
  "marketing.scoring.weight.personal_domain": "Penalización por dominio personal (gmail, hotmail…)",
  "marketing.scoring.weight.substantive_min": "Mínimo de palabras para considerar el cuerpo \"sustancial\"",
  "marketing.scoring.weight.substantive_boost": "Boost cuando el cuerpo es sustancial",
  "marketing.scoring.weight.brief_max": "Máximo de palabras para considerar el cuerpo \"breve\" (auto-reply)",
  "marketing.scoring.weight.brief_penalty": "Penalización cuando el cuerpo es breve",
  "marketing.scoring.weight.purchase_intent": "Boost por intención de compra detectada",
  "marketing.scoring.weight.senior_signature": "Boost por rol senior en el display name",
  "marketing.scoring.keywords.purchase": "Palabras clave de intención de compra",
  "marketing.scoring.keywords.purchase_hint":
    "Una palabra o frase por línea. Match case-insensitive sobre subject + cuerpo.",
  "marketing.scoring.keywords.senior": "Tokens de rol senior",
  "marketing.scoring.keywords.senior_hint":
    "Un token por línea. Match case-insensitive sobre el display name del remitente.",
  "marketing.scoring.save_button": "Guardar",
  "marketing.scoring.reset_button": "Restablecer defaults",
  "marketing.scoring.save_ok": "Scoring guardado",
  "marketing.scoring.save_failed": "No se pudo guardar: {message}",
  "marketing.scoring.reset_confirm":
    "¿Restablecer scoring a los valores por defecto? Tu configuración personalizada se perderá.",

  // ── Compose (operator-initiated outbound) ───────────────
  "marketing.compose.button": "Nuevo email",
  "marketing.compose.title": "Nuevo email",
  "marketing.compose.subtitle":
    "Inicia una conversación con un cliente. El email se envía con pixel de seguimiento + links rastreados (configurable).",
  "marketing.compose.field.to_email": "Para (email)",
  "marketing.compose.field.to_email_placeholder": "alguien@ejemplo.com",
  "marketing.compose.field.to_name": "Nombre (opcional)",
  "marketing.compose.field.to_name_placeholder": "Juan Pérez",
  "marketing.compose.field.seller": "Enviar como",
  "marketing.compose.field.subject": "Asunto",
  "marketing.compose.field.subject_placeholder": "Conoce nuestra plataforma",
  "marketing.compose.field.body": "Mensaje",
  "marketing.compose.field.body_placeholder":
    "Escribe el cuerpo del email. La firma del seller se anexa automáticamente.",
  "marketing.compose.field.with_tracking": "Incluir pixel + links rastreados",
  "marketing.compose.send_button": "Enviar",
  "marketing.compose.cancel_button": "Cancelar",
  "marketing.compose.sending": "Enviando…",
  "marketing.compose.success": "Email enviado · lead creado",
  "marketing.compose.failed": "No se pudo enviar: {message}",
  "marketing.compose.no_sellers":
    "No hay sellers configurados. Agrega uno desde Settings → Sellers antes de componer.",
  "marketing.compose.field.template": "Plantilla",
  "marketing.compose.template_none": "Sin plantilla",
  "marketing.compose.template_loading": "Cargando plantilla…",
  "marketing.compose.mode_hint":
    "¿Necesitas layout rico? Usá el constructor visual por bloques.",
  "marketing.compose.open_builder": "Abrir constructor",
  "marketing.compose.open_quick": "Modo rápido",
  "marketing.compose.to_email": "Para (email)",
  "marketing.compose.to_name": "Nombre (opcional)",
  "marketing.compose.to_name_placeholder": "Juana Pérez",
  "marketing.compose.subject": "Asunto",
  "marketing.compose.seller": "Enviar como",
  "marketing.compose.with_tracking": "Incluir pixel de tracking + links reescritos",
  "marketing.compose.send": "Enviar",
  "marketing.compose.cancel": "Cancelar",
  "marketing.compose.builder.load_template": "Cargar plantilla",
  "marketing.compose.builder.blank": "Lienzo en blanco",
  "marketing.compose.builder.fill_required":
    "Completá Para / Asunto / Vendedor para enviar",

  // ── Email templates (block-based builder) ────────────────
  "marketing.settings.tab.email_templates": "Plantillas de email",
  "marketing.email_templates.title": "Plantillas de email",
  "marketing.email_templates.subtitle":
    "Diseña plantillas reutilizables por bloques. Aplícalas al componer un email para arrancar con la estructura ya armada.",
  "marketing.email_templates.new_button": "Nueva plantilla",
  "marketing.email_templates.empty":
    "Aún no hay plantillas. Crea la primera con el botón de arriba.",
  "marketing.email_templates.list.name": "Nombre",
  "marketing.email_templates.list.updated": "Actualizada",
  "marketing.email_templates.list.actions": "Acciones",
  "marketing.email_templates.action.edit": "Editar",
  "marketing.email_templates.action.delete": "Eliminar",
  "marketing.email_templates.delete_confirm":
    "¿Eliminar la plantilla \"{name}\"? Esta acción no se puede deshacer.",
  "marketing.email_templates.field.name": "Nombre",
  "marketing.email_templates.field.name_placeholder": "ej: Bienvenida — onboarding",

  // Editor pane
  "marketing.email_templates.editor.library": "Bloques",
  "marketing.email_templates.editor.canvas": "Diseño",
  "marketing.email_templates.editor.properties": "Propiedades",
  "marketing.email_templates.editor.preview": "Vista previa",
  "marketing.email_templates.editor.preview_desktop": "Desktop",
  "marketing.email_templates.editor.preview_mobile": "Mobile",
  "marketing.email_templates.editor.two_column_help":
    "Cada columna acepta los mismos bloques que el canvas principal, excepto otro bloque de dos columnas.",
  "marketing.email_templates.editor.column_left": "Columna izquierda",
  "marketing.email_templates.editor.column_right": "Columna derecha",
  "marketing.email_templates.editor.column_empty": "Columna vacía",
  "marketing.email_templates.editor.edit_inner_block": "Editar bloque",
  "marketing.email_templates.editor.done": "Listo",
  "marketing.email_templates.editor.empty_canvas":
    "Agrega bloques desde la izquierda para empezar.",
  "marketing.email_templates.editor.no_selection":
    "Selecciona un bloque del diseño para editar sus propiedades.",
  "marketing.email_templates.editor.move_up": "Subir",
  "marketing.email_templates.editor.move_down": "Bajar",
  "marketing.email_templates.editor.delete": "Eliminar bloque",
  "marketing.email_templates.editor.edit": "Editar",
  "marketing.email_templates.editor.save": "Guardar",
  "marketing.email_templates.editor.cancel": "Cancelar",
  "marketing.email_templates.editor.save_ok": "Plantilla guardada",
  "marketing.email_templates.editor.save_failed":
    "No se pudo guardar: {message}",

  // Block library labels
  "marketing.email_templates.block.heading": "Encabezado",
  "marketing.email_templates.block.paragraph": "Párrafo",
  "marketing.email_templates.block.button": "Botón",
  "marketing.email_templates.block.image": "Imagen",
  "marketing.email_templates.block.divider": "Separador",
  "marketing.email_templates.block.spacer": "Espacio",
  "marketing.email_templates.block.two_column": "Dos columnas",
  "marketing.email_templates.block.row": "Fila",
  "marketing.email_templates.block.list": "Lista",
  "marketing.email_templates.row.help":
    "Elegí un layout y dropeá elementos en cada columna. Ajustá el % de ancho para afinar.",
  "marketing.email_templates.row.layout": "Layout",
  "marketing.email_templates.row.column_n": "Columna {n}",
  "marketing.email_templates.row.confirm_trim":
    "Este layout tiene menos columnas. Se perderá el contenido de las columnas eliminadas. ¿Continuar?",
  "marketing.email_templates.row.background": "Fondo de la fila",
  "marketing.email_templates.row.background_image": "Imagen de fondo de la fila",
  "marketing.email_templates.field.page_background": "Página",
  "marketing.email_templates.field.page_background_image_placeholder":
    "URL imagen de fondo (https://…)",
  "marketing.email_templates.row.column_background": "Fondo de la columna",
  "marketing.email_templates.row.column_background_image": "Imagen:",
  "marketing.email_templates.row.clear_background": "Quitar",
  "marketing.email_templates.picker.title": "Agregar elemento",
  "marketing.email_templates.picker.subtitle":
    "Elegí un tipo de bloque. El elemento se agrega a la columna donde estabas editando.",
  "marketing.email_templates.canvas.add_row": "+ Agregar fila",
  "marketing.email_templates.canvas.empty":
    "Canvas vacío. Click en '+ Agregar fila' para empezar.",
  "marketing.email_templates.canvas.col_empty": "columna vacía",

  // Block property labels
  "marketing.email_templates.prop.text": "Texto",
  "marketing.email_templates.prop.color": "Color",
  "marketing.email_templates.prop.bg_color": "Color de fondo",
  "marketing.email_templates.prop.text_color": "Color del texto",
  "marketing.email_templates.prop.align": "Alineación",
  "marketing.email_templates.prop.align.left": "Izquierda",
  "marketing.email_templates.prop.align.center": "Centro",
  "marketing.email_templates.prop.align.right": "Derecha",
  "marketing.email_templates.prop.font_size": "Tamaño de fuente (px)",
  "marketing.email_templates.prop.level": "Nivel (1=grande, 3=pequeño)",
  "marketing.email_templates.prop.url": "URL",
  "marketing.email_templates.prop.image_url": "URL de la imagen",
  "marketing.email_templates.prop.alt": "Texto alternativo",
  "marketing.email_templates.prop.width": "Ancho (px, vacío = 100%)",
  "marketing.email_templates.prop.link_url": "URL del enlace (opcional)",
  "marketing.email_templates.prop.height": "Altura (px)",
  "marketing.email_templates.prop.items": "Elementos (uno por línea)",
  "marketing.email_templates.prop.ordered": "Lista numerada",
  "marketing.email_templates.upload.button": "Elegir imagen",
  "marketing.email_templates.upload.replace": "Cambiar imagen",
  "marketing.email_templates.upload.optimized": "Optimizada: {saved}",
  "marketing.email_templates.upload.failed": "Error al subir: {error}",
  "marketing.media.title": "Biblioteca de medios",
  "marketing.media.search_placeholder": "Filtrar (prefijo sha o mime)",
  "marketing.media.upload": "Subir nueva",
  "marketing.media.uploading": "Subiendo…",
  "marketing.media.empty":
    "Biblioteca vacía. Subí la primera imagen con el tile de arriba.",
  "marketing.media.no_match": "Ningún asset coincide con el filtro.",
  "marketing.media.loading": "Cargando…",
  "marketing.media.confirm_delete":
    "¿Eliminar este asset? Las plantillas que lo usan perderán la imagen.",
  "marketing.media.selected": "Seleccionada · {size}",
  "marketing.media.no_selection": "Elegí un asset o subí uno nuevo",
  "marketing.media.cancel": "Cancelar",
  "marketing.media.use": "Usar selección",
  "marketing.attachments.label": "Adjuntos",
  "marketing.attachments.none": "Sin adjuntos",
  "marketing.attachments.add": "Adjuntar archivo",
  "marketing.attachments.library_title": "Biblioteca de adjuntos",
  "marketing.attachments.search_placeholder": "Filtrar por nombre o tipo",
  "marketing.attachments.upload": "Subir nuevo",
  "marketing.attachments.uploading": "Subiendo…",
  "marketing.attachments.empty":
    "Sin adjuntos. Subí el primer archivo con el botón de arriba.",
  "marketing.attachments.no_match": "Ningún adjunto coincide con el filtro.",
  "marketing.attachments.loading": "Cargando…",
  "marketing.attachments.confirm_delete":
    "¿Eliminar este adjunto? Borradores y plantillas que lo usen no podrán enviarse.",
  "marketing.attachments.selected_zero": "Nada seleccionado",
  "marketing.attachments.selected_count": "{count} seleccionados",
  "marketing.attachments.cancel": "Cancelar",
  "marketing.attachments.use_zero": "Usar selección",
  "marketing.attachments.use_count": "Adjuntar {count}",
  "marketing.compose.save_draft": "Guardar borrador",
  "marketing.compose.draft_saved": "Guardado · {at}",
  "marketing.sent.title": "Enviados",
  "marketing.sent.subtitle": "Todo lo que este tenant publicó. Click en una fila para abrir el lead.",
  "marketing.sent.filter.seller": "Vendedor",
  "marketing.sent.filter.all_sellers": "Todos los vendedores",
  "marketing.sent.filter.from_date": "Desde",
  "marketing.sent.filter.to_date": "Hasta",
  "marketing.sent.filter.search": "Buscar",
  "marketing.sent.filter.search_placeholder": "asunto o cuerpo…",
  "marketing.sent.col.date": "Enviado",
  "marketing.sent.col.recipient": "Destinatario",
  "marketing.sent.col.subject": "Asunto",
  "marketing.sent.col.seller": "Vendedor",
  "marketing.sent.loading": "Cargando…",
  "marketing.sent.empty": "No hay envíos aún.",
  "marketing.sent.no_match": "Ningún email coincide con los filtros.",
  "marketing.sent.range": "{start}–{end} de {total}",
  "marketing.sent.prev": "Anterior",
  "marketing.sent.next": "Siguiente",
  "marketing.saved_drafts.title": "Borradores guardados",
  "marketing.saved_drafts.subtitle": "Outbounds que empezaste a escribir y querés terminar después. Distintos a los borradores AI de leads inbound.",
  "marketing.saved_drafts.loading": "Cargando…",
  "marketing.saved_drafts.empty": "Sin borradores. Usá 'Guardar borrador' en un compose para retomarlo después.",
  "marketing.saved_drafts.no_title": "(sin título)",
  "marketing.saved_drafts.no_recipient": "(sin destinatario)",
  "marketing.saved_drafts.open": "Abrir",
  "marketing.saved_drafts.delete": "Eliminar",
  "marketing.saved_drafts.confirm_delete": "¿Eliminar este borrador?",
  "marketing.saved_drafts.mode.rapid": "Rápido",
  "marketing.saved_drafts.mode.builder": "Constructor",
  "marketing.email_templates.prop.embed": "Entrega de la imagen",
  "marketing.email_templates.embed.url": "URL pública (recomendado)",
  "marketing.email_templates.embed.cid": "Inline (CID embed)",
  "marketing.email_templates.embed.url_help":
    "El cliente de correo descarga la imagen por HTTPS. Email más liviano y nos permite contar aperturas.",
  "marketing.email_templates.embed.cid_help":
    "Los bytes viajan dentro del email. Más pesado pero se ve aunque el cliente bloquee imágenes externas (Outlook por defecto).",
  "marketing.settings.mailboxes.intro":
    "Mailboxes vigiladas. La IA lee inbound aquí y responde desde el mailbox del seller asignado.",
  "marketing.settings.mailboxes.new": "+ Nueva mailbox",
  "marketing.settings.mailboxes.edit_json": "Editar JSON",
  "marketing.settings.mailboxes.json_title": "Editar mailboxes",
  "marketing.settings.mailboxes.json_hint":
    "Array de mailboxes. Campos: id, tenant_id, address, provider, mode (idle|adaptive|poll), poll_interval_seconds, active, draft_mode, email_plugin_instance.",
  "marketing.settings.mailboxes.json_array_required":
    "El payload debe ser un array de mailboxes.",
  "marketing.settings.mailboxes.confirm_delete":
    'Eliminar mailbox "{id}"?',
  "marketing.settings.mailboxes.live": "live",
  "marketing.settings.mailboxes.draft_mode": "Draft + approve",
  "marketing.settings.mailboxes.autonomous": "Autonomous",
  "marketing.settings.mailboxes.poll_suffix": " · poll {seconds}s",
  "marketing.settings.mailboxes.loading": "Cargando mailboxes…",
  "marketing.settings.mailboxes.empty":
    "Sin mailboxes configuradas. Click '+ Nueva mailbox' para empezar.",
  "marketing.settings.sellers.intro":
    "Cada seller tiene su email outbound + firma + agente IA opcional. Cuando se vincula un agente, marketing reusa su modelo + system prompt; el override de modelo permite usar uno más potente solo para emails.",
  "marketing.settings.sellers.new": "Nuevo seller",
  "marketing.settings.sellers.filter_banner":
    "🔎 Filtrado a sellers de ",
  "marketing.settings.sellers.filter_count": "({visible} de {total})",
  "marketing.settings.sellers.clear_filter": "Quitar filtro",
  "marketing.settings.sellers.confirm_delete":
    'Eliminar seller "{id}"?',
  "marketing.settings.sellers.on_vacation": "en vacaciones",
  "marketing.settings.sellers.agent_prefix": "🤖 agent: {id}",
  "marketing.settings.sellers.no_agent": "sin agente",
  "marketing.settings.sellers.model_override": "override modelo",
  "marketing.settings.sellers.model_override_title":
    "Override: {provider}/{model}",
  "marketing.settings.sellers.delete_aria": "Eliminar {id}",
  "marketing.settings.sellers.loading": "Cargando sellers…",
  "marketing.settings.sellers.empty":
    "Sin sellers configurados. Click '+ Nuevo seller' para empezar.",
  "marketing.settings.rules.intro":
    "Reglas de routing — orden importa, primero match gana. Default round-robin entre sellers activos. Cambios se aplican sin reiniciar.",
  "marketing.settings.rules.new": "+ Nueva regla",
  "marketing.settings.rules.edit_json": "Editar JSON",
  "marketing.settings.rules.json_title": "Editar reglas de routing",
  "marketing.settings.rules.json_hint":
    "Documento RuleSet. Campos: tenant_id, version, rules[], default_target ({kind:'drop'} | {kind:'seller', id} | {kind:'round_robin', pool:[]}).",
  "marketing.settings.rules.json_object_required":
    "El payload debe ser un objeto RuleSet.",
  "marketing.settings.rules.confirm_delete": 'Eliminar regla "{id}"?',
  "marketing.settings.rules.active": "active",
  "marketing.settings.rules.paused": "paused",
  "marketing.settings.rules.no_name": "(sin nombre)",
  "marketing.settings.rules.empty":
    "No hay reglas definidas. Default target abajo se aplica a todo inbound.",
  "marketing.settings.rules.default_target_label":
    "Default target — aplica cuando ninguna regla matchea",
  "marketing.settings.rules.loading": "Cargando reglas…",
  "marketing.settings.rules.empty_full":
    "Sin RuleSet configurado. Click '+ Nueva regla' para empezar.",
  "marketing.settings.rules.describe_no_conditions": "sin condiciones",
  "marketing.settings.rules.describe_conditions": "{count} cond.",
  "marketing.settings.rules.describe_drop": "→ drop",
  "marketing.settings.rules.describe_seller": "→ {id}",
  "marketing.settings.rules.describe_pool": "→ pool [{ids}]",
  "marketing.settings.followup.intro":
    "Perfiles de cadencia. Per-rule + per-lead override.",
  "marketing.settings.followup.new": "+ Nuevo profile",
  "marketing.settings.followup.edit_json": "Editar JSON",
  "marketing.settings.followup.json_title": "Editar followup profiles",
  "marketing.settings.followup.json_hint":
    "Array de profiles. Campos: id, cadence (e.g. ['24h','72h','7d']), max_attempts, stop_on_reply (default true).",
  "marketing.settings.followup.json_array_required":
    "El payload debe ser un array de profiles.",
  "marketing.settings.followup.confirm_delete": 'Eliminar profile "{id}"?',
  "marketing.settings.followup.day_label": "Día +{cadence} → followup #{step}",
  "marketing.settings.followup.summary":
    "max attempts: {max} · stop_on_reply: {stop}",
  "marketing.settings.followup.summary_check": "✓",
  "marketing.settings.followup.summary_x": "✗",
  "marketing.settings.templates.title": "📝 Plantillas de notificación",
  "marketing.settings.templates.intro_html":
    "Per-tenant overrides for the operator alerts the marketing extension publishes (`agent.email.notification.<agent_id>`). Set per kind (lead_created · lead_replied · lead_transitioned · meeting_intent · draft_pending) and per locale (es · en). Empty fields → framework defaults.",
  "marketing.settings.templates.placeholders_prefix": "Placeholders: ",
  "marketing.settings.templates.placeholders_transition_prefix":
    ". Transitioned adds ",
  "marketing.settings.templates.placeholders_meeting_prefix":
    ". Meeting intent adds ",
  "marketing.settings.templates.edit_json": "Editar JSON (avanzado)",
  "marketing.settings.templates.json_title": "Edit notification templates",
  "marketing.settings.templates.json_hint":
    "NotificationTemplates document. Each kind: { es?: string, en?: string }. Placeholders use {{name}} syntax.",
  "marketing.settings.templates.json_object_required":
    "Payload must be a NotificationTemplates object.",
  "marketing.settings.templates.restart_required_note":
    "Templates saved on disk but the in-memory lookup wasn't wired in this deployment. Restart the extension to apply.",
  "marketing.settings.guardrails.title": "🛡️ Guardrails de temas",
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
    "⚠️ Error de compilación",
  "marketing.settings.guardrails.compile_error_footer":
    "La PUT no persistió. La regla en la lista que coincide queda marcada en rojo hasta tu próximo guardado exitoso.",
  "marketing.settings.guardrails.empty":
    "Sin guardrails configurados — autonomous reply sin restricciones.",
  "marketing.settings.guardrails.action_block": "block",
  "marketing.settings.guardrails.action_force_approval": "force approval",
  "marketing.settings.guardrails.edit_json": "Editar JSON",
  "marketing.settings.guardrails.json_title": "Edit topic guardrails",
  "marketing.settings.guardrails.json_hint":
    'Array of GuardrailRule. Each: { id, name, patterns: ["regex", ...], action: "force_approval" | "block" }. Server validates regex + dup ids before persisting.',
  "marketing.settings.guardrails.json_array_required":
    "Payload must be an array of GuardrailRule.",
  "marketing.settings.guardrails.restart_required_note":
    "Guardrails saved on disk but the in-memory handle wasn't wired in this deployment. Restart the extension to apply.",
  "marketing.settings.guardrails.invalid_pattern_with_id":
    "Regla `{id}` patrón #{index} inválido: {error}",
  "marketing.settings.guardrails.invalid_pattern_with_id_no_error":
    "Regla `{id}` patrón #{index} inválido",
  "marketing.settings.guardrails.invalid_pattern_generic":
    "Patrón regex inválido",
  "marketing.settings.guardrails.duplicate_with_id":
    "Regla `{id}` está duplicada — ids deben ser únicos",
  "marketing.settings.guardrails.duplicate_generic":
    "Id de regla duplicado",
  "marketing.settings.guardrails.empty_with_id":
    "Regla `{id}` no tiene patrones — añade al menos uno",
  "marketing.settings.guardrails.empty_generic":
    "Una regla no tiene patrones",
  "marketing.settings.draft_templates.title": "📝 Plantillas de drafts",
  "marketing.settings.draft_templates.intro_prefix":
    "Operator-authored draft bodies the AI uses as starting points for outbound replies. Mustache-lite syntax: ",
  "marketing.settings.draft_templates.intro_suffix":
    ". Sandboxed — no helpers, no eval, no IO.",
  "marketing.settings.draft_templates.missing_paths_prefix":
    "Missing paths render as ",
  "marketing.settings.draft_templates.missing_paths_suffix":
    " so a typo in the path doesn't crash the renderer.",
  "marketing.settings.draft_templates.new": "+ Nuevo template",
  "marketing.settings.draft_templates.edit_json": "Editar JSON",
  "marketing.settings.draft_templates.confirm_delete":
    'Eliminar template "{id}"?',
  "marketing.settings.draft_templates.empty":
    "Sin templates configurados — el operador todavía no ha autoreado ninguno.",
  "marketing.settings.draft_templates.json_title": "Edit draft templates",
  "marketing.settings.draft_templates.json_hint":
    "Array of Template. Each: { id, name, description?, body }. Body uses {{path.to.field}} substitution.",
  "marketing.settings.draft_templates.json_array_required":
    "Payload must be an array of Template.",
  "marketing.settings.draft_ai.title": "✨ Plantilla de draft con IA",
  "marketing.settings.draft_ai.intro":
    'Plantilla Handlebars sandboxed. La usa el botón "Generar borrador con IA" del lead drawer para producir el cuerpo inicial del draft. Hot-swap: guardar acá impacta el siguiente generate sin reiniciar la extensión.',
  "marketing.settings.draft_ai.variables_prefix": "Variables disponibles: ",
  "marketing.settings.draft_ai.variables_blocks": ". Bloques ",
  "marketing.settings.draft_ai.variables_blocks_middle": " / ",
  "marketing.settings.draft_ai.variables_blocks_suffix":
    " permitidos. Helpers custom + partials bloqueados (sandbox).",
  "marketing.settings.draft_ai.source_label": "Source actual: ",
  "marketing.settings.draft_ai.saved_toast": "✓ Guardado · hot-swap aplicado",
  "marketing.settings.draft_ai.loading": "Cargando template…",
  "marketing.settings.draft_ai.saving": "Guardando…",
  "marketing.settings.draft_ai.save": "Guardar + hot-swap",
  "marketing.settings.draft_ai.rendering": "Renderizando…",
  "marketing.settings.draft_ai.preview": "Preview",
  "marketing.settings.draft_ai.reset": "Reset al default",
  "marketing.settings.draft_ai.chars": "{count} chars",
  "marketing.settings.draft_ai.preview_summary": "Hint opcional para preview",
  "marketing.settings.draft_ai.preview_placeholder": 'Ej: "enfocar en pricing"',
  "marketing.settings.draft_ai.preview_note":
    "Sólo afecta el preview · al guardar no se persiste.",
  "marketing.settings.draft_ai.preview_render": "Preview render",
  "marketing.settings.snippets.title": "✂️ Snippets",
  "marketing.settings.snippets.intro_prefix":
    "Reusable phrases the operator inserts inline in the draft editor. Optional ",
  "marketing.settings.snippets.intro_middle": " (",
  "marketing.settings.snippets.intro_middle2": ", ",
  "marketing.settings.snippets.intro_suffix":
    ") maps to keyboard insertion. Same renderer as Draft templates — sandboxed mustache-lite.",
  "marketing.settings.snippets.new": "+ Nuevo snippet",
  "marketing.settings.snippets.edit_json": "Editar JSON",
  "marketing.settings.snippets.confirm_delete":
    'Eliminar snippet "{id}"?',
  "marketing.settings.snippets.empty": "Sin snippets configurados.",
  "marketing.settings.snippets.json_title": "Edit snippets",
  "marketing.settings.snippets.json_hint":
    "Array of Snippet. Each: { id, name, shortcut?, body }. Body uses {{path}} substitution.",
  "marketing.settings.snippets.json_array_required":
    "Payload must be an array of Snippet.",
  "marketing.settings.audit.title": "📜 Registro de auditoría",
  "marketing.settings.audit.intro":
    "Cada decisión de la IA — routing, transición de estado, notificación, guardrail, duplicado — queda persistida por tenant. Filtra por kind / lead_id / fecha; click en una fila para ver el detail completo.",
  "marketing.settings.audit.filter_kind": "Kind",
  "marketing.settings.audit.filter_lead_id": "Lead id",
  "marketing.settings.audit.filter_lead_id_placeholder": "lead-…",
  "marketing.settings.audit.filter_limit": "Límite",
  "marketing.settings.audit.apply": "Aplicar",
  "marketing.settings.audit.clear": "Limpiar",
  "marketing.settings.audit.loading": "Cargando…",
  "marketing.settings.audit.empty":
    "Sin filas para la combinación de filtros activa. Sólo se ven rows del tenant actual.",
  "marketing.settings.audit.kind_all": "(todos los kinds)",
  "marketing.settings.audit.kind_routing_decided": "Routing decided",
  "marketing.settings.audit.kind_lead_transitioned": "Lead transitioned",
  "marketing.settings.audit.kind_notification_published":
    "Notification published",
  "marketing.settings.audit.kind_topic_guardrail_fired": "Guardrail fired",
  "marketing.settings.audit.kind_duplicate_person_detected":
    "Duplicate detected",
  "marketing.settings.source.loading": "Cargando…",
  "marketing.settings.source.error":
    "Extension no disponible — {error} · datos demo",
  "marketing.settings.source.error_unknown": "error desconocido",
  "marketing.settings.source.mock":
    "Datos demo (config vacía en el extension)",

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
  "marketing.sidebar.no_match": "Ningún lead matchea los filtros.",
  "marketing.wizard.error.address_invalid": "Address debe ser un email válido.",
  "marketing.wizard.error.imap_host_required": "IMAP host obligatorio.",
  "marketing.wizard.error.imap_username_required":
    "IMAP username obligatorio (típicamente la misma address).",
  "marketing.wizard.error.name_required": "Nombre obligatorio.",
  "marketing.wizard.error.primary_email_invalid":
    "Email primario debe ser válido.",
  "marketing.wizard.error.smtp_host_username_required":
    "SMTP host + username obligatorios.",
  "marketing.wizard.field.imap_username":
    "Username (típicamente igual a address)",
  "marketing.wizard.field.seller_name_placeholder": "Pedro García",
  "marketing.wizard.field.signature_hint":
    'Vacío = se genera "—\\n{nombre}". Texto plano.',
  "marketing.wizard.field.agent_label": "Agente IA",
  "marketing.wizard.field.agent_hint":
    "El agente cuyo prompt + modelo usaremos para redactar las respuestas. Sin agente no hay drafts automáticos.",
  "marketing.wizard.field.agent_pick": "Selecciona un agente…",
  "marketing.wizard.field.agent_inactive": " (inactivo)",
  "marketing.wizard.field.agent_none_yet":
    "No hay agentes creados aún. Crea uno desde el módulo Agentes y vuelve.",
  "marketing.wizard.error.agent_required":
    "Selecciona un agente para que el seller pueda generar drafts con IA.",
  "marketing.wizard.field.auto_detected": "Detectado: {provider}",
  "marketing.credentials.password_label": "Contraseña",
  "marketing.credentials.password_placeholder": "••••••••",
  "marketing.credentials.password_hint":
    "Se guardará de forma segura.",
  "marketing.credentials.password_hint_existing":
    "Vacío = mantener la contraseña actual. Escribe una nueva para sobrescribir.",
  "marketing.credentials.probe_button": "Probar conexión",
  "marketing.credentials.probing": "Probando…",
  "marketing.credentials.probe_ok": "Credenciales correctas",
  "marketing.credentials.probe_fail": "No se pudo conectar · {message}",
  "marketing.credentials.probe_need_password":
    "Escribe la contraseña para poder probar la conexión.",
  "marketing.credentials.save_failed":
    "No se pudo guardar la contraseña: {message}",
  "marketing.followup_profile.cadence_day": "Día +{n}",
  "marketing.followup_profile.cadence_hour": "Hora +{n}",

  // ── Spam / promo filter ───────────────────────────────────
  "marketing.spamFilter.title": "Filtros de correo",
  "marketing.spamFilter.subtitle":
    "Detector de spam y publicidad. Personaliza dominios bloqueados, palabras clave y la sensibilidad del clasificador.",
  "marketing.spamFilter.tab": "Filtros",
  "marketing.spamFilter.sensitivity.title": "Sensibilidad",
  "marketing.spamFilter.sensitivity.subtitle":
    "Cuán agresivo debe ser el clasificador. Más estricto = menos spam pero más riesgo de bloquear correos legítimos.",
  "marketing.spamFilter.sensitivity.preset.lax": "Permisivo",
  "marketing.spamFilter.sensitivity.preset.lax_desc":
    "Solo bloquea correos sin texto visible (puro imagen).",
  "marketing.spamFilter.sensitivity.preset.balanced": "Balanceado",
  "marketing.spamFilter.sensitivity.preset.balanced_desc":
    "Recomendado. Bloquea boletines, remitentes no-reply con keywords promo, y combinaciones de señales débiles.",
  "marketing.spamFilter.sensitivity.preset.strict": "Estricto",
  "marketing.spamFilter.sensitivity.preset.strict_desc":
    "Más agresivo: detecta correos con tan solo 2 imágenes y poco texto. Puede bloquear correos válidos.",
  "marketing.spamFilter.sensitivity.preset.custom": "Personalizado",
  "marketing.spamFilter.sensitivity.preset.custom_desc":
    "Define tus propios umbrales con los controles avanzados.",
  "marketing.spamFilter.thresholds.image_only_drop": "Bloquear correos solo con imágenes",
  "marketing.spamFilter.thresholds.image_heavy_drop":
    "Bloquear correos con muchas imágenes y poco texto",
  "marketing.spamFilter.thresholds.image_heavy_min_count":
    "Mínimo de imágenes para considerar pesado",
  "marketing.spamFilter.thresholds.image_heavy_max_text_chars":
    "Máximo de texto visible (caracteres)",
  "marketing.spamFilter.thresholds.role_keyword_drop":
    "Bloquear remitentes no-reply con palabras de promoción",
  "marketing.spamFilter.thresholds.multi_weak_drop":
    "Bloquear cuando se acumulan señales débiles",
  "marketing.spamFilter.thresholds.multi_weak_threshold":
    "Cantidad de señales débiles para bloquear",
  "marketing.spamFilter.rules.title": "Listas personalizadas",
  "marketing.spamFilter.rules.subtitle":
    "Las listas de \"siempre permitir\" tienen prioridad sobre todo lo demás. Las de \"bloquear\" se aplican antes que el clasificador automático.",
  "marketing.spamFilter.rules.section.domain_block": "Dominios bloqueados",
  "marketing.spamFilter.rules.section.domain_allow": "Dominios siempre permitidos",
  "marketing.spamFilter.rules.section.keyword_block": "Palabras bloqueadas",
  "marketing.spamFilter.rules.section.keyword_allow": "Palabras siempre permitidas",
  "marketing.spamFilter.rules.section.sender_block": "Remitentes bloqueados",
  "marketing.spamFilter.rules.section.sender_allow": "Remitentes siempre permitidos",
  "marketing.spamFilter.rules.empty": "Sin reglas en esta categoría",
  "marketing.spamFilter.rules.add_placeholder.domain": "ejemplo.com",
  "marketing.spamFilter.rules.add_placeholder.keyword": "promoción especial",
  "marketing.spamFilter.rules.add_placeholder.sender": "alguien@ejemplo.com",
  "marketing.spamFilter.rules.add_button": "Agregar",
  "marketing.spamFilter.rules.delete_aria": "Eliminar regla",
  "marketing.spamFilter.test.title": "Probar el filtro",
  "marketing.spamFilter.test.subtitle":
    "Pega un correo de muestra para ver cómo lo clasificaría el filtro con la configuración actual.",
  "marketing.spamFilter.test.from_label": "Remitente",
  "marketing.spamFilter.test.from_placeholder": "alguien@ejemplo.com",
  "marketing.spamFilter.test.subject_label": "Asunto",
  "marketing.spamFilter.test.body_label": "Cuerpo (texto plano o HTML)",
  "marketing.spamFilter.test.run_button": "Probar",
  "marketing.spamFilter.test.verdict_human": "Sería aceptado como lead",
  "marketing.spamFilter.test.verdict_promo": "Sería bloqueado",
  "marketing.spamFilter.test.signal.image_count": "Imágenes detectadas",
  "marketing.spamFilter.test.signal.visible_text_chars": "Texto visible (caracteres)",
  "marketing.spamFilter.test.signal.keyword_hits": "Palabras clave coincidentes",
  "marketing.spamFilter.test.signal.sender_role": "Remitente tipo no-reply",
  "marketing.spamFilter.reason.domain_blocklist": "Dominio en tu lista de bloqueados",
  "marketing.spamFilter.reason.sender_blocklist": "Remitente en tu lista de bloqueados",
  "marketing.spamFilter.reason.image_only": "Cuerpo solo con imágenes",
  "marketing.spamFilter.reason.image_heavy_low_text":
    "Demasiadas imágenes y muy poco texto",
  "marketing.spamFilter.reason.noreply_with_keyword":
    "Remitente no-reply con palabra de promoción",
  "marketing.spamFilter.reason.multi_weak_signals":
    "Varias señales de promoción acumuladas",
  "marketing.spamFilter.save_ok": "Configuración guardada",
  "marketing.spamFilter.save_failed":
    "No se pudo guardar la configuración: {message}",
  "marketing.spamFilter.rule_add_failed":
    "No se pudo agregar la regla: {message}",
  "marketing.spamFilter.rule_delete_failed":
    "No se pudo eliminar la regla: {message}",
  "marketing.spamFilter.test_failed":
    "No se pudo ejecutar la prueba: {message}",

  "ui.search.clear_aria": "Limpiar búsqueda",
  "shell.sheet.open_aria": "Abrir menú",
  "shell.sheet.close_aria": "Cerrar menú",

  // ── Confirms ─────────────────────────────────────────────
  "confirm.delete_title": "Eliminar",
  "confirm.delete_body": "Esta acción no se puede deshacer.",

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
