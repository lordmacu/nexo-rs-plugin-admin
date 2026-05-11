// Phase 90.x.memory — memory module main panel.
// LIVE in Phase 90.x.memory (was placeholder in 90.3.17).
// Phase 90.x.memory-snapshot.create-restore — added create + restore
// modals; snapshot rows gained a `Restore` action alongside delete.

import { useState } from "react";
import { Archive, Lock, Plus, RotateCcw, Search, Tag, Trash2 } from "lucide-react";

import { useMemory } from "../../store/memory";
import { useT } from "../../i18n";
import CreateSnapshotModal from "./CreateSnapshotModal";
import RestoreSnapshotModal from "./RestoreSnapshotModal";
import type { SnapshotMeta } from "../../api/memory";

export default function MemoryMain() {
  const t = useT();
  const {
    agentId,
    query,
    entries,
    snapshots,
    snapshotsError,
    isLoading,
    error,
    setAgentId,
    setQuery,
    search,
    loadSnapshots,
    removeSnapshot,
  } = useMemory();
  const [createOpen, setCreateOpen] = useState(false);
  const [restoreFor, setRestoreFor] = useState<SnapshotMeta | null>(null);
  // Phase 90 audit fix — snapshot list expand toggle. Default
  // collapses to the 5 most recent (the prior hard-cap) so the
  // panel stays compact; operators with > 5 snapshots can
  // expand to see (and restore / delete) older bundles
  // without dropping to the CLI.
  const [snapshotsExpanded, setSnapshotsExpanded] = useState(false);
  const SNAPSHOT_COLLAPSED_LIMIT = 5;
  const visibleSnapshots = snapshotsExpanded
    ? snapshots
    : snapshots.slice(0, SNAPSHOT_COLLAPSED_LIMIT);
  const hiddenCount = Math.max(
    0,
    snapshots.length - SNAPSHOT_COLLAPSED_LIMIT,
  );

  const handleSnapshotDelete = async (id: string) => {
    if (!window.confirm(t("memory.snapshots.delete_confirm", { id: id.slice(0, 8) })))
      return;
    try {
      await removeSnapshot(id);
    } catch {
      /* error already in store */
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
    void loadSnapshots();
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("memory.title")}
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          {t("memory.subtitle")}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 border-b bg-panel px-6 py-3"
      >
        <label className="flex flex-col">
          <span className="mb-1 text-xs uppercase tracking-wide text-text-meta">
            {t("memory.field.agent_id")}
          </span>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="ana"
            className="rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
          />
        </label>
        <label className="flex flex-1 flex-col">
          <span className="mb-1 text-xs uppercase tracking-wide text-text-meta">
            {t("memory.field.query")}
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("memory.field.query_placeholder")}
            className="w-full rounded border bg-surface px-2 py-1.5 text-sm text-text-primary"
          />
        </label>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          disabled={isLoading}
        >
          <Search size={14} />
          {isLoading ? t("memory.action.searching") : t("memory.action.search")}
        </button>
      </form>

      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Snapshots panel — only shown when agent_id is set */}
      {agentId.trim().length > 0 && (
        <section className="border-b bg-panel px-6 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-meta">
            <Archive size={12} />
            <span>{t("memory.snapshots.title")}</span>
            {snapshots.length > 0 && (
              <span className="text-text-secondary">({snapshots.length})</span>
            )}
            <button
              type="button"
              className="ml-auto flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs font-medium normal-case tracking-normal text-white hover:bg-accent-hover"
              onClick={() => setCreateOpen(true)}
              title={t("memory.snapshots.create.title")}
            >
              <Plus size={12} />
              {t("memory.snapshots.create.action")}
            </button>
          </div>
          {snapshotsError !== null ? (
            <p className="text-xs text-text-secondary">
              {t("memory.snapshots.error", { message: snapshotsError })}
            </p>
          ) : snapshots.length === 0 ? (
            <p className="text-xs text-text-secondary">
              {t("memory.snapshots.empty")}
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleSnapshots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {s.encrypted && (
                      <Lock size={10} className="text-warning" />
                    )}
                    <span className="font-mono text-text-secondary">
                      {s.id.slice(0, 8)}…
                    </span>
                    {s.label && (
                      <span className="rounded bg-panel-alt px-1.5 py-0.5 text-text-primary">
                        {s.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-text-meta">
                    <span>{(s.bundle_size_bytes / 1024).toFixed(0)} KB</span>
                    <time>
                      {new Date(s.created_at_ms).toLocaleString()}
                    </time>
                    <button
                      type="button"
                      className="rounded p-1 text-text-meta hover:bg-warning-soft hover:text-warning"
                      onClick={() => setRestoreFor(s)}
                      title={t("memory.snapshots.restore.action")}
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-text-meta hover:bg-danger-soft hover:text-danger"
                      onClick={() => void handleSnapshotDelete(s.id)}
                      title={t("memory.snapshots.delete")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
              {hiddenCount > 0 && !snapshotsExpanded && (
                <li>
                  <button
                    type="button"
                    className="rounded px-2 py-0.5 text-xs text-accent hover:bg-panel-hover"
                    onClick={() => setSnapshotsExpanded(true)}
                  >
                    {t("memory.snapshots.show_all", {
                      count: String(hiddenCount),
                    })}
                  </button>
                </li>
              )}
              {snapshotsExpanded &&
                snapshots.length > SNAPSHOT_COLLAPSED_LIMIT && (
                  <li>
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-xs text-text-meta hover:bg-panel-hover"
                      onClick={() => setSnapshotsExpanded(false)}
                    >
                      {t("memory.snapshots.collapse")}
                    </button>
                  </li>
                )}
            </ul>
          )}
        </section>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 && !isLoading && error === null ? (
          <div className="rounded-lg border bg-panel px-6 py-12 text-center text-sm text-text-secondary">
            {t("memory.empty.body")}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border bg-panel p-4"
              >
                <header className="mb-2 flex items-center justify-between text-xs text-text-meta">
                  <span className="font-mono">{entry.agent_id}</span>
                  <time>{new Date(entry.created_at).toLocaleString()}</time>
                </header>
                <p className="whitespace-pre-wrap text-sm text-text-primary">
                  {entry.content}
                </p>
                {(entry.tags.length > 0 ||
                  entry.concept_tags.length > 0 ||
                  entry.memory_type) && (
                  <footer className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {entry.memory_type && (
                      <span className="rounded bg-accent-soft px-2 py-0.5 text-accent">
                        {entry.memory_type}
                      </span>
                    )}
                    {entry.tags.map((tag) => (
                      <span
                        key={`tag-${tag}`}
                        className="flex items-center gap-1 rounded bg-panel-alt px-2 py-0.5 text-text-secondary"
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                    {entry.concept_tags.map((tag) => (
                      <span
                        key={`concept-${tag}`}
                        className="rounded bg-panel-alt px-2 py-0.5 text-text-meta"
                      >
                        {tag}
                      </span>
                    ))}
                  </footer>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      {createOpen && (
        <CreateSnapshotModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void loadSnapshots();
          }}
        />
      )}
      {restoreFor && (
        <RestoreSnapshotModal
          snapshot={restoreFor}
          onClose={() => setRestoreFor(null)}
          onApplied={() => {
            setRestoreFor(null);
            void loadSnapshots();
          }}
        />
      )}
    </div>
  );
}
