// WordPress-style media picker for Image blocks. The grid
// surfaces every previously-uploaded asset so an operator can
// reuse the same logo across templates without re-uploading
// (the SHA dedup makes a re-upload a no-op DB-wise, but the
// operator never has to hunt for the file on disk again).
//
// Layout:
//   ┌─ Modal (lg) ────────────────────────────────────┐
//   │ Search                                          │
//   │ ┌──────┬──────┬──────┬──────┐                  │
//   │ │ Up.. │      │      │      │  ← grid          │
//   │ │  +   │ thumb│ thumb│ thumb│                  │
//   │ └──────┴──────┴──────┴──────┘                  │
//   │ … infinite-ish (shows all assets, scrolls)     │
//   │ ────────────────────────────────────────────── │
//   │ Selected info  | Cancelar | Usar               │
//   └────────────────────────────────────────────────┘

import { useEffect, useState } from "react";
import { Trash2, Upload as UploadIcon, X } from "lucide-react";

import { HttpError } from "../../api/client";
import {
  deleteTemplateAsset,
  listTemplateAssets,
  uploadTemplateAsset,
  type LibraryAsset,
} from "../../api/emailTemplates";
import { Button, Input, Modal } from "../../components/ui";
import { useT } from "../../i18n";

export interface MediaLibraryModalProps {
  open: boolean;
  /** Currently-set URL on the Image block (so the matching
   *  thumbnail is highlighted when the operator opens the
   *  modal — one less click to confirm the existing pick). */
  currentUrl: string;
  /** Called with the selected asset's URL when the operator
   *  clicks "Use". The parent then sets the URL on the block. */
  onPick: (url: string, sha256: string) => void;
  onClose: () => void;
}

export default function MediaLibraryModal({
  open,
  currentUrl,
  onPick,
  onClose,
}: MediaLibraryModalProps) {
  const t = useT();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingSha, setDeletingSha] = useState<string | null>(null);

  // Fresh list on every open so a sibling operator's upload
  // shows up the next time the modal pops.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedSha(null);
    void (async () => {
      try {
        const r = await listTemplateAssets();
        if (cancelled) return;
        // Drop rows without a public URL — they exist in the
        // store but MARKETING_TRACKING_BASE_URL isn't
        // configured, so there's nothing to insert.
        setAssets(r.assets.filter((a) => a.url));
        // Pre-select the current URL's row if we have it.
        const current = r.assets.find((a) => a.url === currentUrl);
        if (current) setSelectedSha(current.sha256);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentUrl]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const r = await uploadTemplateAsset(file);
      // Re-fetch so the new row sorts correctly + dedups
      // surface (SHA collision = no new row, just the same
      // existing one comes back with same created_at_ms).
      const list = await listTemplateAssets();
      setAssets(list.assets.filter((a) => a.url));
      setSelectedSha(r.sha256);
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(sha: string) {
    if (!confirm(t("marketing.media.confirm_delete"))) return;
    setDeletingSha(sha);
    setError(null);
    try {
      await deleteTemplateAsset(sha);
      setAssets((prev) => prev.filter((a) => a.sha256 !== sha));
      if (selectedSha === sha) setSelectedSha(null);
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setDeletingSha(null);
    }
  }

  function pick() {
    if (!selectedSha) return;
    const a = assets.find((x) => x.sha256 === selectedSha);
    if (!a || !a.url) return;
    onPick(a.url, a.sha256);
    onClose();
  }

  if (!open) return null;

  // Filter is sha-prefix or mime substring — operator's
  // mental model is "find the file I just uploaded" or "find
  // all PNGs"; full-text on filename isn't possible since we
  // discard the original filename on upload (privacy + dedup).
  const term = search.trim().toLowerCase();
  const visible = term
    ? assets.filter(
        (a) =>
          a.sha256.toLowerCase().startsWith(term) ||
          a.mime.toLowerCase().includes(term),
      )
    : assets;

  return (
    <Modal title={t("marketing.media.title")} size="lg" onClose={onClose}>
      <div className="flex h-[600px] flex-col">
        <div className="border-b px-4 py-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketing.media.search_placeholder")}
          />
        </div>

        {error && (
          <div className="border-b border-danger bg-danger/10 px-4 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {/* Upload tile — first cell so it's discoverable
                even when the library is empty. */}
            <UploadTile uploading={uploading} onPick={uploadFile} />

            {visible.map((a) => (
              <AssetTile
                key={a.sha256}
                asset={a}
                selected={selectedSha === a.sha256}
                deleting={deletingSha === a.sha256}
                onSelect={() => setSelectedSha(a.sha256)}
                onDelete={() => deleteAsset(a.sha256)}
              />
            ))}
          </div>

          {!loading && assets.length === 0 && (
            <p className="mt-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.media.empty")}
            </p>
          )}
          {!loading && assets.length > 0 && visible.length === 0 && (
            <p className="mt-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.media.no_match")}
            </p>
          )}
          {loading && (
            <p className="mt-6 text-center text-xs italic text-text-tertiary">
              {t("marketing.media.loading")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-text-secondary">
            {selectedSha
              ? t("marketing.media.selected", {
                  size: formatBytes(
                    assets.find((a) => a.sha256 === selectedSha)?.size_bytes ??
                      0,
                  ),
                })
              : t("marketing.media.no_selection")}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("marketing.media.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={pick}
              disabled={!selectedSha}
            >
              {t("marketing.media.use")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Tiles ────────────────────────────────────────────────────

function UploadTile({
  uploading,
  onPick,
}: {
  uploading: boolean;
  onPick: (file: File) => Promise<void>;
}) {
  const t = useT();
  const inputId = `media-upload-${Math.random().toString(36).slice(2)}`;
  return (
    <label
      htmlFor={inputId}
      className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed bg-panel-alt text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary ${
        uploading ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <UploadIcon size={20} />
      <span>{uploading ? t("marketing.media.uploading") : t("marketing.media.upload")}</span>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onPick(f);
        }}
      />
    </label>
  );
}

function AssetTile({
  asset,
  selected,
  deleting,
  onSelect,
  onDelete,
}: {
  asset: LibraryAsset;
  selected: boolean;
  deleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative aspect-square cursor-pointer overflow-hidden rounded border-2 transition-all ${
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/50"
      } ${deleting ? "opacity-40" : ""}`}
      onClick={onSelect}
    >
      {/* Preview — mail-client behaviour expects HTTPS GET so
          the same URL the email uses works here. */}
      {asset.url && (
        <img
          src={asset.url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
      {/* Hover overlay with delete + meta. Hidden when not
          hovered to keep the grid uncluttered. */}
      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="delete"
          className="m-1 self-end rounded bg-black/60 p-1 text-white hover:bg-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
        >
          {deleting ? <X size={14} /> : <Trash2 size={14} />}
        </button>
        <span className="px-1 pb-1 text-[10px] text-white">
          {asset.mime.replace("image/", "")} · {formatBytes(asset.size_bytes)}
        </span>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

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
