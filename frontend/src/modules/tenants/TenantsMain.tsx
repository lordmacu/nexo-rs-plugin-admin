// Phase 90.3.21 — `tenants` module main panel.
//
// V1 surface: list of authorised tenants with "active" badge
// reflecting which one the rail's tenant switcher targets right
// now. Create / update / delete deferred — the daemon's
// `tenants_crud` capability covers the wire shapes but the
// matching `nexo/admin/tenants/{create,update,delete}` admin
// RPCs need the api/tenants.ts wrappers added (one paragraph
// of work — happy to do it when an operator demands it).

import { useEffect } from "react";

import { useTenantStore } from "../../store/tenant";
import { useT } from "../../i18n";

export default function TenantsMain() {
  const t = useT();
  const { tenants, activeTenantId, status, error, loadTenants } =
    useTenantStore();

  useEffect(() => {
    if (status === "idle") {
      void loadTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("tenants.title")}
        </h1>
      </header>
      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        <section className="rounded-lg border bg-panel">
          {tenants.length === 0 && status === "ready" ? (
            <div className="px-6 py-12 text-center text-sm text-text-secondary">
              {t("tenants.empty.body")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-text-meta">
                <tr>
                  <th className="px-4 py-2 text-left">
                    {t("tenants.col.id")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("tenants.col.name")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("tenants.col.status")}
                  </th>
                  <th className="px-4 py-2 text-left">
                    {t("tenants.col.active")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.tenant_id} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">
                      {tenant.tenant_id}
                    </td>
                    <td className="px-4 py-2">{tenant.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          tenant.active
                            ? "bg-success-soft text-success"
                            : "bg-warning-soft text-warning"
                        }`}
                      >
                        {tenant.active
                          ? t("tenants.status.active")
                          : t("tenants.status.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {activeTenantId === tenant.tenant_id && (
                        <span className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          {t("tenants.row.viewing")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <p className="mt-4 text-xs text-text-meta">
          {t("tenants.deferred.crud_note")}
        </p>
      </div>
    </div>
  );
}
