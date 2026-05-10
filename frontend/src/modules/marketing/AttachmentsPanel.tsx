// Attachment picker for outbound emails. Two pieces:
//
// 1. AttachmentsPanel — the inline UI surfaced inside Compose
//    modal / ComposeWithBuilder / approve drawer. Renders the
//    list of currently-selected attachments as chips and a
//    "+ Adjuntar" button that opens the library modal.
//
// 2. AttachmentLibraryModal — WordPress-style picker. Lists
//    every previously-uploaded attachment for the tenant +
//    an "Upload new" tile that uploads via FormData and
//    auto-selects the fresh row.
//
// SHA dedup: if the operator uploads factura.pdf twice the
// store collapses to one row (filename = first one). The
// modal re-fetches after upload and picks up the row by sha.

import { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload as UploadIcon,
  X,
} from "lucide-react";

import { HttpError } from "../../api/client";
import {
  deleteComposeAttachment,
  listComposeAttachments,
  uploadComposeAttachment,
  type LibraryAttachment,
} from "../../api/composeAttachments";
import { Button, Input, Modal } from "../../components/ui";
import { useT } from "../../i18n";

// ── Panel — chips of selected refs + "Add" button ───────────

export interface AttachmentsPanelProps {
  /** SHAs the operator has selected for this send. */
  selectedShas: string[];
  /** Replace the selection (caller controls the list — this
   *  component is presentational + delegates the modal flow). */
  onChange: (shas: string[]) => void;
  /** When false, the panel is read-only (e.g. mid-send). */
  enabled?: boolean;
}

export default function AttachmentsPanel({
  selectedShas,
  onChange,
  enabled = true,
}: AttachmentsPanelProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Local cache of metadata so chips can render filename +
  // size without a fetch per render. Refreshed when the
  // selection changes or the modal closes.
  const [metaBySha, setMetaBySha] = useState<Record<string, LibraryAttachment>>(
    {},
  );

  useEffect(() => {
    // Fetch metadata for the current selection so chips have
    // real names. Skip when the selection is empty or every
    // sha already has cached metadata.
    if (selectedShas.length === 0) return;
    const missing = selectedShas.filter((sha) => !metaBySha[sha]);
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await listComposeAttachments();
        if (cancelled) return;
        setMetaBySha((prev) => {
          const next = { ...prev };
          for (const a of r.attachments) next[a.sha256] = a;
          return next;
        });
      } catch {
        // Best-effort — chips will fall back to sha prefix.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedShas, metaBySha]);

  function remove(sha: string) {
    onChange(selectedShas.filter((s) => s !== sha));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedShas.length === 0 ? (
          <span className="text-xs italic text-text-tertiary">
            {t("marketing.attachments.none")}
          </span>
        ) : (
          selectedShas.map((sha) => {
            const m = metaBySha[sha];
            return (
              <span
                key={sha}
                className="inline-flex items-center gap-1.5 rounded-full border bg-panel-alt px-2 py-1 text-xs"
                title={m?.filename ?? sha}
              >
                {iconForMime(m?.mime)}
                <span className="max-w-[160px] truncate">
                  {m?.filename ?? `${sha.slice(0, 8)}…`}
                </span>
                {m && (
                  <span className="text-text-tertiary">
                    · {formatBytes(m.size_bytes)}
                  </span>
                )}
                {enabled && (
                  <button
                    type="button"
                    aria-label="remove"
                    className="ml-1 rounded p-0.5 text-text-tertiary hover:bg-danger/20 hover:text-danger"
                    onClick={() => remove(sha)}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leadingIcon={<Paperclip size={12} />}
        onClick={() => setOpen(true)}
        disabled={!enabled}
      >
        {t("marketing.attachments.add")}
      </Button>
      <AttachmentLibraryModal
        open={open}
        selectedShas={selectedShas}
        onPick={(shas) => {
          onChange(shas);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

// ── Modal — library list + multi-select + upload ────────────

interface AttachmentLibraryModalProps {
  open: boolean;
  selectedShas: string[];
  onPick: (shas: string[]) => void;
  onClose: () => void;
}

function AttachmentLibraryModal({
  open,
  selectedShas,
  onPick,
  onClose,
}: AttachmentLibraryModalProps) {
  const t = useT();
  const [items, setItems] = useState<LibraryAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deletingSha, setDeletingSha] = useState<string | null>(null);

  // Fresh fetch on every open + seed the picked set from the
  // caller-supplied selection so a re-open doesn't lose it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPicked(new Set(selectedShas));
    void (async () => {
      try {
        const r = await listComposeAttachments();
        if (!cancelled) setItems(r.attachments);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedShas]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const r = await uploadComposeAttachment(file);
      // Re-fetch + auto-pick the freshly-uploaded sha.
      const list = await listComposeAttachments();
      setItems(list.attachments);
      setPicked((prev) => new Set([...prev, r.sha256]));
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setUploading(false);
    }
  }

  async function deleteRow(sha: string) {
    if (!confirm(t("marketing.attachments.confirm_delete"))) return;
    setDeletingSha(sha);
    setError(null);
    try {
      await deleteComposeAttachment(sha);
      setItems((prev) => prev.filter((x) => x.sha256 !== sha));
      setPicked((prev) => {
        const next = new Set(prev);
        next.delete(sha);
        return next;
      });
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setDeletingSha(null);
    }
  }

  if (!open) return null;

  const term = search.trim().toLowerCase();
  const visible = term
    ? items.filter(
        (a) =>
          a.filename.toLowerCase().includes(term) ||
          a.mime.toLowerCase().includes(term),
      )
    : items;

  return (
    <Modal title={t("marketing.attachments.library_title")} size="lg" onClose={onClose}>
      <div className="flex h-[600px] flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketing.attachments.search_placeholder")}
          />
          <UploadButton uploading={uploading} onPick={uploadFile} />
        </div>

        {error && (
          <div className="border-b border-danger bg-danger/10 px-4 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.attachments.loading")}
            </p>
          )}
          {!loading && items.length === 0 && (
            <p className="p-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.attachments.empty")}
            </p>
          )}
          {!loading && items.length > 0 && visible.length === 0 && (
            <p className="p-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.attachments.no_match")}
            </p>
          )}
          {visible.length > 0 && (
            <ul className="divide-y">
              {visible.map((a) => {
                const isPicked = picked.has(a.sha256);
                return (
                  <li
                    key={a.sha256}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-panel-hover ${
                      isPicked ? "bg-primary/5" : ""
                    } ${deletingSha === a.sha256 ? "opacity-40" : ""}`}
                    onClick={() => {
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.sha256)) next.delete(a.sha256);
                        else next.add(a.sha256);
                        return next;
                      });
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      readOnly
                      className="h-4 w-4 cursor-pointer"
                    />
                    <span className="text-text-secondary">
                      {iconForMime(a.mime)}
                    </span>
                    <span className="flex-1 truncate text-sm">{a.filename}</span>
                    <span className="text-xs text-text-tertiary">
                      {a.mime.split("/").pop()} · {formatBytes(a.size_bytes)}
                    </span>
                    <button
                      type="button"
                      aria-label="delete"
                      className="rounded p-1 text-text-tertiary hover:bg-danger/10 hover:text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRow(a.sha256);
                      }}
                      disabled={deletingSha === a.sha256}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-text-secondary">
            {picked.size === 0
              ? t("marketing.attachments.selected_zero")
              : t("marketing.attachments.selected_count", {
                  count: String(picked.size),
                })}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("marketing.attachments.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => onPick(Array.from(picked))}
            >
              {picked.size === 0
                ? t("marketing.attachments.use_zero")
                : t("marketing.attachments.use_count", {
                    count: String(picked.size),
                  })}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function UploadButton({
  uploading,
  onPick,
}: {
  uploading: boolean;
  onPick: (file: File) => Promise<void>;
}) {
  const t = useT();
  const inputId = `att-upload-${Math.random().toString(36).slice(2)}`;
  return (
    <>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rtf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onPick(f);
        }}
      />
      <Button
        type="button"
        variant="primary"
        size="sm"
        leadingIcon={<UploadIcon size={12} />}
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={uploading}
        busy={uploading}
      >
        {uploading
          ? t("marketing.attachments.uploading")
          : t("marketing.attachments.upload")}
      </Button>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function iconForMime(mime: string | undefined) {
  if (!mime) return <FileText size={14} />;
  if (mime.startsWith("image/")) return <ImageIcon size={14} />;
  if (mime.includes("zip")) return <FileArchive size={14} />;
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") {
    return <FileSpreadsheet size={14} />;
  }
  return <FileText size={14} />;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | undefined;
    return body?.message ?? body?.code ?? `HTTP ${e.status}`;
  }
  return String(e);
}
