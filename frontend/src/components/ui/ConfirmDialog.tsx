// ConfirmDialog — modal asking the operator to confirm a
// destructive or irreversible action (delete, rotate
// credentials, terminate session, …). Replaces the bespoke
// confirm-modal scaffolding in Agents.tsx + ChatListItem.tsx
// + future call sites.
//
// Default tone is `danger` because most confirms gate
// destructive actions; pass `tone="info"` for neutral
// confirms (e.g. "Apply changes? This will trigger a
// reload").

import { type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { Button } from "@lordmacu/nexo-microapp-ui-react";
import Modal from "./Modal";

export type ConfirmTone = "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  /** Title rendered above the body. Short — one line. */
  title: string;
  /** Body content (string or rich JSX). */
  children: ReactNode;
  /** CTA label for the confirm button. Default `"Confirmar"`. */
  confirmLabel?: string;
  /** CTA label for the cancel button. Default `"Cancelar"`. */
  cancelLabel?: string;
  /** Visual tone — drives icon halo + confirm button variant.
   *  `danger` (default) renders the confirm button as red;
   *  `warning` as amber; `info` as accent. */
  tone?: ConfirmTone;
  /** Forwarded to the confirm button — when `true`, swaps the
   *  label for a spinner and disables both buttons. */
  busy?: boolean;
  /** Optional inline error rendered below the body — typically
   *  the API failure message from a previous confirm attempt. */
  error?: string | null;
  /** Fired when the operator clicks "Confirmar". */
  onConfirm: () => void;
  /** Fired when the operator clicks "Cancelar" or presses Esc. */
  onCancel: () => void;
}

const TONE_HALO: Record<ConfirmTone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

const CONFIRM_VARIANT: Record<ConfirmTone, "danger" | "primary"> = {
  danger: "danger",
  warning: "danger",
  info: "primary",
};

export default function ConfirmDialog({
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <Modal size="sm" onClose={onCancel} hideClose>
      <div className="px-5 py-4" data-testid="confirm-dialog">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_HALO[tone]}`}
            aria-hidden
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
            <div className="mt-1 text-xs leading-relaxed text-text-secondary">
              {children}
            </div>
            {error && (
              <p
                className="mt-2 rounded bg-danger-soft px-2 py-1 text-[11px] text-danger"
                data-testid="confirm-dialog-error"
              >
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onCancel}
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={CONFIRM_VARIANT[tone]}
            size="md"
            busy={busy}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
