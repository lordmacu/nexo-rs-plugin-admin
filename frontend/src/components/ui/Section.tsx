// Section header + body — the standard widget for grouping
// related content in a panel (lead drawer, settings tab,
// dashboard rail).
//
// Replaces the bespoke `Section` in LeadContextPanel.

import type { ReactNode } from "react";

export interface SectionProps {
  title: string;
  /** Optional small icon rendered to the left of the title.
   *  Accepts any `lucide-react` component (or any element). */
  icon?: ReactNode;
  /** Optional trailing content rendered to the right of the
   *  title (action button, count badge). */
  trailing?: ReactNode;
  children: ReactNode;
}

export default function Section({
  title,
  icon,
  trailing,
  children,
}: SectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          {icon}
          {title}
        </h3>
        {trailing}
      </div>
      <div>{children}</div>
    </section>
  );
}
