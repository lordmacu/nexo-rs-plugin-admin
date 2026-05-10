// Phase 90.3.15 — llm_keys module main panel. Lists provider
// instances, opens LlmInstanceCreateModal for create + rotate.
// Delete uses native confirm (typed-ID confirm dialog deferred).

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import LlmInstanceCreateModal from "../agents/LlmInstanceCreateModal";
import { useLlmKeys } from "../../store/llm_keys";
import { useT } from "../../i18n";
import LlmKeyRow from "./LlmKeyRow";

type ModalMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "rotate"; id: string; factory: string };

export default function LlmKeysMain() {
  const t = useT();
  const { entries, isLoading, error, reload, remove } = useLlmKeys();
  const [mode, setMode] = useState<ModalMode>({ kind: "closed" });

  useEffect(() => {
    if (entries.length === 0 && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("llm_keys.delete.confirm", { id }))) return;
    try {
      await remove(id);
    } catch {
      /* error already in state */
    }
  };

  const existing_ids = entries.map((e) => e.id);
  const rotate_existing_ids =
    mode.kind === "rotate"
      ? existing_ids.filter((id) => id !== mode.id)
      : existing_ids;

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("llm_keys.title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded p-1.5 text-text-secondary hover:bg-panel-hover"
            onClick={() => void reload()}
            disabled={isLoading}
            title={t("llm_keys.action.reload")}
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            onClick={() => setMode({ kind: "create" })}
          >
            <Plus size={14} />
            {t("llm_keys.action.new")}
          </button>
        </div>
      </header>
      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && !isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-text-secondary">
            {t("llm_keys.empty.body")}
          </div>
        ) : (
          entries.map((row) => (
            <LlmKeyRow
              key={row.id}
              row={row}
              onRotate={() =>
                setMode({
                  kind: "rotate",
                  id: row.id,
                  factory: row.factory_type ?? row.id,
                })
              }
              onDelete={() => void handleDelete(row.id)}
            />
          ))
        )}
      </div>
      {mode.kind !== "closed" && (
        <LlmInstanceCreateModal
          existing_ids={
            mode.kind === "rotate" ? rotate_existing_ids : existing_ids
          }
          onClose={() => setMode({ kind: "closed" })}
          onCreated={() => {
            setMode({ kind: "closed" });
            void reload();
          }}
          {...(mode.kind === "rotate"
            ? { editing_id: mode.id, editing_factory: mode.factory }
            : {})}
        />
      )}
    </div>
  );
}
