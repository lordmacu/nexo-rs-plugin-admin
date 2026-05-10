// Phase 83.12.audit-page — div-based list (not a `<table>` —
// accessibility / responsive design favour a list of rows).

import { useAudit } from "../../store/audit";
import AuditRow from "./AuditRow";

export default function AuditList() {
  const entries = useAudit((s) => s.entries);
  return (
    <div className="divide-y bg-panel">
      {entries.map((row, idx) => (
        // Composite key: `started_at_ms + microapp + method +
        // args_hash` is stable across reloads; pure index would
        // mis-key when entries get prepended on a refresh.
        <AuditRow
          key={`${row.started_at_ms}-${row.microapp_id}-${row.method}-${row.args_hash}-${idx}`}
          row={row}
        />
      ))}
    </div>
  );
}
