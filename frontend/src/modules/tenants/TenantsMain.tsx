// Phase 90.3.21 — `tenants` module main panel.
// Phase 90.x.tenants — added create + delete + toggle-active.

import { useEffect, useState } from "react";
import { Plus, Power, RefreshCw, Trash2 } from "lucide-react";

import { useTenantStore } from "../../store/tenant";
import { tenantsDelete, tenantsSetActive } from "../../api/tenants";
import { useT } from "../../i18n";
import TenantCreateModal from "./TenantCreateModal";

export default function TenantsMain() {
  const t = useT();
  const { tenants, activeTenantId, status, error, loadTenants } =
    useTenantStore();
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") {
      void loadTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = async (
    tenant_id: string,
    name: string,
    currentlyActive: boolean,
  ) => {
    const nextActive = !currentlyActive;
    if (
      !window.confirm(
        nextActive
          ? t("tenants.action.activate_confirm", { name })
          : t("tenants.action.deactivate_confirm", { name }),
      )
    )
      return;
    setBusyId(tenant_id);
    setActionError(null);
    try {
      await tenantsSetActive(tenant_id, name, nextActive);
      await loadTenants();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (tenant_id: string, name: string) => {
    if (!window.confirm(t("tenants.delete.confirm", { name }))) return;
    setBusyId(tenant_id);
    setActionError(null);
    try {
      const res = await tenantsDelete(tenant_id, false);
      if (!res.removed && res.orphaned_agents.length > 0) {
        // Daemon refused: agents reference the tenant. Confirm
        // cascade-delete with the orphan list.
        if (
          window.confirm(
            t("tenants.delete.purge_confirm", {
              name,
              count: String(res.orphaned_agents.length),
              agents: res.orphaned_agents.slice(0, 5).join(", "),
            }),
          )
        ) {
          await tenantsDelete(tenant_id, true);
          await loadTenants();
        }
      } else {
        await loadTenants();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("tenants.title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded p-1.5 text-text-secondary hover:bg-panel-hover"
            onClick={() => void loadTenants()}
            disabled={status === "loading"}
            title={t("tenants.action.reload")}
          >
            <RefreshCw
              size={14}
              className={status === "loading" ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
            {t("tenants.action.create")}
          </button>
        </div>
      </header>
      {(error !== null || actionError !== null) && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error ?? actionError}
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
                  <th className="px-4 py-2 text-right">
                    {t("tenants.col.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const busy = busyId === tenant.tenant_id;
                  const name = tenant.name ?? tenant.tenant_id;
                  return (
                    <tr key={tenant.tenant_id} className="border-b">
                      <td className="px-4 py-2 font-mono text-xs">
                        {tenant.tenant_id}
                      </td>
                      <td className="px-4 py-2">{name}</td>
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
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded p-1.5 text-text-secondary hover:bg-warning-soft hover:text-warning disabled:opacity-50"
                            onClick={() =>
                              void handleToggleActive(
                                tenant.tenant_id,
                                name,
                                tenant.active,
                              )
                            }
                            disabled={busy}
                            title={
                              tenant.active
                                ? t("tenants.action.deactivate")
                                : t("tenants.action.activate")
                            }
                          >
                            <Power size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-text-secondary hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                            onClick={() =>
                              void handleDelete(tenant.tenant_id, name)
                            }
                            disabled={busy}
                            title={t("tenants.action.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {showCreate && (
        <TenantCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void loadTenants();
          }}
        />
      )}
    </div>
  );
}
