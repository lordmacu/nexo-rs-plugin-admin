// Quick-compose page (rapid text mode) — replaces the prior
// modal popup. The operator clicks "Nuevo email" in the
// sidebar and lands on this full page; from here they can
// switch to the visual block builder via a header link
// without losing the form fields.
//
// Form state hydrates either from a saved draft (sentinel
// from SavedDraftsView) or starts blank. "Save draft" POSTs
// the first time + PUTs on every subsequent click. A
// successful send deletes the source draft so its lifecycle
// matches the AI-draft inbox.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import { composeEmail } from "../../api/compose";
import {
  createComposeDraft,
  deleteComposeDraft,
  getComposeDraft,
  updateComposeDraft,
} from "../../api/composeDrafts";
import { takeReopenDraftId } from "./SavedDraftsView";
import {
  listEmailTemplates,
  previewEmailTemplate,
  type EmailTemplate,
} from "../../api/emailTemplates";
import { getSellers, type ConfigSeller } from "../../api/marketing";
import { HttpError } from "../../api/client";
import {
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "../../components/ui";
import { useT } from "../../i18n";
import AttachmentsPanel from "./AttachmentsPanel";

export default function ComposeQuickView() {
  const t = useT();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<readonly ConfigSeller[] | null>(null);
  const [templates, setTemplates] = useState<readonly EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachmentRefs, setAttachmentRefs] = useState<string[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [withTracking, setWithTracking] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from a saved draft when SavedDraftsView routed us
  // here. Sentinel is one-shot — consumed in takeReopenDraftId.
  useEffect(() => {
    const id = takeReopenDraftId();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await getComposeDraft(id);
        if (cancelled) return;
        const d = r.draft;
        if (d.mode !== "rapid") {
          // Builder draft → bounce to the visual route.
          navigate("/m/marketing/compose/builder");
          return;
        }
        setCurrentDraftId(d.id);
        setToEmail(d.to_email);
        setToName(d.to_name);
        setSubject(d.subject);
        setBody(d.body);
        setSellerId(d.seller_id);
        setWithTracking(d.with_tracking);
        setAttachmentRefs(d.attachment_refs);
        if (d.template_id) setTemplateId(d.template_id);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // sellerId intentionally omitted — set once on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server-side preview render fills body when a template is
  // picked. Skips on every keystroke so manual edits survive.
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    setTemplateLoading(true);
    void (async () => {
      try {
        const tpl = templates.find((tt) => tt.id === templateId);
        if (!tpl) return;
        const r = await previewEmailTemplate(tpl.blocks, {
          "recipient.name": toName.trim() || "{{recipient.name}}",
          "recipient.email": toEmail.trim() || "{{recipient.email}}",
          "seller.name":
            sellers?.find((s) => s.id === sellerId)?.name ?? "{{seller.name}}",
          "seller.email":
            sellers?.find((s) => s.id === sellerId)?.primary_email ??
            "{{seller.email}}",
          "lead.subject": subject.trim() || "{{lead.subject}}",
        });
        if (!cancelled) setBody(r.html);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const sellerOptions =
    sellers?.map((s) => ({ value: s.id, label: `${s.name} <${s.primary_email}>` })) ?? [];
  const canSend =
    !sending &&
    toEmail.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    sellerId.length > 0;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const trimmedName = toName.trim();
      const tplVars = templateId
        ? {
            "recipient.name": trimmedName || toEmail.trim(),
            "recipient.email": toEmail.trim(),
            "seller.name":
              sellers?.find((s) => s.id === sellerId)?.name ?? "",
            "seller.email":
              sellers?.find((s) => s.id === sellerId)?.primary_email ?? "",
            "lead.subject": subject.trim(),
          }
        : undefined;
      const result = await composeEmail({
        to_email: toEmail.trim(),
        ...(trimmedName ? { to_name: trimmedName } : {}),
        subject: subject.trim(),
        body: body.trim(),
        seller_id: sellerId,
        with_tracking: withTracking,
        ...(templateId ? { template_id: templateId } : {}),
        ...(tplVars ? { template_vars: tplVars } : {}),
        ...(attachmentRefs.length > 0
          ? { attachment_refs: attachmentRefs }
          : {}),
      });
      if (currentDraftId) {
        try {
          await deleteComposeDraft(currentDraftId);
        } catch {
          // Best-effort — drafts page reload reconciles.
        }
      }
      navigate(`/m/marketing/leads/${result.lead_id}`);
    } catch (e) {
      setError(t("marketing.compose.failed", { message: formatErr(e) }));
    } finally {
      setSending(false);
    }
  }

  async function saveDraft() {
    setDraftSaving(true);
    setError(null);
    try {
      const titleCandidate = subject.trim() || toEmail.trim();
      const input = {
        ...(titleCandidate ? { title: titleCandidate } : {}),
        to_email: toEmail.trim(),
        to_name: toName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        seller_id: sellerId,
        with_tracking: withTracking,
        ...(templateId ? { template_id: templateId } : {}),
        attachment_refs: attachmentRefs,
        mode: "rapid" as const,
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

  return (
    <div className="space-y-3 p-4">
      {/* Stretches across the available width — the marketing
          context panel is hidden on this route so there's no
          competing right pane to balance against. Inner form
          fields keep their own readable widths via the inner
          card's padding. */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {t("marketing.compose.title")}
          </h1>
          <p className="text-xs text-text-secondary">
            {t("marketing.compose.subtitle")}
          </p>
        </div>
        <Link
          to="/m/marketing/compose/builder"
          className="inline-flex items-center gap-1.5 self-start rounded border bg-panel px-3 py-1.5 text-xs hover:bg-panel-hover sm:self-auto"
        >
          <LayoutGrid size={12} />
          {t("marketing.compose.open_builder")}
        </Link>
      </header>

      {error && (
        <div className="rounded border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {sellers && sellers.length === 0 && (
        <div className="rounded border border-warning bg-warning/10 px-3 py-2 text-xs text-warning">
          {t("marketing.compose.no_sellers")}
        </div>
      )}

      <div className="rounded border bg-panel p-4 space-y-3 text-sm">
        <label className="block">
          <span className="block text-xs text-text-secondary">
            {t("marketing.compose.field.seller")}
          </span>
          <Select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            disabled={!sellers || sellers.length === 0}
          >
            {sellerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="block text-xs text-text-secondary">
            {t("marketing.compose.field.template")}
          </span>
          <Select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={templateLoading}
          >
            <option value="">{t("marketing.compose.template_none")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </Select>
          {templateLoading && (
            <span className="block text-[11px] text-text-meta">
              {t("marketing.compose.template_loading")}
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs text-text-secondary">
              {t("marketing.compose.field.to_email")}
            </span>
            <Input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder={t("marketing.compose.field.to_email_placeholder")}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-secondary">
              {t("marketing.compose.field.to_name")}
            </span>
            <Input
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder={t("marketing.compose.field.to_name_placeholder")}
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs text-text-secondary">
            {t("marketing.compose.field.subject")}
          </span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("marketing.compose.field.subject_placeholder")}
          />
        </label>

        <label className="block">
          <span className="block text-xs text-text-secondary">
            {t("marketing.compose.field.body")}
          </span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder={t("marketing.compose.field.body_placeholder")}
          />
        </label>

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
          {t("marketing.compose.field.with_tracking")}
        </Checkbox>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {draftSavedAt && (
          <span className="mr-auto text-[11px] text-text-tertiary">
            {t("marketing.compose.draft_saved", {
              at: new Date(draftSavedAt).toLocaleTimeString(),
            })}
          </span>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/m/marketing")}
          disabled={sending}
        >
          {t("marketing.compose.cancel_button")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={saveDraft}
          disabled={sending || draftSaving}
          busy={draftSaving}
        >
          {t("marketing.compose.save_draft")}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={send}
          disabled={!canSend}
          busy={sending}
        >
          {sending
            ? t("marketing.compose.sending")
            : t("marketing.compose.send_button")}
        </Button>
      </div>
    </div>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    if (typeof e.body === "object" && e.body && "message" in e.body) {
      return String((e.body as { message?: string }).message ?? e.body);
    }
    return `HTTP ${e.status}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
