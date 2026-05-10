// Phase 90.3.14 — skills module main panel. Two-pane layout:
//   - Left:   list of skills with delete button per row
//   - Right:  selected skill's body (markdown rendered raw in <pre>)
//
// Operator wants edit/create later — v1 is read+delete to validate
// the wire shapes. The framework's CLI + agent doctor still cover
// authoring; the UI just exposes inspection + cleanup.

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useSkills } from "../../store/skills";
import { useT } from "../../i18n";
import { Spinner } from "../../components/ui";
import SkillRow from "./SkillRow";

export default function SkillsMain() {
  const t = useT();
  const {
    skills,
    selected,
    isLoading,
    isLoadingDetail,
    error,
    reload,
    select,
    remove,
  } = useSkills();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (skills.length === 0 && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (name: string) => {
    if (
      !window.confirm(
        t("skills.delete.confirm", { name }),
      )
    )
      return;
    setPendingDelete(name);
    try {
      await remove(name);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex h-full bg-surface">
      {/* Left list */}
      <div className="flex w-80 flex-col border-r">
        <header className="flex items-center justify-between border-b bg-panel px-4 py-3">
          <h2 className="text-sm font-bold text-text-primary">
            {t("skills.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover"
            onClick={() => void reload()}
            disabled={isLoading}
            title={t("skills.action.reload")}
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </header>
        {error !== null && (
          <div className="border-b border-danger-soft bg-danger-soft px-4 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {skills.length === 0 && !isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-text-secondary">
              {t("skills.empty.body")}
            </div>
          ) : (
            skills.map((s) => (
              <SkillRow
                key={s.name}
                skill={s}
                isSelected={selected?.name === s.name}
                onSelect={() => void select(s.name)}
                onDelete={() => void handleDelete(s.name)}
              />
            ))
          )}
          {pendingDelete && (
            <div className="px-4 py-2 text-xs text-text-secondary">
              {t("skills.deleting", { name: pendingDelete })}
            </div>
          )}
        </div>
      </div>

      {/* Right view */}
      <div className="flex flex-1 flex-col">
        <header className="border-b bg-panel px-6 py-4">
          <h1 className="text-lg font-bold text-text-primary">
            {selected?.display_name ?? selected?.name ?? t("skills.view.empty_title")}
          </h1>
          {selected?.description && (
            <p className="mt-1 text-sm text-text-secondary">
              {selected.description}
            </p>
          )}
        </header>
        <div className="flex-1 overflow-y-auto bg-surface p-6">
          {isLoadingDetail ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner size="md" />
              {t("skills.view.loading")}
            </div>
          ) : selected === null ? (
            <div className="text-sm text-text-secondary">
              {t("skills.view.select_a_skill")}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm text-text-primary">
              {selected.body}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
