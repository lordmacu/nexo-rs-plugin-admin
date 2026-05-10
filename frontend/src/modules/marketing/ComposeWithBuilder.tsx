// Compose-with-builder route — full-page email composer that
// embeds the Elementor-style block builder.
//
// Flow: operator picks "Composer" mode in the compose modal,
// lands here with a blank canvas. Optional "Cargar template"
// dropdown pre-populates blocks from a saved template. On
// send, the blocks travel to /compose/send as `blocks: [...]`
// — server renders + resolves CIDs the same way it would for
// a saved-template send. No persistence of the canvas (this
// is one-shot send-now content; if the operator wants to
// reuse it they save it as a template separately).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { composeEmail } from "../../api/compose";
import {
  createComposeDraft,
  deleteComposeDraft,
  getComposeDraft,
  updateComposeDraft,
} from "../../api/composeDrafts";
import {
  listEmailTemplates,
  type EmailBlock,
  type EmailTemplate,
} from "../../api/emailTemplates";
import { takeReopenDraftId } from "./SavedDraftsView";
import { getSellers, type ConfigSeller } from "../../api/marketing";
import { HttpError } from "../../api/client";
import {
  Checkbox,
  Input,
  Select,
} from "../../components/ui";
import { useT } from "../../i18n";
import EmailTemplateEditor, {
  type ComposeMode,
} from "./EmailTemplateEditor";
import AttachmentsPanel from "./AttachmentsPanel";

const SESSION_FORM_KEY = "marketing.compose.builder.form";

interface PersistedFormState {
  toEmail: string;
  toName: string;
  subject: string;
  sellerId: string;
  withTracking: boolean;
}

export default function ComposeWithBuilder() {
  const t = useT();
  const navigate = useNavigate();

  // Form state — persisted to sessionStorage so the operator
  // doesn't lose what they typed if they re-open the page or
  // click around the canvas.
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [withTracking, setWithTracking] = useState(true);
  const [attachmentRefs, setAttachmentRefs] = useState<string[]>([]);
  // When the operator landed here via "Open draft" the
  // SavedDraftsView set a sessionStorage sentinel — we
  // consume it on mount to hydrate state. `currentDraftId`
  // also tracks any locally-saved draft so re-saves PUT
  // instead of POSTing duplicates.
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  // Source data.
  const [sellers, setSellers] = useState<readonly ConfigSeller[] | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Load template-into-canvas hookup. `seedBlocks` becomes the
  // editor's `initialBlocks` and `seedKey` flips on every
  // dropdown pick to force the editor to re-seed.
  const [seedBlocks, setSeedBlocks] = useState<EmailBlock[]>([]);
  const [seedKey, setSeedKey] = useState<string>("init");
  const [pickedTemplateId, setPickedTemplateId] = useState("");

  // Send state.
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate persisted form (operator returning to the page).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_FORM_KEY);
      if (!raw) return;
      const f = JSON.parse(raw) as Partial<PersistedFormState>;
      if (typeof f.toEmail === "string") setToEmail(f.toEmail);
      if (typeof f.toName === "string") setToName(f.toName);
      if (typeof f.subject === "string") setSubject(f.subject);
      if (typeof f.sellerId === "string") setSellerId(f.sellerId);
      if (typeof f.withTracking === "boolean") setWithTracking(f.withTracking);
    } catch {
      // Corrupt JSON — ignore, treat as fresh load.
    }
  }, []);

  // Persist form state on every change (cheap; tiny payload).
  useEffect(() => {
    const payload: PersistedFormState = {
      toEmail,
      toName,
      subject,
      sellerId,
      withTracking,
    };
    try {
      sessionStorage.setItem(SESSION_FORM_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded / disabled storage — fail silent; form
      // still works in-memory for the rest of the session.
    }
  }, [toEmail, toName, subject, sellerId, withTracking]);

  // Hydrate from a saved compose draft when SavedDraftsView
  // routed us here. Runs once on mount; the sentinel is
  // consumed (cleared) so a refresh doesn't re-hydrate.
  useEffect(() => {
    const id = takeReopenDraftId();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await getComposeDraft(id);
        if (cancelled) return;
        const d = r.draft;
        setCurrentDraftId(d.id);
        setToEmail(d.to_email);
        setToName(d.to_name);
        setSubject(d.subject);
        setSellerId(d.seller_id);
        setWithTracking(d.with_tracking);
        setAttachmentRefs(d.attachment_refs);
        if (d.blocks) {
          setSeedBlocks(d.blocks);
          setSeedKey(`hydrate-${d.id}-${Date.now()}`);
        }
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load sellers + templates once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [sellersRes, templatesRes] = await Promise.all([
          getSellers(),
          listEmailTemplates(),
        ]);
        if (cancelled) return;
        setSellers(sellersRes.sellers);
        setTemplates(templatesRes.templates);
        if (sellersRes.sellers.length > 0 && !sellerId) {
          setSellerId(sellersRes.sellers[0]!.id);
        }
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // sellerId intentionally omitted — we set it inside on
    // first load only; later changes don't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadTemplate(id: string) {
    setPickedTemplateId(id);
    if (!id) {
      setSeedBlocks([]);
      setSeedKey(`reset-${Date.now()}`);
      return;
    }
    const tpl = templates.find((tt) => tt.id === id);
    if (!tpl) return;
    // Deep-clone — operator may modify the canvas; we don't
    // want those edits to mutate the cached template object.
    setSeedBlocks(JSON.parse(JSON.stringify(tpl.blocks)) as EmailBlock[]);
    setSeedKey(`tpl-${id}-${Date.now()}`);
  }

  async function send(blocks: EmailBlock[]) {
    setSending(true);
    setError(null);
    try {
      // Same vars the modal's preview uses so server-side
      // render produces the string the operator saw on canvas.
      const tplVars: Record<string, string> = {
        "recipient.name": toName.trim() || toEmail.trim(),
        "recipient.email": toEmail.trim(),
        "seller.name": sellers?.find((s) => s.id === sellerId)?.name ?? "",
        "seller.email":
          sellers?.find((s) => s.id === sellerId)?.primary_email ?? "",
        "lead.subject": subject.trim(),
      };
      const trimmedName = toName.trim();
      const result = await composeEmail({
        to_email: toEmail.trim(),
        ...(trimmedName ? { to_name: trimmedName } : {}),
        subject: subject.trim(),
        body: "", // ignored when blocks present
        seller_id: sellerId,
        with_tracking: withTracking,
        blocks,
        template_vars: tplVars,
        ...(attachmentRefs.length > 0
          ? { attachment_refs: attachmentRefs }
          : {}),
      });
      // Clear the form persistence — successful send means
      // the next compose starts blank.
      try {
        sessionStorage.removeItem(SESSION_FORM_KEY);
      } catch {
        // ignore
      }
      // If this compose started from a saved draft, delete
      // it now — the operator's effort lives on the freshly
      // created lead instead. Best-effort: a delete failure
      // doesn't undo the send.
      if (currentDraftId) {
        try {
          await deleteComposeDraft(currentDraftId);
        } catch {
          // Surface only on the drafts-saved page reload.
        }
      }
      navigate(`/m/marketing/leads/${result.lead_id}`);
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setSending(false);
    }
  }

  /** Save the current canvas + form fields as a compose draft.
   *  First save → POST + remember the id; subsequent saves →
   *  PUT against that id. The "saved at HH:MM" indicator
   *  surfaces success without yanking focus. */
  async function saveDraft(currentBlocks: EmailBlock[]) {
    setDraftSaving(true);
    setError(null);
    try {
      const tplVars: Record<string, string> = {
        "recipient.name": toName.trim() || toEmail.trim(),
        "recipient.email": toEmail.trim(),
        "seller.name": sellers?.find((s) => s.id === sellerId)?.name ?? "",
        "seller.email":
          sellers?.find((s) => s.id === sellerId)?.primary_email ?? "",
        "lead.subject": subject.trim(),
      };
      const titleCandidate = subject.trim() || toEmail.trim();
      const input = {
        ...(titleCandidate ? { title: titleCandidate } : {}),
        to_email: toEmail.trim(),
        to_name: toName.trim(),
        subject: subject.trim(),
        body: "",
        seller_id: sellerId,
        with_tracking: withTracking,
        template_vars: tplVars,
        blocks: currentBlocks,
        attachment_refs: attachmentRefs,
        mode: "builder" as const,
      };
      if (currentDraftId) {
        await updateComposeDraft(currentDraftId, input);
      } else {
        const r = await createComposeDraft(input);
        setCurrentDraftId(r.draft.id);
      }
      setDraftSavedAt(Date.now());
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setDraftSaving(false);
    }
  }

  const canSend =
    toEmail.trim().length > 0 &&
    subject.trim().length > 0 &&
    sellerId.length > 0;

  // Form fields rendered above the editor canvas.
  const composeFields = (
    <div className="space-y-3 rounded border bg-panel p-3">
      {/* Reciprocal of the quick-mode "Open builder" link —
          lets the operator switch back to the textarea
          flavour without losing form state (form fields are
          shared sessionStorage keys; blocks state is canvas-
          local and would reset on switch). */}
      <div className="flex justify-end">
        <a
          href="/m/marketing/compose"
          className="text-[11px] text-text-secondary hover:text-primary"
          onClick={(e) => {
            e.preventDefault();
            navigate("/m/marketing/compose");
          }}
        >
          ← {t("marketing.compose.open_quick")}
        </a>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.compose.to_email")}
          </span>
          <Input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </label>
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.compose.to_name")}
          </span>
          <Input
            value={toName}
            onChange={(e) => setToName(e.target.value)}
            placeholder={t("marketing.compose.to_name_placeholder")}
          />
        </label>
      </div>
      <label className="block text-xs">
        <span className="block text-text-secondary">
          {t("marketing.compose.subject")}
        </span>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.compose.seller")}
          </span>
          <Select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          >
            <option value="">—</option>
            {sellers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {"<"}
                {s.primary_email}
                {">"}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.compose.builder.load_template")}
          </span>
          <Select
            value={pickedTemplateId}
            onChange={(e) => loadTemplate(e.target.value)}
          >
            <option value="">{t("marketing.compose.builder.blank")}</option>
            {templates.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="space-y-1">
        <span className="block text-xs text-text-secondary">
          {t("marketing.attachments.label")}
        </span>
        <AttachmentsPanel
          selectedShas={attachmentRefs}
          onChange={setAttachmentRefs}
          enabled={!sending}
        />
      </div>
      <Checkbox
        checked={withTracking}
        onChange={(e) => setWithTracking(e.target.checked)}
      >
        {t("marketing.compose.with_tracking")}
      </Checkbox>
    </div>
  );

  // Memoise so the editor's deep-equal-ish reseed effect
  // fires only when the picked template actually changes.
  const composeMode: ComposeMode = useMemo(
    () => ({
      composeFields,
      sendLabel: canSend
        ? t("marketing.compose.send")
        : t("marketing.compose.builder.fill_required"),
      sendBusy: sending,
      onSend: (blocks) =>
        canSend ? send(blocks) : Promise.resolve(),
      initialBlocks: seedBlocks,
      reseedKey: seedKey,
      backLabel: t("marketing.compose.cancel"),
      onBack: () => navigate("/m/marketing"),
      externalError: error,
      onSaveDraft: saveDraft,
      saveDraftBusy: draftSaving,
      saveDraftHint: draftSavedAt
        ? t("marketing.compose.draft_saved", {
            at: new Date(draftSavedAt).toLocaleTimeString(),
          })
        : null,
    }),
    // composeFields rebuilds on every form change — that's OK,
    // the ComposeMode object is consumed as plain data by the
    // editor and only `reseedKey` triggers re-seed there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      composeFields,
      canSend,
      sending,
      seedBlocks,
      seedKey,
      error,
      attachmentRefs,
      draftSaving,
      draftSavedAt,
    ],
  );

  return (
    <div className="p-3">
      <EmailTemplateEditor composeMode={composeMode} />
    </div>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | undefined;
    return body?.message ?? body?.code ?? `HTTP ${e.status}`;
  }
  return String(e);
}
