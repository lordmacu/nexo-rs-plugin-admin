// Pending AI draft card. Operator can approve / edit / reject.
//
// M15.21 slice 3 — wired to the live marketing extension via
// `/api/marketing/leads/:id/drafts/:msg_id/{approve,reject}`
// + PUT for body edits. The card owns its own status + body
// state so the lead drawer doesn't have to round-trip the
// thread on every action; on approve success the parent is
// notified via `onChanged()` so it can refresh the thread to
// pick up the freshly-appended outbound row.
//
// All actions go through the typed API helpers in
// `src/api/marketing.ts` — when the server refuses (410 SMTP
// missing / 412 compliance block / 409 already-locked) the
// card surfaces the error code inline so the operator can
// react without leaving the lead drawer.

import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";

import {
  approveDraft,
  rejectDraft,
  updateDraft,
  type DraftStatus,
  type ThreadMessage,
} from "../../../api/marketing";
import { HttpError } from "../../../api/client";
import { formatRelative } from "../data/formatters";
import { Button, Input, Textarea } from "../../../components/ui";
import { useT } from "../../../i18n";
import AttachmentsPanel from "../AttachmentsPanel";

interface Props {
  readonly leadId: string;
  readonly draft: ThreadMessage;
  readonly sellerColor: string;
  /** Optional callback after a status flip — parent can refetch
   *  the thread so the freshly-appended outbound row appears. */
  readonly onChanged?: () => void;
}

/** Pull a stable error code out of an unknown thrown value.
 *  Server-side typed errors land as `{ code, message? }` in
 *  `HttpError.body`; surface that to the operator so the toast
 *  message is actionable ("smtp_credential_missing" → "register
 *  one via the seller form" hint). */
function errorCode(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | string;
    if (typeof body === "object" && body && "code" in body) {
      return body.code ?? `http_${e.status}`;
    }
    return `http_${e.status}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export default function AiDraftCard({
  leadId,
  draft,
  sellerColor,
  onChanged,
}: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(draft.body);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [status, setStatus] = useState<DraftStatus>(
    draft.draft_status ?? "pending",
  );
  const [busy, setBusy] = useState<"approve" | "reject" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachmentRefs, setAttachmentRefs] = useState<string[]>([]);

  // Subject string we forward on PUT. `undefined` ⇒ skip
  // the field entirely (keeps server-side state untouched).
  // Empty / whitespace ⇒ clear the override + revert to
  // inheriting the lead subject.
  const subjectChanged = subject !== (draft.subject ?? "");
  const subjectPayload = subjectChanged ? subject : undefined;

  if (status === "approved") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200/70 px-4 py-3 ring-1 ring-emerald-300 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <Check size={13} />
            {t("draft.approved")}
          </div>
        </div>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-700">
            <X size={13} />
            {t("draft.rejected")}
          </div>
        </div>
      </div>
    );
  }

  // ── Action handlers ─────────────────────────────────────────

  const onApprove = async (): Promise<void> => {
    setBusy("approve");
    setError(null);
    try {
      await approveDraft(leadId, draft.id, { attachmentRefs });
      setStatus("approved");
      onChanged?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (): Promise<void> => {
    setBusy("reject");
    setError(null);
    try {
      await rejectDraft(leadId, draft.id);
      setStatus("rejected");
      onChanged?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const onSaveAndApprove = async (): Promise<void> => {
    setBusy("save");
    setError(null);
    try {
      // Persist edits first so the body the publisher reads
      // matches what the operator sees, then approve.
      if (body !== draft.body || subjectChanged) {
        await updateDraft(leadId, draft.id, body, subjectPayload);
      }
      await approveDraft(leadId, draft.id, { attachmentRefs });
      setEditing(false);
      setStatus("approved");
      onChanged?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const onSaveOnly = async (): Promise<void> => {
    setBusy("save");
    setError(null);
    try {
      await updateDraft(leadId, draft.id, body, subjectPayload);
      setEditing(false);
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;

  return (
    <div className="flex justify-end">
      <div className="relative max-w-[82%] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-emerald-50 ring-1 ring-indigo-200 shadow-md">
        {/* Decorative corner glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-300/30 blur-2xl" />

        <div className="relative px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"
              aria-hidden
            >
              <Sparkles size={12} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              {t("draft.title")}
            </span>
            <span className="ml-auto text-[10px] text-slate-400">
              {formatRelative(draft.at_ms)}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isBusy}
                placeholder={t("draft.subject_placeholder")}
                aria-label="draft-subject"
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                disabled={isBusy}
                className="w-full rounded-lg border border-indigo-200 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              />
            </div>
          ) : (
            <>
              {draft.subject && (
                <p className="mb-1.5 text-[11px] font-semibold text-slate-600">
                  {t("draft.subject_label")}{" "}
                  <span className="text-slate-800">{draft.subject}</span>
                </p>
              )}
              <p className="whitespace-pre-wrap rounded-lg bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-slate-800 backdrop-blur-sm">
                {body}
              </p>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700"
            >
              {t("draft.error_prefix", { error })}
            </div>
          )}

          {/* Attachments — only surface when status is pending
              so finalised drafts don't show a misleading
              picker that no longer affects the (already sent)
              outbound. */}
          {status === "pending" && (
            <div className="mt-3 space-y-1">
              <span className="block text-[11px] text-slate-600">
                {t("marketing.attachments.label")}
              </span>
              <AttachmentsPanel
                selectedShas={attachmentRefs}
                onChange={setAttachmentRefs}
                enabled={!isBusy}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!editing ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onApprove}
                  disabled={isBusy}
                >
                  <Check size={13} />
                  {busy === "approve" ? t("draft.approve.busy") : t("draft.approve.label")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setEditing(true);
                  }}
                  disabled={isBusy}
                >
                  <Pencil size={12} />
                  {t("draft.edit")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onReject}
                  disabled={isBusy}
                >
                  <X size={12} />
                  {busy === "reject" ? t("draft.reject.busy") : t("draft.reject.label")}
                </Button>
                <span
                  className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500"
                  title={t("draft.outbound_from_seller.title")}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: sellerColor }}
                  />
                  {t("draft.outbound_from_seller")}
                </span>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSaveAndApprove}
                  disabled={isBusy || body.trim().length === 0}
                >
                  {busy === "save"
                    ? t("draft.save_and_send.busy")
                    : t("draft.save_and_send.label")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onSaveOnly}
                  disabled={isBusy || body.trim().length === 0}
                >
                  {t("draft.save_only")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBody(draft.body);
                    setSubject(draft.subject ?? "");
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={isBusy}
                >
                  {t("common.cancel")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
