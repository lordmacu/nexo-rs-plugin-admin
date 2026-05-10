// Operator-saved compose drafts list. Click a row →
// re-opens the compose UI the operator used to save it
// (rapid modal vs builder page) with state hydrated.
//
// Distinct from `/drafts` (AI-generated drafts on inbound
// leads). This page is for outbounds the operator started
// authoring and wants to come back to.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FileEdit } from "lucide-react";

import { HttpError } from "../../api/client";
import {
  deleteComposeDraft,
  listComposeDrafts,
  type ComposeDraft,
} from "../../api/composeDrafts";
import { Button, Card } from "../../components/ui";
import { useT } from "../../i18n";

const COMPOSE_REOPEN_KEY = "marketing.compose.reopen.draft_id";

/** Sentinel the operator's chosen UI surface checks on mount.
 *  Setting it before navigating tells ComposeWithBuilder /
 *  the destination compose page (ComposeQuickView or
 *  ComposeWithBuilder) to fetch + hydrate from this draft. */
export function setReopenDraftId(id: string) {
  try {
    sessionStorage.setItem(COMPOSE_REOPEN_KEY, id);
  } catch {
    // Storage disabled; the page will land blank but not crash.
  }
}

export function takeReopenDraftId(): string | null {
  try {
    const v = sessionStorage.getItem(COMPOSE_REOPEN_KEY);
    sessionStorage.removeItem(COMPOSE_REOPEN_KEY);
    return v;
  } catch {
    return null;
  }
}

export default function SavedDraftsView() {
  const t = useT();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ComposeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await listComposeDrafts();
      setDrafts(r.drafts);
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openDraft(d: ComposeDraft) {
    setReopenDraftId(d.id);
    // Compose pages own the sentinel pickup on mount —
    // builder route lands on /compose/builder, rapid on
    // /compose. No modal hand-off, no event dance.
    navigate(
      d.mode === "builder"
        ? "/m/marketing/compose/builder"
        : "/m/marketing/compose",
    );
  }

  async function remove(d: ComposeDraft) {
    if (!confirm(t("marketing.saved_drafts.confirm_delete"))) return;
    setDeletingId(d.id);
    try {
      await deleteComposeDraft(d.id);
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">
          {t("marketing.saved_drafts.title")}
        </h1>
        <p className="text-xs text-text-secondary">
          {t("marketing.saved_drafts.subtitle")}
        </p>
      </header>

      {error && (
        <div className="rounded border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm italic text-text-tertiary">
            {t("marketing.saved_drafts.loading")}
          </p>
        </Card>
      ) : drafts.length === 0 ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm italic text-text-tertiary">
            {t("marketing.saved_drafts.empty")}
          </p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {drafts.map((d) => (
              <li
                key={d.id}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-panel-hover ${
                  deletingId === d.id ? "opacity-40" : ""
                }`}
              >
                <FileEdit size={16} className="text-text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {d.title || t("marketing.saved_drafts.no_title")}
                  </div>
                  <div className="truncate text-[11px] text-text-tertiary">
                    {d.to_email
                      ? d.to_email
                      : t("marketing.saved_drafts.no_recipient")}
                    {" · "}
                    {modeLabel(d.mode, t)}
                    {" · "}
                    {formatDate(d.updated_at_ms)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => openDraft(d)}
                >
                  {t("marketing.saved_drafts.open")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leadingIcon={<Trash2 size={12} />}
                  onClick={() => remove(d)}
                  disabled={deletingId === d.id}
                >
                  {t("marketing.saved_drafts.delete")}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function modeLabel(
  mode: "rapid" | "builder",
  t: (k: import("../../i18n").CatalogKey) => string,
): string {
  return mode === "builder"
    ? t("marketing.saved_drafts.mode.builder")
    : t("marketing.saved_drafts.mode.rapid");
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | undefined;
    return body?.message ?? body?.code ?? `HTTP ${e.status}`;
  }
  return String(e);
}
