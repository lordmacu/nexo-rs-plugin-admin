// Tenant indicator + switcher rendered at the top of the
// rail. Single tenant -> static avatar (operator can't switch
// to anything anyway). Multiple tenants -> click opens a
// dropdown anchored to the avatar.
//
// Switching invalidates module-scoped state via
// `useTenant.switchTenant` which already calls
// `clearTenantScope(prevId)`. The shell remounts the active
// module by keying `<MainArea>` on the tenant id.

import { useCallback, useEffect, useRef, useState } from "react";

import { useTenant } from "./useTenant";
import { Button } from "../components/ui";

export function TenantSwitcher() {
  const { activeTenantId, tenants, status, switchTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const t = event.target as Node;
      if (buttonRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Esc closes the popover and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const onSelect = useCallback(
    (id: string) => {
      if (id !== activeTenantId) switchTenant(id);
      setOpen(false);
      buttonRef.current?.focus();
    },
    [activeTenantId, switchTenant],
  );

  const active = tenants.find((t) => t.tenant_id === activeTenantId);
  const displayName = active?.name ?? activeTenantId ?? "—";
  const initial = (displayName[0] ?? "·").toUpperCase();
  const isInteractive = tenants.length > 1;

  // Capability not granted (or daemon returned 0 tenants) →
  // hide the switcher entirely so the rail doesn't show a
  // dead avatar. The microapp still works in single-tenant
  // mode; activeTenantId stays null.
  if (status === "ready" && tenants.length === 0) {
    return null;
  }

  // Single tenant + ready: render as a non-interactive
  // display so the operator doesn't get a misleading
  // affordance.
  if (status === "ready" && !isInteractive) {
    return (
      <div
        aria-label={`Tenant: ${displayName}`}
        title={displayName}
        className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
        data-testid="tenant-indicator"
      >
        {initial}
      </div>
    );
  }

  // Loading / error stub. Operator sees a neutral avatar
  // while the call is in flight; tooltip carries the error
  // message so the operator can report it.
  if (status !== "ready") {
    return (
      <div
        aria-label={
          status === "error" ? "Tenant load failed" : "Loading tenants"
        }
        title={status === "error" ? "Tenant load failed" : "Loading"}
        className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-panel-hover text-sm font-semibold text-text-meta"
        data-testid="tenant-indicator-placeholder"
      >
        ·
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="md"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Switch tenant — current: ${displayName}`}
        title={displayName}
        onClick={() => setOpen((v) => !v)}
        data-testid="tenant-indicator"
      >
        {initial}
      </Button>

      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Tenants"
          className="absolute left-12 top-0 z-50 min-w-56 rounded border  bg-panel p-1 shadow-lg"
          data-testid="tenant-popover"
        >
          {tenants.map((t) => {
            const isActive = t.tenant_id === activeTenantId;
            return (
              <Button
                variant="primary"
                size="sm"
                key={t.tenant_id}
                role="option"
                aria-selected={isActive}
                onClick={() => onSelect(t.tenant_id)}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
                >
                  {(t.name ?? t.tenant_id)[0]?.toUpperCase() ?? "·"}
                </span>
                <span className="flex-1 truncate">{t.name ?? t.tenant_id}</span>
                {isActive && (
                  <span aria-hidden="true" className="text-xs text-accent">
                    ●
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
