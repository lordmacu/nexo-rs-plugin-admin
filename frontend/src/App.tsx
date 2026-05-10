import { useCallback, useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import Login from "./pages/Login";
import Wizard from "./pages/Wizard";
import { bootChatMeta } from "./init/chatMetaBoot";
import CmdK from "./components/CmdK";
import ToastHost from "./components/ToastHost";
import { fetchBootstrap } from "./api/onboarding";
import type { BootstrapState } from "./api/types";
import { useAuth } from "./store/auth";
import { useCmdk } from "./store/cmdk";
import { ShellRoot, buildShellRoutes } from "./shell/ShellRoot";
import { ModuleRegistry } from "./shell/ModuleRegistry";
import { useTenant } from "./shell/useTenant";
import { useRegistry } from "./shell/registryInstance";
import { Button } from "./components/ui";
import { useT } from "./i18n";

// M16 — discover every module under `src/modules/*/manifest.tsx`
// at build time. Modules guarded behind env flags export
// `manifest: undefined`; we filter those out so the registry
// only sees real entries.
const moduleGlob = import.meta.glob("./modules/*/manifest.tsx", {
  eager: true,
}) as Record<string, { manifest?: unknown }>;
const filteredGlob = Object.fromEntries(
  Object.entries(moduleGlob).filter(([, mod]) => mod.manifest !== undefined),
);

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* M16.4-M16.5 — legacy /chat + /agents URL schemes
            redirect into the workspace shell. Drop in 0.0.66
            once operators have updated bookmarks. */}
        <Route path="/chat" element={<RedirectPreserveQuery to="/m/chats" />} />
        <Route path="/chat/:key" element={<RedirectChatKey />} />
        <Route path="/agents" element={<Navigate to="/m/agents" replace />} />
        <Route
          path="/agents/:agent_id/workspace"
          element={<RedirectAgentWorkspace />}
        />
        {/* M16 — workspace shell hosts every migrated module under /m/*. */}
        <Route
          path="/m/*"
          element={
            <RequireAuth>
              <BootstrapGate>
                <ShellMount />
              </BootstrapGate>
            </RequireAuth>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      <ToastHost />
    </>
  );
}

/** Compose the registry once per mount + render the shell.
 *  The registry is recomputed when the active tenant changes
 *  so per-tenant migrations run against the right state. */
function ShellMount() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "__pending__";
  const registry = useMemoizedRegistry(filteredGlob, tenantId);
  return (
    <Routes>
      <Route element={<ShellRoot registry={registry} />}>
        {buildShellRoutes(registry).flatMap((r) => emitRoute(r, r.path ?? ""))}
      </Route>
    </Routes>
  );
}

/** Recursively flatten a RouteObject tree into <Route>
 *  elements. Supports manifest routes that nest sub-routes
 *  (settings tabs, lead detail panes, etc.). React Router
 *  index routes can't have children, so we fork on it. */
function emitRoute(
  route: {
    path?: string;
    index?: boolean;
    element?: React.ReactNode;
    children?: readonly unknown[];
  },
  keyPrefix: string,
): React.ReactNode[] {
  const children = (route.children ?? []) as Array<{
    path?: string;
    index?: boolean;
    element?: React.ReactNode;
    children?: readonly unknown[];
  }>;

  if (route.index) {
    return [
      <Route key={keyPrefix || "__root__"} index element={route.element} />,
    ];
  }

  return [
    <Route
      key={keyPrefix || "__root__"}
      path={route.path}
      element={route.element}
    >
      {children.flatMap((child, idx) =>
        emitRoute(child, `${keyPrefix}/${idx}`),
      )}
    </Route>,
  ];
}

function useMemoizedRegistry(glob: Record<string, unknown>, tenantId: string) {
  // Lightweight memo — `glob` is a build-time constant, so the
  // registry only rebuilds when `tenantId` changes.
  const [registry] = useState(() => ModuleRegistry.fromGlob(glob, tenantId));
  // Publish to the global singleton so the Cmd+K palette
  // (mounted outside the shell tree) reads the same instance.
  useEffect(() => {
    useRegistry.getState().setRegistry(registry);
    return () => useRegistry.getState().setRegistry(null);
  }, [registry]);
  return registry;
  // NOTE: switching tenant remounts <ShellMount> via the
  // RequireAuth gate keying off auth state in M16.3 follow-up;
  // for now a tenant change reloads the SPA cleanly.
}

function RootRedirect() {
  const token = useAuth((s) => s.token);
  return <Navigate to={token ? "/m/chats" : "/login"} replace />;
}

/** Legacy URL redirect that preserves the query string + hash —
 *  `<Navigate to=...>` drops them, which broke
 *  `/chat?wizard=new-agent` deep-links from the agents module's
 *  "Nuevo agente" button. */
function RedirectPreserveQuery({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

function RedirectChatKey() {
  const params = useParams();
  const key = params.key ? `/${encodeURIComponent(params.key)}` : "";
  return <Navigate to={`/m/chats${key}`} replace />;
}

function RedirectAgentWorkspace() {
  const params = useParams();
  const id = params.agent_id ? encodeURIComponent(params.agent_id) : "";
  return <Navigate to={`/m/agents/${id}/workspace`} replace />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  // M7.cmdk — global Cmd+K / Ctrl+K listener registered only
  // when authed. Mounting `<CmdK />` here means the modal
  // overlays any sub-route + the listener doesn't fire on
  // `/login`.
  useEffect(() => {
    if (!token) return;
    // Pull aliases / labels / prospects from sqlite in one shot
    // so the sidebar renders with the operator's CRM state from
    // the get-go (no flash of empty labels / Chat-hex names).
    void bootChatMeta();
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCmdk.getState().toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  return (
    <>
      {children}
      <CmdK />
    </>
  );
}

/**
 * Fetch the M9 bootstrap snapshot once on mount; render the
 * wizard when `needs_wizard` (no agent yet) and the dashboard
 * otherwise. After the wizard completes we re-fetch + transition
 * to the dashboard.
 */
function BootstrapGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const force_wizard = searchParams.get("wizard") === "new-agent";

  const refresh = useCallback(async () => {
    try {
      const b = await fetchBootstrap();
      setBootstrap(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleWizardComplete = useCallback(async () => {
    await refresh();
    navigate("/m/chats", { replace: true });
  }, [navigate, refresh]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="bg-white border  rounded p-6 max-w-md">
          <div className="text-sm font-medium text-red-700">
            {t("app.bootstrap.error_title")}
          </div>
          <div className="text-xs text-text-meta mt-2 font-mono">{error}</div>
          <Button variant="primary" size="sm" onClick={() => void refresh()}>
            {t("app.bootstrap.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (bootstrap === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="text-text-meta text-sm">
          {t("app.bootstrap.loading")}
        </div>
      </div>
    );
  }

  if (bootstrap.needs_wizard || force_wizard) {
    // M7.cmdk — `?wizard=new-agent` forces the wizard mount
    // even when an agent already exists, so the command
    // palette's "Crear nuevo agente" action works for
    // subsequent agents.
    return <Wizard initial={bootstrap} onComplete={handleWizardComplete} />;
  }

  return <>{children}</>;
}
