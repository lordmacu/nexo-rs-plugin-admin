// Settings tab — email templates list view. Operator picks
// "edit" to open EmailTemplateEditor, "delete" to remove,
// "new template" to create a fresh one.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";

import {
  deleteEmailTemplate,
  listEmailTemplates,
  type EmailTemplate,
} from "../../api/emailTemplates";
import { HttpError } from "../../api/client";
import { Button, Card } from "../../components/ui";
import { useT } from "../../i18n";

export default function EmailTemplatesList() {
  const t = useT();
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await listEmailTemplates();
        if (!cancelled) setRows(r.templates);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(t: EmailTemplate) {
    const msg = `¿Eliminar la plantilla "${t.name}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(msg)) return;
    try {
      await deleteEmailTemplate(t.id);
      setRows((prev) => prev?.filter((r) => r.id !== t.id) ?? null);
    } catch (e) {
      setError(formatErr(e));
    }
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">
            {t("marketing.email_templates.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-text-secondary">
            {t("marketing.email_templates.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          leadingIcon={<Plus size={12} />}
          onClick={() => navigate("/m/marketing/settings/email-templates/__new__")}
        >
          {t("marketing.email_templates.new_button")}
        </Button>
      </header>

      {error && (
        <div className="rounded border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="text-sm text-text-secondary">…</div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="px-4 py-8 text-center text-sm italic text-text-tertiary">
            {t("marketing.email_templates.empty")}
          </p>
        </Card>
      ) : (
        <Card>
          {/* `overflow-x-auto` lets narrow phones horizontal-scroll
              the table instead of clipping the actions column. */}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-panel-alt text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">
                  {t("marketing.email_templates.list.name")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("marketing.email_templates.list.updated")}
                </th>
                <th className="px-3 py-2 text-right">
                  {t("marketing.email_templates.list.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-panel-hover">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {new Date(row.updated_at_ms).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/m/marketing/settings/email-templates/${encodeURIComponent(row.id)}`,
                        )
                      }
                    >
                      {t("marketing.email_templates.action.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leadingIcon={<Trash2 size={12} />}
                      onClick={() => remove(row)}
                    >
                      {t("marketing.email_templates.action.delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    if (typeof e.body === "object" && e.body && "message" in e.body) {
      return String((e.body as { message?: string }).message ?? e.body);
    }
    return `HTTP ${e.status}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
