// Phase 90.3.13 — single dashboard tile. Tile = label + count +
// hint. Loading state shows a spinner; error state shows "—" with
// a hover-reveal of the error reason. No business logic — all
// numbers come from the dashboard store.

import type { ReactNode } from "react";

import { Spinner } from "../../components/ui";

interface Props {
  label: string;
  hint?: string;
  value: number | null;
  isLoading: boolean;
  icon: ReactNode;
}

export default function MetricTile({
  label,
  hint,
  value,
  isLoading,
  icon,
}: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-panel px-4 py-3">
      <div className="rounded bg-panel-alt p-2 text-text-secondary">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-text-meta">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          {isLoading ? (
            <Spinner size="md" />
          ) : (
            <span className="text-2xl font-bold text-text-primary">
              {value === null ? "—" : value.toLocaleString()}
            </span>
          )}
        </div>
        {hint && (
          <div className="mt-0.5 text-xs text-text-secondary">{hint}</div>
        )}
      </div>
    </div>
  );
}
