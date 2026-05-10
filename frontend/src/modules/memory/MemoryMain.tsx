// Phase 90.x.memory — memory module main panel.
// LIVE in Phase 90.x.memory (was placeholder in 90.3.17).

import { Search, Tag } from "lucide-react";

import { useMemory } from "../../store/memory";
import { useT } from "../../i18n";

export default function MemoryMain() {
  const t = useT();
  const {
    agentId,
    query,
    entries,
    isLoading,
    error,
    setAgentId,
    setQuery,
    search,
  } = useMemory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
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
    </div>
  );
}
