// Phase 83.12.audit-page — empty-state hero shown when no audit
// rows match the current filter.

import { EmptyState } from "@lordmacu/nexo-microapp-ui-react";

import { useT } from "../../i18n";

export default function AuditEmpty() {
  const t = useT();
  return (
    <EmptyState
      title={t("audit.empty.title")}
      body={t("audit.empty.body")}
    />
  );
}
