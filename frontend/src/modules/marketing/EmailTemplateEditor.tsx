// Email template builder — Elementor-lite for emails.
//
// Layout:
//   ┌─ name + save/cancel ─────────────────────────────────┐
//   │ ┌─ blocks ─┬─ canvas ─────┬─ properties ───┐         │
//   │ │ +Heading │  Block 1 ↑↓✕ │  selected:     │         │
//   │ │ +Paragr  │  Block 2 ↑↓✕ │  text [tiptap] │         │
//   │ │ +Button  │  ...         │  color [pick]  │         │
//   │ │ ...      │              │  align [radio] │         │
//   │ └──────────┴──────────────┴────────────────┘         │
//   ├─ live preview (server-rendered HTML in iframe) ──────┤
//   └──────────────────────────────────────────────────────┘
//
// Live preview uses the server-side render endpoint so the
// rendered HTML matches what recipients will get exactly
// (sanitizer, table layout, inline CSS). Debounced 400ms
// per change to avoid thundering the server while the
// operator types.

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Monitor,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  createEmailTemplate,
  getEmailTemplate,
  previewEmailTemplate,
  updateEmailTemplate,
  type EmailBlock,
  type TextAlign,
} from "../../api/emailTemplates";
import MediaLibraryModal from "./MediaLibraryModal";
import BlockPickerModal from "./BlockPickerModal";
import { HttpError } from "../../api/client";
import {
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "../../components/ui";
import RichTextEditor from "../../components/RichTextEditor";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

// Sample vars used in preview so {{name}} etc. show real-ish
// content. Replaced by recipient values when the template is
// applied during compose.
const PREVIEW_VARS: Record<string, string> = {
  "recipient.name": "Camila",
  "recipient.email": "camila@empresa.com",
  "seller.name": "Pedro García",
  "seller.email": "pedro@miempresa.com",
  "lead.subject": "Cotización CRM",
};

const NEW_TEMPLATE_ID = "__new__";

/**
 * Compose-mode plumbing — when supplied, the editor swaps its
 * "Save template" header for a "Send email" footer + a caller-
 * provided JSX block for compose-specific fields (To, Subject,
 * Seller, …). Hides the name input + persistence flow entirely.
 */
export interface ComposeMode {
  /** Inline JSX rendered ABOVE the 3-column builder. Compose
   *  fields like To/Subject/Seller live here. */
  composeFields: React.ReactNode;
  /** What the bottom "Send" button label says. */
  sendLabel: string;
  /** Disable the button (in-flight). */
  sendBusy: boolean;
  /** Fired when the operator clicks send. The current `blocks`
   *  state is passed so the parent can POST to compose/send. */
  onSend: (blocks: EmailBlock[]) => Promise<void>;
  /** Initial blocks the editor starts with — used by the
   *  "load template" dropdown to pre-populate. Empty array =
   *  blank canvas. */
  initialBlocks?: EmailBlock[];
  /** Re-seed token: when this string changes, the editor
   *  re-applies `initialBlocks` (used by template-loading
   *  dropdowns to "load this template now"). */
  reseedKey?: string;
  /** Bottom "Cancel" / "Back" button label. */
  backLabel: string;
  /** Fired when the operator clicks cancel/back. */
  onBack: () => void;
  /** Optional inline error/hint above the send button. */
  externalError?: string | null;
  /** Optional "Save draft" button — when supplied, renders
   *  next to Cancel in the footer. Receives the current
   *  blocks so the parent can persist them to the compose-
   *  draft store. */
  onSaveDraft?: (blocks: EmailBlock[]) => Promise<void>;
  /** Disable the save-draft button (in-flight). */
  saveDraftBusy?: boolean;
  /** Optional save indicator label rendered next to the
   *  button (e.g. "Guardado · 14:32"). */
  saveDraftHint?: string | null;
}

export interface EmailTemplateEditorProps {
  /** When set, the editor renders in compose mode (no name,
   *  no template persistence; send/back instead of save/cancel).
   *  Default = template-edit mode (the legacy behaviour). */
  composeMode?: ComposeMode;
}

export default function EmailTemplateEditor({
  composeMode,
}: EmailTemplateEditorProps = {}) {
  const t = useT();
  const navigate = useNavigate();
  const { template_id: templateIdParam } = useParams<{ template_id: string }>();
  const isNew = !templateIdParam || templateIdParam === NEW_TEMPLATE_ID;

  const [name, setName] = useState("");
  const [pageBackground, setPageBackground] = useState<string | null>(null);
  // Optional page-level background image URL — combines with
  // pageBackground (image stacks on top, colour fallback when
  // the recipient blocks remote images). `http(s)://` only;
  // backend `sanitize_url` rejects everything else at render.
  const [pageBackgroundImage, setPageBackgroundImage] = useState<string | null>(
    null,
  );
  const [blocks, setBlocks] = useState<EmailBlock[]>(composeMode?.initialBlocks ?? []);
  // Stable per-row IDs for @dnd-kit. Block content has no
  // intrinsic id; we keep a parallel array of strings the same
  // length as `blocks` and synthesise a fresh id on every
  // create / load. Keeping this as state (not derived) means
  // reorder doesn't shuffle React keys.
  const [blockIds, setBlockIds] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(!isNew && !composeMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Skip the drag if the user only clicked (no movement) —
      // `onSelect` should still fire normally.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Hydrate existing template on mount (template-edit mode
  // only — compose mode never fetches because there's no
  // saved row to load).
  useEffect(() => {
    if (composeMode) return;
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await getEmailTemplate(templateIdParam!);
        if (cancelled) return;
        setName(r.template.name);
        setPageBackground(r.template.page_background ?? null);
        setPageBackgroundImage(r.template.page_background_image ?? null);
        setBlocks(r.template.blocks);
        setBlockIds(r.template.blocks.map(() => freshId()));
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, templateIdParam, composeMode]);

  // Compose mode: re-seed blocks when the parent flips
  // `reseedKey` (e.g. operator picked a different template
  // from the dropdown). Distinct from `initialBlocks` because
  // a fresh prop value alone won't re-fire the initial state
  // setter.
  const reseedKey = composeMode?.reseedKey;
  const initialBlocks = composeMode?.initialBlocks;
  useEffect(() => {
    if (!composeMode || reseedKey === undefined) return;
    setBlocks(initialBlocks ?? []);
    setBlockIds((initialBlocks ?? []).map(() => freshId()));
    setSelectedIdx(null);
    // Intentionally only re-fire on reseedKey — initialBlocks
    // identity changes on every render and would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reseedKey]);

  // Live server-side preview, debounced.
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const r = await previewEmailTemplate(
          blocks,
          PREVIEW_VARS,
          pageBackground,
          pageBackgroundImage,
        );
        if (!cancelled) setPreviewHtml(r.html);
      } catch (e) {
        if (!cancelled) {
          setPreviewHtml(`<p style="color:red">Preview error: ${formatErr(e)}</p>`);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [blocks, pageBackground, pageBackgroundImage]);

  const addBlock = useCallback((b: EmailBlock) => {
    setBlocks((prev) => {
      const next = [...prev, b];
      setSelectedIdx(next.length - 1);
      return next;
    });
    setBlockIds((prev) => [...prev, freshId()]);
  }, []);

  const updateBlock = useCallback((idx: number, mutator: (b: EmailBlock) => EmailBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? mutator(b) : b)));
  }, []);

  const removeBlock = useCallback((idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    setBlockIds((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((prev) => (prev === idx ? null : prev));
  }, []);

  const moveBlock = useCallback((idx: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
    setBlockIds((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
    setSelectedIdx((prev) => (prev === idx ? prev + dir : prev));
  }, []);

  // DragOverlay was for the library-tile floating ghost;
  // library is gone now. We still keep onDragStart as a
  // no-op so the DnD context contract stays stable for
  // future row-reorder work.
  const onDragStart = useCallback((_event: DragStartEvent) => {
    // no-op
  }, []);

  /// Drag end → row-reorder only. The library-drop branch
  /// is gone; rows are now created via the "+ Agregar fila"
  /// button at the canvas footer.
  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    const activeStr = String(active.id);
    const overStr = String(over.id);
    setBlockIds((prev) => {
      const fromIdx = prev.indexOf(activeStr);
      const toIdx = prev.indexOf(overStr);
      if (fromIdx === -1 || toIdx === -1) return prev;
      setBlocks((b) => arrayMove(b, fromIdx, toIdx));
      setSelectedIdx((sel) => {
        if (sel === null) return sel;
        if (sel === fromIdx) return toIdx;
        if (fromIdx < sel && sel <= toIdx) return sel - 1;
        if (toIdx <= sel && sel < fromIdx) return sel + 1;
        return sel;
      });
      return arrayMove(prev, fromIdx, toIdx);
    });
  }, []);

  async function save() {
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    setSaving(true);
    setError(null);
    setHint(null);
    try {
      if (isNew) {
        const r = await createEmailTemplate({
          name: name.trim(),
          blocks,
          ...(pageBackground ? { page_background: pageBackground } : {}),
          ...(pageBackgroundImage
            ? { page_background_image: pageBackgroundImage }
            : {}),
        });
        navigate(
          `/m/marketing/settings/email-templates/${encodeURIComponent(r.template.id)}`,
        );
      } else {
        await updateEmailTemplate(templateIdParam!, {
          name: name.trim(),
          blocks,
          ...(pageBackground ? { page_background: pageBackground } : {}),
          ...(pageBackgroundImage
            ? { page_background_image: pageBackgroundImage }
            : {}),
        });
        setHint(t("marketing.email_templates.editor.save_ok"));
      }
    } catch (e) {
      setError(t("marketing.email_templates.editor.save_failed", { message: formatErr(e) }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Header swap — template-edit shows name + Cancel/Save;
          compose mode renders the parent's compose fields
          (To/Subject/Seller/…) instead. */}
      {composeMode ? (
        composeMode.composeFields
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs">
            <span className="block text-text-secondary">
              {t("marketing.email_templates.field.name")}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("marketing.email_templates.field.name_placeholder")}
            />
          </label>
          {/* Page background — applies to the email's outer
              wrapper. Recipients see this (not just the editor
              preview). Colour empty = default #f5f5f5; image
              empty = colour-only. */}
          <label className="text-xs">
            <span className="block text-text-secondary">
              {t("marketing.email_templates.field.page_background")}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={pageBackground ?? "#f5f5f5"}
                onChange={(e) => setPageBackground(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border bg-panel"
                aria-label="page background"
              />
              {pageBackground && (
                <button
                  type="button"
                  onClick={() => setPageBackground(null)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-text-secondary hover:bg-panel-hover"
                  title={t("marketing.email_templates.row.clear_background")}
                >
                  ×
                </button>
              )}
              <input
                type="url"
                value={pageBackgroundImage ?? ""}
                onChange={(e) =>
                  setPageBackgroundImage(e.target.value.trim() || null)
                }
                placeholder={t(
                  "marketing.email_templates.field.page_background_image_placeholder",
                )}
                className="h-9 flex-1 min-w-0 rounded border bg-panel px-2 text-xs"
                aria-label="page background image"
              />
              {pageBackgroundImage && (
                <button
                  type="button"
                  onClick={() => setPageBackgroundImage(null)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-text-secondary hover:bg-panel-hover"
                  title={t("marketing.email_templates.row.clear_background")}
                >
                  ×
                </button>
              )}
            </div>
          </label>
          {/* Buttons stay on one row even when the parent stacks
              (sm:flex-row above). */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/m/marketing/settings/email-templates")}
              disabled={saving}
            >
              {t("marketing.email_templates.editor.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={save}
              disabled={saving || !name.trim()}
              busy={saving}
            >
              {t("marketing.email_templates.editor.save")}
            </Button>
          </div>
        </div>
      )}

      {(error || hint || composeMode?.externalError) && (
        <div
          className={`rounded border px-3 py-2 text-xs ${
            error || composeMode?.externalError
              ? "border-danger bg-danger/10 text-danger"
              : "border-success bg-success/10 text-success"
          }`}
        >
          {composeMode?.externalError ?? error ?? hint}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Two-column layout now: canvas dominant + properties.
            Library left-pane is gone — element types surface
            on demand via BlockPickerModal when the operator
            clicks "+ Elemento" inside a column. Top-level
            "+ Agregar fila" only adds Rows (the only top-
            level block kind in the new model). */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Canvas — Row-only, click-to-select. Sortable
              context still wraps so future row-reorder DnD
              keeps working without re-plumbing. */}
          <div className="rounded border bg-panel overflow-hidden md:col-span-8">
            <div className="border-b px-3 py-2 text-xs font-semibold text-text-primary">
              {t("marketing.email_templates.editor.canvas")}
            </div>
            <DroppableCanvas
              blocks={blocks}
              blockIds={blockIds}
              selectedIdx={selectedIdx}
              setSelectedIdx={setSelectedIdx}
              onMoveBlock={moveBlock}
              onRemoveBlock={removeBlock}
              onUpdateBlock={(idx, next) => updateBlock(idx, () => next)}
            />
            {/* Top-level + button — adds a fresh Row directly
                (Row is the only top-level kind, so no picker
                modal needed here). */}
            <div className="border-t bg-panel-alt p-3">
              <button
                type="button"
                onClick={() => addBlock(defaultRow())}
                className="w-full rounded-lg border-2 border-dashed border-border bg-panel py-3 text-sm font-medium text-text-secondary transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                {t("marketing.email_templates.canvas.add_row")}
              </button>
            </div>
          </div>

          {/* Properties */}
          <div className="rounded border bg-panel overflow-hidden md:col-span-4">
            <div className="border-b px-3 py-2 text-xs font-semibold text-text-primary">
              {t("marketing.email_templates.editor.properties")}
            </div>
            {selectedIdx === null || !blocks[selectedIdx] ? (
              <p className="px-3 py-6 text-center text-xs italic text-text-tertiary">
                {t("marketing.email_templates.editor.no_selection")}
              </p>
            ) : (
              <PropertyPanel
                block={blocks[selectedIdx]!}
                onChange={(b) => updateBlock(selectedIdx, () => b)}
              />
            )}
          </div>
        </div>
      </DndContext>

      {/* Preview */}
      <div className="rounded border bg-panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold text-text-primary">
            {t("marketing.email_templates.editor.preview")}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={previewMode === "desktop" ? "primary" : "secondary"}
              size="sm"
              leadingIcon={<Monitor size={12} />}
              onClick={() => setPreviewMode("desktop")}
            >
              {t("marketing.email_templates.editor.preview_desktop")}
            </Button>
            <Button
              type="button"
              variant={previewMode === "mobile" ? "primary" : "secondary"}
              size="sm"
              leadingIcon={<Smartphone size={12} />}
              onClick={() => setPreviewMode("mobile")}
            >
              {t("marketing.email_templates.editor.preview_mobile")}
            </Button>
          </div>
        </div>
        <div className="flex justify-center bg-slate-100 p-4">
          {/* `maxWidth:100%` so the desktop preset (640px) shrinks
              into narrow viewports instead of horizontal-scrolling
              the whole editor; the iframe's own viewport meta
              keeps the email render readable when scaled. */}
          <iframe
            title="email-preview"
            className="h-[480px] rounded border bg-white transition-[width] duration-200"
            style={{
              width: previewMode === "mobile" ? 375 : 640,
              maxWidth: "100%",
            }}
            srcDoc={forceLightPreview(previewHtml)}
            sandbox=""
          />
        </div>
      </div>

      {/* Compose-mode footer — back + (optional save draft) +
          send. Hidden in template-edit mode (the top-right
          Save button covers persistence there). */}
      {composeMode && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {composeMode.saveDraftHint && (
            <span className="text-[11px] text-text-tertiary sm:mr-auto">
              {composeMode.saveDraftHint}
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={composeMode.onBack}
            disabled={composeMode.sendBusy}
          >
            {composeMode.backLabel}
          </Button>
          {composeMode.onSaveDraft && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => composeMode.onSaveDraft!(blocks)}
              disabled={composeMode.sendBusy || composeMode.saveDraftBusy}
              busy={composeMode.saveDraftBusy}
            >
              {t("marketing.compose.save_draft")}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={() => composeMode.onSend(blocks)}
            disabled={composeMode.sendBusy || blocks.length === 0}
            busy={composeMode.sendBusy}
          >
            {composeMode.sendLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// `LIBRARY_FACTORIES` / `LIBRARY_LABEL_KEYS` / `libraryLabel`
// were the registry the left-side library panel + the
// drag-from-library DnD path keyed off. Both gone now —
// element add flows through `BlockPickerModal` and rows are
// added via the canvas footer's "+ Agregar fila" button.
// `CANVAS_DROPPABLE_ID` is kept because the SortableContext
// inside `DroppableCanvas` still references it for row
// reorder.
const CANVAS_DROPPABLE_ID = "canvas-droppable";

// ── Droppable canvas ─────────────────────────────────────────────
//
// Wraps the sortable list in a useDroppable so the library
// items can drop into an empty canvas (where there's no row to
// hover). Existing rows still register their own droppable
// targets via useSortable, so dropping precisely on a row
// inserts above that row instead of at the end.

function DroppableCanvas(props: {
  blocks: EmailBlock[];
  blockIds: string[];
  selectedIdx: number | null;
  setSelectedIdx: (idx: number) => void;
  onMoveBlock: (idx: number, dir: -1 | 1) => void;
  onRemoveBlock: (idx: number) => void;
  /** Replace the block at `idx` with `next`. CanvasRow uses
   *  this to commit column-level mutations (e.g. operator
   *  added an element via the in-canvas "+ Elemento" button). */
  onUpdateBlock: (idx: number, next: EmailBlock) => void;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] transition-colors ${isOver ? "bg-accent-soft/40" : ""}`}
    >
      {props.blocks.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs italic text-text-tertiary">
          {t("marketing.email_templates.editor.empty_canvas")}
        </p>
      ) : (
        <SortableContext
          items={props.blockIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1 p-2">
            {props.blocks.map((b, idx) => {
              const id = props.blockIds[idx]!;
              const rowProps = {
                id,
                block: b,
                selected: props.selectedIdx === idx,
                onSelect: () => props.setSelectedIdx(idx),
                onDelete: () => props.onRemoveBlock(idx),
                onUpdateBlock: (next: EmailBlock) =>
                  props.onUpdateBlock(idx, next),
                ...(idx > 0
                  ? { onMoveUp: () => props.onMoveBlock(idx, -1) }
                  : {}),
                ...(idx < props.blocks.length - 1
                  ? { onMoveDown: () => props.onMoveBlock(idx, 1) }
                  : {}),
              };
              return <CanvasRow key={id} {...rowProps} />;
            })}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}

// ── Canvas row ───────────────────────────────────────────────────

function CanvasRow(props: {
  id: string;
  block: EmailBlock;
  selected: boolean;
  onSelect: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  /** Used by Row blocks: when the operator clicks "+
   *  Elemento" in a column we mutate the column's blocks
   *  array via the parent's full-block update path. */
  onUpdateBlock?: (next: EmailBlock) => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  // Narrowed type — TS doesn't preserve narrowing across
  // the JSX boundary so we capture the discriminated union
  // refinement in a const before rendering.
  const rowBlock =
    props.block.kind === "row" ? props.block : null;
  // Row blocks render with their actual visual layout
  // (columns side-by-side at their width_pct) so the canvas
  // looks like the email taking shape, Elementor-style.
  // Non-row blocks fall back to the compact summary chip
  // (legacy two_column gets migrated to row by the backend
  // on read so we rarely see those here).
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group rounded border transition-colors ${
        props.selected ? "border-accent bg-accent-soft" : "hover:bg-panel-hover"
      } ${isDragging ? "z-10 shadow-lg" : ""}`}
      onClick={props.onSelect}
    >
      {/* Top toolbar with drag handle + row controls. */}
      <div className="flex items-center gap-1 border-b bg-panel-alt/50 px-2 py-1 text-[11px]">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-0.5 text-text-meta hover:bg-panel-hover hover:text-text-primary active:cursor-grabbing"
          title="Arrastra para reordenar"
          aria-label="Drag handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </button>
        <span className="flex-1 truncate text-text-secondary">
          {rowBlock
            ? `${rowBlock.columns.length} col · ${rowBlock.columns.map((c) => c.width_pct).join("/")}%`
            : describeBlock(props.block)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onMoveUp?.();
          }}
          disabled={!props.onMoveUp}
          title={t("marketing.email_templates.editor.move_up")}
          className="rounded p-0.5 text-text-secondary hover:bg-panel-hover disabled:opacity-30"
        >
          <ArrowUp size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onMoveDown?.();
          }}
          disabled={!props.onMoveDown}
          title={t("marketing.email_templates.editor.move_down")}
          className="rounded p-0.5 text-text-secondary hover:bg-panel-hover disabled:opacity-30"
        >
          <ArrowDown size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
          }}
          title={t("marketing.email_templates.editor.delete")}
          className="rounded p-0.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Body: row → visual columns; non-row → compact text. */}
      {rowBlock && props.onUpdateBlock ? (
        <CanvasRowBody
          row={rowBlock}
          onUpdate={props.onUpdateBlock}
        />
      ) : !rowBlock ? (
        <div className="px-2 py-2 text-xs">{describeBlock(props.block)}</div>
      ) : null}
    </li>
  );
}

/** Renders the columns of a Row side-by-side at their actual
 *  `width_pct` proportions. Each column shows its elements as
 *  compact chips and a "+ Elemento" button that opens the
 *  block picker modal scoped to that specific column. */
function CanvasRowBody(props: {
  row: Extract<EmailBlock, { kind: "row" }>;
  onUpdate: (next: EmailBlock) => void;
}) {
  const t = useT();
  const [pickerColIdx, setPickerColIdx] = useState<number | null>(null);
  // Editing path → which column + which element index is in
  // the NestedBlockEditModal. `null` = no edit modal open.
  const [editingPath, setEditingPath] = useState<
    { col: number; idx: number } | null
  >(null);

  function addToColumn(colIdx: number, b: EmailBlock) {
    const newIdx = props.row.columns[colIdx]?.blocks.length ?? 0;
    const next: Extract<EmailBlock, { kind: "row" }> = {
      ...props.row,
      columns: props.row.columns.map((c, i) =>
        i === colIdx ? { ...c, blocks: [...c.blocks, b] } : c,
      ),
    };
    props.onUpdate(next);
    // Auto-open the edit modal on the freshly-inserted
    // element so the operator immediately fills it in
    // without hunting for the property panel.
    setEditingPath({ col: colIdx, idx: newIdx });
  }

  function updateElement(
    colIdx: number,
    idx: number,
    next: EmailBlock,
  ) {
    const updated: Extract<EmailBlock, { kind: "row" }> = {
      ...props.row,
      columns: props.row.columns.map((c, ci) =>
        ci === colIdx
          ? { ...c, blocks: c.blocks.map((b, bi) => (bi === idx ? next : b)) }
          : c,
      ),
    };
    props.onUpdate(updated);
  }

  function removeElement(colIdx: number, idx: number) {
    const updated: Extract<EmailBlock, { kind: "row" }> = {
      ...props.row,
      columns: props.row.columns.map((c, ci) =>
        ci === colIdx
          ? { ...c, blocks: c.blocks.filter((_, bi) => bi !== idx) }
          : c,
      ),
    };
    props.onUpdate(updated);
  }

  const editingBlock =
    editingPath !== null
      ? props.row.columns[editingPath.col]?.blocks[editingPath.idx] ?? null
      : null;

  return (
    <>
      <div
        className="flex gap-1 p-1.5"
        // Row background mirrors the email render so the
        // operator sees the section styling live in the canvas
        // (colour AND image — same shorthand we emit on the
        // server-side `<td>`).
        style={{
          ...(props.row.background ? { backgroundColor: props.row.background } : {}),
          ...(props.row.background_image
            ? {
                backgroundImage: `url("${props.row.background_image}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : {}),
        }}
      >
        {props.row.columns.map((col, colIdx) => (
          <div
            key={colIdx}
            // Width follows the operator's column proportion.
            // `min-w-0` lets the flex item shrink past its
            // intrinsic content width — without it, a column
            // with a long heading would refuse to honour the
            // 25% width.
            style={{
              width: `${col.width_pct}%`,
              ...(col.background ? { backgroundColor: col.background } : {}),
              ...(col.background_image
                ? {
                    backgroundImage: `url("${col.background_image}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
                : {}),
            }}
            className="min-w-0 rounded border border-dashed border-border bg-panel/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b bg-panel-alt/50 px-1.5 py-0.5 text-[10px] text-text-tertiary">
              {col.width_pct}%
            </div>
            <div className="space-y-1 p-1.5">
              {col.blocks.length === 0 ? (
                <p className="py-2 text-center text-[10px] italic text-text-tertiary">
                  {t("marketing.email_templates.canvas.col_empty")}
                </p>
              ) : (
                col.blocks.map((b, idx) => (
                  <ElementChip
                    key={idx}
                    block={b}
                    onEdit={() => setEditingPath({ col: colIdx, idx })}
                    onRemove={() => removeElement(colIdx, idx)}
                  />
                ))
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerColIdx(colIdx);
                }}
                className="w-full rounded border border-dashed border-border bg-panel py-1 text-[10px] text-text-secondary hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                + {t("marketing.email_templates.picker.title")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <BlockPickerModal
        open={pickerColIdx !== null}
        onClose={() => setPickerColIdx(null)}
        onPick={(b) => {
          if (pickerColIdx !== null) addToColumn(pickerColIdx, b);
        }}
      />

      {editingBlock && editingPath !== null && (
        <NestedBlockEditModal
          block={editingBlock}
          onClose={() => setEditingPath(null)}
          onChange={(next) => {
            if (editingPath !== null) {
              updateElement(editingPath.col, editingPath.idx, next);
            }
          }}
        />
      )}
    </>
  );
}

/** One element chip in a canvas Row's column. Click anywhere
 *  on the chip OR the explicit pencil icon to edit; trash
 *  icon to remove. Without the explicit icons the operator
 *  had to guess the chip was clickable — the title attribute
 *  was poor signposting. */
function ElementChip(props: {
  block: EmailBlock;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <div
      onClick={props.onEdit}
      className="group flex cursor-pointer items-center gap-1 rounded bg-panel-alt px-1.5 py-1 text-[11px] hover:bg-panel-hover"
      title={describeBlock(props.block)}
    >
      <span className="flex-1 truncate">{describeBlock(props.block)}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onEdit();
        }}
        className="rounded p-0.5 text-text-tertiary opacity-0 transition-opacity hover:bg-panel hover:text-primary group-hover:opacity-100"
        title={t("marketing.email_templates.editor.edit") }
        aria-label="edit"
      >
        <Pencil size={10} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onRemove();
        }}
        className="rounded p-0.5 text-text-tertiary opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        title={t("marketing.email_templates.editor.delete")}
        aria-label="delete"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

function describeBlock(b: EmailBlock): string {
  switch (b.kind) {
    case "heading":
      return `H${b.level} · ${b.text || stripHtml(b.text_html ?? "") || "—"}`;
    case "paragraph": {
      const preview = b.text || stripHtml(b.text_html ?? "");
      return `¶ ${preview.slice(0, 60)}`;
    }
    case "button":
      return `[Botón] ${b.text}`;
    case "image":
      return `[Imagen] ${b.alt || b.url}`;
    case "divider":
      return `── Separador`;
    case "spacer":
      return `(espacio ${b.height_px}px)`;
    case "two_column":
      return `[Dos columnas] (${b.left.length} | ${b.right.length})`;
    case "row": {
      const widths = b.columns.map((c) => c.width_pct).join("/");
      const total = b.columns.reduce((acc, c) => acc + c.blocks.length, 0);
      return `[Fila ${widths}%] ${total} elemento${total === 1 ? "" : "s"}`;
    }
    case "list":
      return `[Lista${b.ordered ? " numerada" : ""}] ${b.items.length} ítems`;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ── Property panel ───────────────────────────────────────────────

function PropertyPanel(props: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const t = useT();
  const { block, onChange } = props;
  switch (block.kind) {
    case "heading":
      return (
        <div className="space-y-2 px-3 py-3">
          <Field labelKey="marketing.email_templates.prop.text">
            <RichTextEditor
              value={block.text_html ?? ""}
              onChange={(html) => onChange({ ...block, text_html: html, text: stripHtml(html) })}
              minHeight={80}
            />
          </Field>
          <Field labelKey="marketing.email_templates.prop.level">
            <Select
              value={String(block.level)}
              onChange={(e) => onChange({ ...block, level: Number(e.target.value) })}
            >
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </Select>
          </Field>
          <ColorField labelKey="marketing.email_templates.prop.color" value={block.color ?? ""} onChange={(c) => onChange({ ...block, color: c || null })} />
          <AlignField value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </div>
      );
    case "paragraph":
      return (
        <div className="space-y-2 px-3 py-3">
          <Field labelKey="marketing.email_templates.prop.text">
            <RichTextEditor
              value={block.text_html ?? ""}
              onChange={(html) => onChange({ ...block, text_html: html, text: stripHtml(html) })}
              minHeight={120}
            />
          </Field>
          <NumberField labelKey="marketing.email_templates.prop.font_size" value={block.font_size} min={10} max={32} onChange={(n) => onChange({ ...block, font_size: n })} />
          <ColorField labelKey="marketing.email_templates.prop.color" value={block.color ?? ""} onChange={(c) => onChange({ ...block, color: c || null })} />
          <AlignField value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </div>
      );
    case "button":
      return (
        <div className="space-y-2 px-3 py-3">
          <Field labelKey="marketing.email_templates.prop.text">
            <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          </Field>
          <Field labelKey="marketing.email_templates.prop.url">
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://" />
          </Field>
          <ColorField labelKey="marketing.email_templates.prop.bg_color" value={block.bg_color} onChange={(c) => onChange({ ...block, bg_color: c })} />
          <ColorField labelKey="marketing.email_templates.prop.text_color" value={block.text_color} onChange={(c) => onChange({ ...block, text_color: c })} />
          <AlignField value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2 px-3 py-3">
          <Field labelKey="marketing.email_templates.prop.image_url">
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
          </Field>
          {/* Upload sets the URL field directly on success.
              Backend optimises (1200px cap, JPEG q85, EXIF
              stripped) before storing — operators don't need
              to pre-process. */}
          <ImageUploadField
            currentUrl={block.url}
            onUploaded={(url) => onChange({ ...block, url })}
          />
          <Field labelKey="marketing.email_templates.prop.alt">
            <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          </Field>
          <NumberField
            labelKey="marketing.email_templates.prop.width"
            value={block.width ?? 0}
            min={0}
            max={600}
            onChange={(n) => onChange({ ...block, width: n > 0 ? n : null })}
          />
          <Field labelKey="marketing.email_templates.prop.link_url">
            <Input value={block.link_url ?? ""} onChange={(e) => onChange({ ...block, link_url: e.target.value || null })} />
          </Field>
          <AlignField value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
          {/* Embed toggle. URL (default) = recipient fetches
              externally (smaller email, tracking); CID = bytes
              ride inline (heavier email, renders even when the
              client blocks external images). */}
          <Field labelKey="marketing.email_templates.prop.embed">
            <Select
              value={block.embed ?? "url"}
              onChange={(e) =>
                onChange({ ...block, embed: e.target.value as "url" | "cid" })
              }
            >
              <option value="url">{t("marketing.email_templates.embed.url")}</option>
              <option value="cid">{t("marketing.email_templates.embed.cid")}</option>
            </Select>
          </Field>
          <p className="text-[11px] italic text-text-tertiary">
            {block.embed === "cid"
              ? t("marketing.email_templates.embed.cid_help")
              : t("marketing.email_templates.embed.url_help")}
          </p>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-2 px-3 py-3">
          <ColorField labelKey="marketing.email_templates.prop.color" value={block.color} onChange={(c) => onChange({ ...block, color: c })} />
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-2 px-3 py-3">
          <NumberField labelKey="marketing.email_templates.prop.height" value={block.height_px} min={4} max={200} onChange={(n) => onChange({ ...block, height_px: n })} />
        </div>
      );
    case "two_column":
      return (
        <TwoColumnEditor
          block={block}
          onChange={(b) => onChange(b)}
        />
      );
    case "row":
      return (
        <RowEditor
          block={block}
          onChange={(b) => onChange(b)}
        />
      );
    case "list":
      return (
        <div className="space-y-2 px-3 py-3">
          <Field labelKey="marketing.email_templates.prop.items">
            <Textarea
              rows={6}
              value={block.items.join("\n")}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </Field>
          <Checkbox
            checked={block.ordered}
            onChange={(e) => onChange({ ...block, ordered: e.target.checked })}
          >
            {t("marketing.email_templates.prop.ordered")}
          </Checkbox>
          <ColorField labelKey="marketing.email_templates.prop.color" value={block.color ?? ""} onChange={(c) => onChange({ ...block, color: c || null })} />
        </div>
      );
  }
}

function Field(props: { labelKey: CatalogKey; children: React.ReactNode }) {
  const t = useT();
  return (
    <label className="block text-xs">
      <span className="block text-text-secondary">{t(props.labelKey)}</span>
      {props.children}
    </label>
  );
}

/**
 * Image picker beside an Image block's URL field. Opens the
 * WordPress-style media-library modal so the operator can
 * pick from previously-uploaded assets OR upload a new one
 * inside the same flow.
 *
 * The library is the single source of truth: every upload
 * routes through it (the modal is the only entry point), and
 * picking from it just fills the block's URL field with the
 * already-stored asset's public URL — no re-upload, no
 * duplication.
 */
function ImageUploadField(props: {
  currentUrl: string;
  onUploaded: (url: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {t(
          props.currentUrl && !props.currentUrl.startsWith("https://")
            ? "marketing.email_templates.upload.replace"
            : "marketing.email_templates.upload.button",
        )}
      </Button>
      <MediaLibraryModal
        open={open}
        currentUrl={props.currentUrl}
        onPick={(url) => props.onUploaded(url)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function ColorField(props: { labelKey: CatalogKey; value: string; onChange: (v: string) => void }) {
  return (
    <Field labelKey={props.labelKey}>
      <div className="flex gap-2">
        <input
          type="color"
          value={props.value || "#000000"}
          onChange={(e) => props.onChange(e.target.value)}
          className="h-9 w-12 rounded border bg-panel"
        />
        <Input value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder="#rrggbb" />
      </div>
    </Field>
  );
}

/** URL input for a background image — used by page / row /
 *  column background_image fields. Shows the URL textbox + a
 *  small "Library" button that opens the media-library picker
 *  so the operator can browse uploaded assets instead of
 *  pasting a URL. Empty value clears the field (callers store
 *  null in their own state). */
function ImageUrlField(props: {
  labelKey: CatalogKey;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  onPickFromLibrary?: () => void;
}) {
  return (
    <Field labelKey={props.labelKey}>
      <div className="flex gap-2">
        <Input
          type="url"
          value={props.value ?? ""}
          onChange={(e) => props.onChange(e.target.value.trim() || null)}
          placeholder="https://…"
        />
        {props.onPickFromLibrary && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={props.onPickFromLibrary}
            title="Library"
          >
            🖼
          </Button>
        )}
        {props.value && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => props.onChange(null)}
            title="Clear"
          >
            ×
          </Button>
        )}
      </div>
    </Field>
  );
}

function NumberField(props: {
  labelKey: CatalogKey;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field labelKey={props.labelKey}>
      <Input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) props.onChange(n);
        }}
      />
    </Field>
  );
}

function AlignField(props: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  const t = useT();
  return (
    <Field labelKey="marketing.email_templates.prop.align">
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <Button
            key={a}
            type="button"
            variant={props.value === a ? "primary" : "secondary"}
            size="sm"
            onClick={() => props.onChange(a)}
          >
            {t(`marketing.email_templates.prop.align.${a}` as CatalogKey)}
          </Button>
        ))}
      </div>
    </Field>
  );
}

// ── TwoColumn nested editor ──────────────────────────────────────
//
// Sub-builder rendered when a TwoColumn block is selected. Each
// side gets its own mini-library + canvas. Inner blocks open a
// modal showing the standard PropertyPanel for editing.
//
// Constraint: nested TwoColumn forbidden — the property panel's
// library hides the +Two columns button when rendering inside a
// column. Avoids pathological depth + email rendering bugs from
// deeply-nested table layouts.

function TwoColumnEditor(props: {
  block: Extract<EmailBlock, { kind: "two_column" }>;
  onChange: (b: Extract<EmailBlock, { kind: "two_column" }>) => void;
}) {
  const t = useT();
  const [editingSide, setEditingSide] = useState<"left" | "right" | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function updateSide(side: "left" | "right", next: EmailBlock[]) {
    props.onChange({ ...props.block, [side]: next });
  }

  function addToSide(side: "left" | "right", b: EmailBlock) {
    updateSide(side, [...props.block[side], b]);
  }

  function removeFromSide(side: "left" | "right", idx: number) {
    updateSide(
      side,
      props.block[side].filter((_, i) => i !== idx),
    );
  }

  function moveInSide(side: "left" | "right", idx: number, dir: -1 | 1) {
    const arr = props.block[side];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    const next = [...arr];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    updateSide(side, next);
  }

  function updateInSide(
    side: "left" | "right",
    idx: number,
    mutator: (b: EmailBlock) => EmailBlock,
  ) {
    updateSide(
      side,
      props.block[side].map((b, i) => (i === idx ? mutator(b) : b)),
    );
  }

  const editingBlock =
    editingSide && editingIdx !== null
      ? props.block[editingSide][editingIdx] ?? null
      : null;

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs text-text-secondary">
        {t("marketing.email_templates.editor.two_column_help")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ColumnPanel
          label={t("marketing.email_templates.editor.column_left")}
          blocks={props.block.left}
          onAdd={(b) => addToSide("left", b)}
          onRemove={(idx) => removeFromSide("left", idx)}
          onMoveUp={(idx) => moveInSide("left", idx, -1)}
          onMoveDown={(idx) => moveInSide("left", idx, 1)}
          onEdit={(idx) => {
            setEditingSide("left");
            setEditingIdx(idx);
          }}
        />
        <ColumnPanel
          label={t("marketing.email_templates.editor.column_right")}
          blocks={props.block.right}
          onAdd={(b) => addToSide("right", b)}
          onRemove={(idx) => removeFromSide("right", idx)}
          onMoveUp={(idx) => moveInSide("right", idx, -1)}
          onMoveDown={(idx) => moveInSide("right", idx, 1)}
          onEdit={(idx) => {
            setEditingSide("right");
            setEditingIdx(idx);
          }}
        />
      </div>

      {editingBlock && editingSide && editingIdx !== null && (
        <NestedBlockEditModal
          block={editingBlock}
          onClose={() => {
            setEditingSide(null);
            setEditingIdx(null);
          }}
          onChange={(next) => updateInSide(editingSide, editingIdx, () => next)}
        />
      )}
    </div>
  );
}

/**
 * Generalised Elementor-style row editor — N columns whose
 * widths sum to 100. Operator picks a layout preset (1col,
 * 2col 50/50, 3col 33/33/33, 25/75, 75/25) which sets both
 * the column count + their widths in one click. Inside each
 * column a `+ Elemento` picker (NestedAddButton flavour) lets
 * them drop heading / paragraph / button / image / divider /
 * spacer / list elements; the existing NestedBlockEditModal
 * handles per-element editing.
 */
function RowEditor(props: {
  block: Extract<EmailBlock, { kind: "row" }>;
  onChange: (b: Extract<EmailBlock, { kind: "row" }>) => void;
}) {
  const t = useT();
  const [editingPath, setEditingPath] = useState<
    { col: number; idx: number } | null
  >(null);

  // ── Layout presets ────────────────────────────────────────
  // Each preset rewrites the columns array in one click. The
  // operator's existing column contents migrate with the cap
  // — extra columns spawn empty; trimmed ones lose content.
  // We warn on trim by surfacing a confirm() so a misclick
  // doesn't nuke half the row.
  function applyLayout(widths: number[]) {
    const next: import("../../api/emailTemplates").Column[] = widths.map(
      (w, i) => ({
        blocks: props.block.columns[i]?.blocks ?? [],
        width_pct: w,
        // Carry per-column bg styling across a layout change
        // so the operator's customisations don't reset on
        // every preset click.
        background: props.block.columns[i]?.background ?? null,
        background_image: props.block.columns[i]?.background_image ?? null,
      }),
    );
    const dropping = props.block.columns.length - widths.length;
    if (dropping > 0) {
      const lostContent = props.block.columns
        .slice(widths.length)
        .some((c) => c.blocks.length > 0);
      if (lostContent && !confirm(t("marketing.email_templates.row.confirm_trim"))) {
        return;
      }
    }
    props.onChange({ ...props.block, columns: next });
  }

  function updateColumn(
    colIdx: number,
    mutator: (c: import("../../api/emailTemplates").Column) => import("../../api/emailTemplates").Column,
  ) {
    props.onChange({
      ...props.block,
      columns: props.block.columns.map((c, i) =>
        i === colIdx ? mutator(c) : c,
      ),
    });
  }

  function addToColumn(colIdx: number, b: EmailBlock) {
    updateColumn(colIdx, (c) => ({ ...c, blocks: [...c.blocks, b] }));
  }

  function removeFromColumn(colIdx: number, idx: number) {
    updateColumn(colIdx, (c) => ({
      ...c,
      blocks: c.blocks.filter((_, i) => i !== idx),
    }));
  }

  function moveInColumn(colIdx: number, idx: number, dir: -1 | 1) {
    const target = idx + dir;
    updateColumn(colIdx, (c) => {
      if (target < 0 || target >= c.blocks.length) return c;
      const next = [...c.blocks];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return { ...c, blocks: next };
    });
  }

  function setColumnWidth(colIdx: number, w: number) {
    updateColumn(colIdx, (c) => ({ ...c, width_pct: Math.max(5, Math.min(95, w)) }));
  }

  const editingBlock =
    editingPath !== null
      ? props.block.columns[editingPath.col]?.blocks[editingPath.idx] ?? null
      : null;

  // Preset signature for highlighting the "active" preset.
  const sig = props.block.columns.map((c) => c.width_pct).join(",");

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs text-text-secondary">
        {t("marketing.email_templates.row.help")}
      </p>

      {/* Layout presets — one click sets column count + widths. */}
      <div className="space-y-1">
        <span className="block text-[11px] font-semibold text-text-secondary">
          {t("marketing.email_templates.row.layout")}
        </span>
        <div className="flex flex-wrap gap-1">
          {LAYOUT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyLayout(p.widths)}
              className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                sig === p.widths.join(",")
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-panel-alt hover:bg-panel-hover"
              }`}
              title={p.widths.join(" / ") + "%"}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row-level background — paints behind ALL columns. */}
      <ColorField
        labelKey="marketing.email_templates.row.background"
        value={props.block.background ?? ""}
        onChange={(c) =>
          props.onChange({
            ...props.block,
            background: c.trim() ? c : null,
          })
        }
      />
      {/* Row-level background image — combines with the colour
          (image stacks on top, colour fallback when remote
          images blocked). */}
      <ImageUrlField
        labelKey="marketing.email_templates.row.background_image"
        value={props.block.background_image ?? null}
        onChange={(v) =>
          props.onChange({
            ...props.block,
            background_image: v,
          })
        }
      />

      {/* Column panels — vertical stack so each panel breathes
          on the narrow properties pane. The 3-col preset
          shows three stacked columns; that's fine — preview
          shows the actual horizontal layout. */}
      <div className="space-y-3">
        {props.block.columns.map((col, colIdx) => (
          <div
            key={colIdx}
            className="rounded border bg-panel-alt"
          >
            <div className="flex items-center justify-between border-b px-2 py-1">
              <span className="text-[11px] font-semibold text-text-secondary">
                {t("marketing.email_templates.row.column_n", {
                  n: String(colIdx + 1),
                })}
              </span>
              <div className="flex items-center gap-1">
                {/* Per-column background — small color swatch
                    that toggles a native picker. Empty value
                    = transparent (inherits row). */}
                <input
                  type="color"
                  value={col.background ?? "#ffffff"}
                  onChange={(e) =>
                    updateColumn(colIdx, (c) => ({
                      ...c,
                      background: e.target.value,
                    }))
                  }
                  className="h-5 w-5 cursor-pointer rounded border bg-panel"
                  title={t("marketing.email_templates.row.column_background")}
                  aria-label="column background"
                />
                {col.background && (
                  <button
                    type="button"
                    onClick={() =>
                      updateColumn(colIdx, (c) => ({
                        ...c,
                        background: null,
                      }))
                    }
                    className="rounded p-0.5 text-text-tertiary hover:bg-panel-hover"
                    title={t("marketing.email_templates.row.clear_background")}
                  >
                    ×
                  </button>
                )}
                <input
                  type="number"
                  min={5}
                  max={95}
                  value={col.width_pct}
                  onChange={(e) =>
                    setColumnWidth(colIdx, Number(e.target.value) || 0)
                  }
                  className="w-12 rounded border bg-panel px-1 py-0.5 text-[11px]"
                  aria-label="width %"
                />
                <span className="text-[10px] text-text-tertiary">%</span>
              </div>
            </div>
            {/* Per-column background image — second row inside
                the column header strip so the URL textbox has
                breathing room. Empty = no image. */}
            <div className="flex items-center gap-1 border-b px-2 py-1">
              <span className="text-[10px] text-text-tertiary">
                {t("marketing.email_templates.row.column_background_image")}
              </span>
              <input
                type="url"
                value={col.background_image ?? ""}
                onChange={(e) =>
                  updateColumn(colIdx, (c) => ({
                    ...c,
                    background_image: e.target.value.trim() || null,
                  }))
                }
                placeholder="https://…"
                className="h-6 flex-1 min-w-0 rounded border bg-panel px-1 text-[11px]"
                aria-label="column background image"
              />
              {col.background_image && (
                <button
                  type="button"
                  onClick={() =>
                    updateColumn(colIdx, (c) => ({
                      ...c,
                      background_image: null,
                    }))
                  }
                  className="rounded p-0.5 text-text-tertiary hover:bg-panel-hover"
                  title={t("marketing.email_templates.row.clear_background")}
                >
                  ×
                </button>
              )}
            </div>
            <ColumnPanel
              label=""
              blocks={col.blocks}
              onAdd={(b) => addToColumn(colIdx, b)}
              onRemove={(idx) => removeFromColumn(colIdx, idx)}
              onMoveUp={(idx) => moveInColumn(colIdx, idx, -1)}
              onMoveDown={(idx) => moveInColumn(colIdx, idx, 1)}
              onEdit={(idx) =>
                setEditingPath({ col: colIdx, idx })
              }
            />
          </div>
        ))}
      </div>

      {editingBlock && editingPath !== null && (
        <NestedBlockEditModal
          block={editingBlock}
          onClose={() => setEditingPath(null)}
          onChange={(next) =>
            updateColumn(editingPath.col, (c) => ({
              ...c,
              blocks: c.blocks.map((b, i) =>
                i === editingPath.idx ? next : b,
              ),
            }))
          }
        />
      )}
    </div>
  );
}

/** Pre-baked column-layout choices. The widths of each entry
 *  must sum to 100 (the renderer normalises drift but presets
 *  should be exact). Operators pick from these instead of
 *  hand-tuning percentages — covers every common email
 *  layout. */
const LAYOUT_PRESETS: { label: string; widths: number[] }[] = [
  { label: "1 col", widths: [100] },
  { label: "50 / 50", widths: [50, 50] },
  { label: "33 / 67", widths: [33, 67] },
  { label: "67 / 33", widths: [67, 33] },
  { label: "33 / 33 / 33", widths: [34, 33, 33] },
  { label: "25 / 50 / 25", widths: [25, 50, 25] },
  { label: "25 / 25 / 25 / 25", widths: [25, 25, 25, 25] },
];

function ColumnPanel(props: {
  label: string;
  blocks: EmailBlock[];
  onAdd: (b: EmailBlock) => void;
  onRemove: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onEdit: (idx: number) => void;
}) {
  const t = useT();
  return (
    <div className="rounded border bg-panel-alt">
      <div className="border-b px-2 py-1 text-[11px] font-semibold text-text-secondary">
        {props.label}
      </div>
      <ul className="space-y-1 p-2 text-xs">
        {props.blocks.length === 0 && (
          <li className="px-1 italic text-text-tertiary">
            {t("marketing.email_templates.editor.column_empty")}
          </li>
        )}
        {props.blocks.map((b, idx) => (
          <li
            key={idx}
            className="flex items-center gap-1 rounded border bg-panel px-2 py-1"
          >
            <span
              className="flex-1 cursor-pointer truncate hover:underline"
              onClick={() => props.onEdit(idx)}
            >
              {describeBlock(b)}
            </span>
            <button
              type="button"
              onClick={() => props.onMoveUp(idx)}
              disabled={idx === 0}
              className="rounded p-0.5 text-text-secondary hover:bg-panel-hover disabled:opacity-30"
              title={t("marketing.email_templates.editor.move_up")}
            >
              <ArrowUp size={11} />
            </button>
            <button
              type="button"
              onClick={() => props.onMoveDown(idx)}
              disabled={idx === props.blocks.length - 1}
              className="rounded p-0.5 text-text-secondary hover:bg-panel-hover disabled:opacity-30"
              title={t("marketing.email_templates.editor.move_down")}
            >
              <ArrowDown size={11} />
            </button>
            <button
              type="button"
              onClick={() => props.onRemove(idx)}
              className="rounded p-0.5 text-text-secondary hover:bg-danger/10 hover:text-danger"
              title={t("marketing.email_templates.editor.delete")}
            >
              <Trash2 size={11} />
            </button>
          </li>
        ))}
      </ul>
      {/* Single "+ Elemento" button → modal picker. Replaces
          the 7-button grid that used to live here so the
          column reads cleanly even when packed with elements. */}
      <ColumnAddButton onAdd={props.onAdd} />
    </div>
  );
}

/** "+ Elemento" tile that opens BlockPickerModal. Owns its
 *  own open state so the parent ColumnPanel stays
 *  presentational. */
function ColumnAddButton({ onAdd }: { onAdd: (b: EmailBlock) => void }) {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full rounded border-2 border-dashed border-border bg-panel py-2 text-[11px] text-text-secondary transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          + {t("marketing.email_templates.picker.title")}
        </button>
      </div>
      <BlockPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(b) => onAdd(b)}
      />
    </>
  );
}

// `NestedAddButton` removed — element add flows through
// BlockPickerModal now (see ColumnAddButton above).
function NestedBlockEditModal(props: {
  block: EmailBlock;
  onClose: () => void;
  onChange: (next: EmailBlock) => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            {t("marketing.email_templates.editor.edit_inner_block")}
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={props.onClose}
          >
            {t("marketing.email_templates.editor.done")}
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <PropertyPanel block={props.block} onChange={props.onChange} />
        </div>
      </div>
    </div>
  );
}

// `LibraryButton` removed — left-side library panel is gone;
// element creation flows through BlockPickerModal.

// ── Defaults ─────────────────────────────────────────────────────

/// Per-row stable id for @dnd-kit. Block content has no
/// intrinsic id (the renderer doesn't need one); we mint one
/// at construction time and store in a parallel array so a
/// reorder doesn't shuffle React keys + DnD state.
function freshId(): string {
  return `b-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
}

// Element factories (defaultHeading / defaultParagraph /
// defaultButton / defaultImage / defaultDivider /
// defaultSpacer / defaultList / defaultTwoColumn) lived
// here when the editor's library panel built them on click.
// Library is gone now — element creation flows through
// BlockPickerModal which owns its own factories. Only
// `defaultRow` survives because the canvas footer button
// builds rows directly without going through the modal.
function defaultRow(): EmailBlock {
  // Spawns a 1-column row at 100%. Operator picks a layout
  // preset (2-col 50/50, 3-col 33/33/33, etc.) from the
  // Row editor to add columns + adjust widths.
  return {
    kind: "row",
    columns: [{ blocks: [], width_pct: 100, background: null, background_image: null }],
    background: null,
    background_image: null,
  };
}

/// Force the preview iframe to render the email in light
/// scheme regardless of the operator's OS-level dark-mode
/// preference. The renderer emits `<meta name="color-scheme"
/// content="light dark">` + an `@media (prefers-color-scheme:
/// dark)` block so RECIPIENTS in dark mode get a darkened
/// email — but inside the editor iframe that media query
/// fires from the host browser's preference and the operator
/// sees a black preview that doesn't match the surrounding
/// (always-light) editor UI.
///
/// Implementation notes:
///   - Inject just before `</head>` so the CSS rule comes
///     AFTER the renderer's `:root{color-scheme: light dark}`
///     in source order. CSS cascade rule: later wins.
///   - Use `!important` belt-and-suspenders so even if a
///     renderer change reordered things, our override holds.
///   - Force `background:#ffffff !important` on body + the
///     wrapper class because the dark-mode block uses
///     `!important` itself; without our matching `!important`
///     the dark backgrounds would still apply when the host
///     OS triggered the media query — which it can still do
///     for cached docs that hadn't picked up our color-scheme
///     reset yet.
///
/// Recipients are unaffected — they receive the unmodified
/// server output via the send path; the override is preview-
/// only client-side.
function forceLightPreview(html: string): string {
  if (!html) return html;
  const closeHead = html.toLowerCase().indexOf("</head>");
  if (closeHead === -1) return html;
  const inject =
    `<meta name="color-scheme" content="only light"/>` +
    `<style>` +
    // `only light` makes prefers-color-scheme report `light`
    // inside this document → the renderer's
    // @media (prefers-color-scheme: dark) never matches in
    // the preview iframe even when the operator's OS is in
    // dark mode. The page background itself comes from the
    // operator-set page_background (now a per-template
    // field) — we no longer hardcode it here.
    `:root{color-scheme:only light !important}` +
    `</style>`;
  return html.slice(0, closeHead) + inject + html.slice(closeHead);
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
