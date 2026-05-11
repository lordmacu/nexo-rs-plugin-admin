// Phase 90 audit fix — shared dialog-close hook for the
// non-`<dialog>` modal pattern (CreateSnapshot, RestoreSnapshot,
// RestartPlugin, TenantCreate). Adds Escape-key + backdrop-click
// close handlers so operators get the standard a11y / WHATWG
// dialog dismissal behaviour without each modal hand-rolling
// its own keydown listener.

import { useCallback, useEffect } from "react";

interface UseDialogCloseOptions {
  /** Triggered on Escape OR backdrop click. Wire to the modal's
   *  `onClose` (or `handleDoneClose` for post-action dialogs). */
  onClose: () => void;
  /** When true, both Escape and backdrop-click are no-ops. Wire
   *  to the modal's in-flight flag so an operator can't dismiss
   *  during a destructive RPC. */
  disabled?: boolean;
}

/** Subscribe a global Escape listener while the modal is mounted.
 *  The listener is removed on unmount. Multiple stacked dialogs
 *  each get their own listener; the topmost active call's
 *  `onClose` runs (browser dispatch order: inner-most listener
 *  first), so callers should `e.stopPropagation()` if they need
 *  to override that order — none of today's modals stack. */
export function useEscapeKey(options: UseDialogCloseOptions): void {
  const { onClose, disabled = false } = options;
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, disabled]);
}

/** Build a backdrop click handler that calls `onClose` only when
 *  the click target IS the backdrop element (not a descendant).
 *  Returns a stable callback so the backdrop's `onClick` prop
 *  doesn't churn on every render. */
export function useBackdropClose(
  options: UseDialogCloseOptions,
): (e: React.MouseEvent<HTMLDivElement>) => void {
  const { onClose, disabled = false } = options;
  return useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      // Only fire when the click is on the backdrop itself —
      // otherwise an operator clicking inside the modal panel
      // would dismiss it accidentally.
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose, disabled],
  );
}
