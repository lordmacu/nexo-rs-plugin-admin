// Generic modal overlay — fixed backdrop + centered card +
// close button. Replaces the bespoke modal frames in
// LabelManagerModal, SearchHistoryModal, JsonEditorModal,
// and the marketing wizard.

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  /** Optional title rendered in a slim header bar above the
   *  body. Skipping it leaves the body flush — useful for
   *  pixel-perfect contents like the wizard stepper. */
  title?: string;
  /** Width preset — `md` (560px) is the default for forms;
   *  `lg` (720px) for tabular content; `sm` (380px) for
   *  confirmations / single-input prompts. */
  size?: "sm" | "md" | "lg";
  /** Hides the close button when set — useful when the body
   *  owns its own close button OR when the modal is forced
   *  (e.g. a blocking error). */
  hideClose?: boolean;
  /** Fires when the operator clicks the close button, presses
   *  Escape, OR clicks the backdrop (default true). */
  onClose: () => void;
  /** Set false on flows that shouldn't auto-dismiss on
   *  backdrop click (multi-step wizards, destructive
   *  confirmations). Default true — matches OS / web modal
   *  conventions. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export default function Modal({
  title,
  size = "md",
  hideClose,
  onClose,
  dismissOnBackdrop = true,
  children,
}: ModalProps) {
  // Esc closes — matches platform muscle memory + the
  // existing operator-tooling pattern in CmdK.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      // Backdrop click dismisses (when allowed) — matches
      // every other modal on the planet. The card itself
      // stops propagation so clicks INSIDE the card don't
      // accidentally bubble up + close.
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      data-testid="modal-overlay"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        // `max-h-[90vh]` + `flex flex-col` so the card never
        // grows past the viewport. The body scrolls
        // internally; the title (if any) stays pinned.
        // Without these classes long children scrolled the
        // page or got clipped off-screen.
        className={`relative flex max-h-[90vh] w-full ${SIZE_CLASS[size]} flex-col rounded-2xl bg-panel shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded p-1 text-text-meta transition-colors hover:bg-panel-alt hover:text-text-primary"
            aria-label="Cerrar"
            data-testid="modal-close"
          >
            <X size={16} />
          </button>
        )}
        {title && (
          <div className="shrink-0 border-b px-6 py-4">
            <h2
              id="modal-title"
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
          </div>
        )}
        {/* Body scroll container — the title (if present)
            stays pinned via shrink-0 above; everything else
            lives in this overflow-y-auto pane. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
