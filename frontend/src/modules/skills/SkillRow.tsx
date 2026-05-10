// Phase 90.3.14 — single skill row in the left sidebar list.
// Click selects, delete button removes after confirm dialog.

import { Trash2 } from "lucide-react";

import type { SkillSummary } from "../../api/skills";
import { useT } from "../../i18n";

interface Props {
  skill: SkillSummary;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function SkillRow({
  skill,
  isSelected,
  onSelect,
  onDelete,
}: Props) {
  const t = useT();
  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-3 hover:bg-panel-hover ${
        isSelected ? "bg-panel-alt" : "bg-panel"
      }`}
    >
      <button
        type="button"
        className="flex-1 text-left"
        onClick={onSelect}
      >
        <div className="font-mono text-sm text-text-primary">
          {skill.display_name ?? skill.name}
        </div>
        {skill.description && (
          <div className="mt-0.5 truncate text-xs text-text-secondary">
            {skill.description}
          </div>
        )}
      </button>
      <button
        type="button"
        className="ml-2 rounded p-1 text-text-meta hover:bg-danger-soft hover:text-danger"
        onClick={onDelete}
        title={t("skills.row.delete")}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
