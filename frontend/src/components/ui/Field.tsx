// Form field wrapper — label + optional hint + child input.
//
// Replaces the bespoke `Field` redefined in SellerForm,
// MailboxFormEditor, MarketingWizard, and Agents.tsx. The
// label is a 11px medium uppercase mark; the hint is a
// 10-px secondary line under the input that explains
// validation rules / wire conventions.

import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  /** Optional one-liner under the input. Use for default
   *  values, validation rules, or wire-format notes. */
  hint?: string;
  children: ReactNode;
  /** Mark the field as required visually (asterisk after
   *  the label). Validation lives at the consuming form;
   *  this is purely a hint. */
  required?: boolean;
}

export default function Field({ label, hint, children, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[10px] leading-relaxed text-text-meta">
          {hint}
        </span>
      )}
    </label>
  );
}
