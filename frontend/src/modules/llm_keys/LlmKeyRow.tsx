// Phase 90.3.15 — single LLM provider row. Columns: id (mono),
// factory badge, base_url (truncated), api_key_env, tenant_scope
// badge, rotate / delete actions.

import { RefreshCcw, Trash2 } from "lucide-react";

import type { LlmProviderSummary } from "../../api/llm_keys";
import { useT } from "../../i18n";

interface Props {
  row: LlmProviderSummary;
  onRotate: () => void;
  onDelete: () => void;
}

export default function LlmKeyRow({ row, onRotate, onDelete }: Props) {
  const t = useT();
  const factoryBadge = row.factory_type ?? row.id;
  const tenantBadge = row.tenant_scope
    ? row.tenant_scope
    : t("llm_keys.row.tenant_scope.global");
  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 border-b px-6 py-2 text-sm hover:bg-panel-hover">
      <span className="font-mono text-xs text-text-primary">{row.id}</span>
      <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
        {factoryBadge}
      </span>
      <span className="truncate font-mono text-xs text-text-meta">
        {row.base_url}
      </span>
      <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
        {tenantBadge}
      </span>
      <button
        type="button"
        className="rounded p-1.5 text-text-secondary hover:bg-accent-soft hover:text-accent"
        onClick={onRotate}
        title={t("llm_keys.row.rotate")}
      >
        <RefreshCcw size={14} />
      </button>
      <button
        type="button"
        className="rounded p-1.5 text-text-secondary hover:bg-danger-soft hover:text-danger"
        onClick={onDelete}
        title={t("llm_keys.row.delete")}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
