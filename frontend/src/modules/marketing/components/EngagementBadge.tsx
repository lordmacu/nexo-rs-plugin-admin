// F20 — inline engagement badge for outbound thread rows.
//
// Reads `/api/marketing/tracking/msg/:msg_id/engagement`
// (which is the flat aggregate shape `prepare_outbound_email`
// + the public ingest pixel/redirector populate). Renders
// "📧 N lecturas · M clicks" next to the row's timestamp;
// click expands a per-link breakdown.
//
// Silent surface:
// - Pre-tracking msg_ids (`outbound-<uuid>` placeholders
//   that boot wiring stamps when tracking deps aren't
//   wired) just return zeros — the badge stays hidden.
// - 404 `tracking_disabled` (operator hasn't wired the
//   tracking secret yet) ⇒ also hidden.
// - Network failure ⇒ hidden, no toast (avoid noisy lead
//   drawer; the operator likely has bigger problems).

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, MousePointerClick } from "lucide-react";

import { getEngagement, type MessageEngagement } from "../../../api/marketing";
import { HttpError } from "../../../api/client";
import { Button } from "../../../components/ui";

interface Props {
  readonly msgId: string;
}

export default function EngagementBadge({ msgId }: Props) {
  const [data, setData] = useState<MessageEngagement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    // Pre-tracking placeholder ids (`outbound-<uuid>`) are
    // never present in the tracking store — query anyway
    // and rely on the empty aggregate to keep the badge
    // hidden. Cheaper than parsing the prefix.
    getEngagement(msgId)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: unknown) => {
        // 404 `tracking_disabled` + transient errors are
        // silent — the badge just stays hidden.
        if (!cancelled && e instanceof HttpError) {
          setData(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [msgId]);

  if (!data) return null;
  const totalClicks = data.clicks_by_link.reduce((acc, l) => acc + l.count, 0);
  if (data.opens === 0 && totalClicks === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <Button
        variant="primary"
        size="sm"
        onClick={() => (totalClicks > 0 ? setExpanded((s) => !s) : undefined)}
        disabled={totalClicks === 0}
        aria-label="engagement-badge"
      >
        {data.opens > 0 && (
          <span className="flex items-center gap-1">
            <Eye size={10} />
            {data.opens} {data.opens === 1 ? "lectura" : "lecturas"}
          </span>
        )}
        {data.opens > 0 && totalClicks > 0 && (
          <span className="text-emerald-300">·</span>
        )}
        {totalClicks > 0 && (
          <span className="flex items-center gap-1">
            <MousePointerClick size={10} />
            {totalClicks} {totalClicks === 1 ? "click" : "clicks"}
          </span>
        )}
        {totalClicks > 0 &&
          (expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </Button>

      {expanded && totalClicks > 0 && (
        <ul className="ml-1 flex flex-col gap-0.5 text-[10px] text-slate-600">
          {data.clicks_by_link.map((row) => (
            <li
              key={row.link_id}
              className="flex items-center gap-2 rounded bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200"
            >
              <span className="font-mono text-[10px] text-slate-500">
                {row.link_id}
              </span>
              <span className="ml-auto font-semibold text-slate-700">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
