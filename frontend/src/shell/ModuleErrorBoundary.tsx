// Per-module ErrorBoundary. Wraps the active module's
// subtree so a render-time crash in one module doesn't take
// down the whole shell — the rail, tenant switcher, and
// sibling modules stay alive.
//
// Recovery: the operator can hit "Reload module" which
// re-mounts the subtree by bumping a key. If the failure
// repeats, that's the manifest author's bug; we surface the
// stack in dev mode so they can debug.

import { Component, type ErrorInfo, type ReactNode } from "react";

import { t } from "./i18n";
import { Button } from "../components/ui";

interface Props {
  readonly moduleId: string;
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
  readonly key: number;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(
      `[shell] module "${this.props.moduleId}" crashed`,
      error,
      info.componentStack,
    );
  }

  reload = (): void => {
    this.setState((s) => ({ error: null, key: s.key + 1 }));
  };

  render(): ReactNode {
    const { error, key } = this.state;
    if (error) {
      return (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
          data-testid={`module-crash-${this.props.moduleId}`}
        >
          <h2 className="text-base font-semibold text-text-primary">
            {t("shell.module_crash.title", { module: this.props.moduleId })}
          </h2>
          <p className="max-w-md text-sm text-text-secondary">
            {error.message || t("shell.module_crash.unknown")}
          </p>
          <Button variant="primary" size="sm" onClick={this.reload}>
            {t("shell.module_crash.reload")}
          </Button>
          {import.meta.env.DEV && error.stack && (
            <pre className="mt-2 max-h-40 max-w-full overflow-auto rounded bg-panel-alt px-3 py-2 text-left text-[11px] text-text-meta">
              {error.stack}
            </pre>
          )}
        </div>
      );
    }
    return (
      <div key={key} className="h-full w-full">
        {this.props.children}
      </div>
    );
  }
}
