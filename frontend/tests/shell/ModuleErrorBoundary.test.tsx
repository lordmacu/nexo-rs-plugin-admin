import { Component, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ModuleErrorBoundary } from "../../src/shell/ModuleErrorBoundary";

// jsdom dispatches a `window.error` event when a render throws,
// even when an ErrorBoundary catches it; suppress for these
// tests so Vitest's unhandled-error handler doesn't fail them.
beforeEach(() => {
  window.addEventListener("error", swallow, true);
});
afterEach(() => {
  window.removeEventListener("error", swallow, true);
});
function swallow(event: ErrorEvent) {
  if (event.error?.message === "kaboom") {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

class Bomb extends Component<{ shouldThrow: boolean }> {
  render() {
    if (this.props.shouldThrow) throw new Error("kaboom");
    return <div data-testid="recovered">recovered</div>;
  }
}

describe("ModuleErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ModuleErrorBoundary moduleId="demo">
        <div data-testid="ok">ok</div>
      </ModuleErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toBeInTheDocument();
  });

  it("captures a render error and surfaces the message + reload button", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ModuleErrorBoundary moduleId="agents">
        <Bomb shouldThrow={true} />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByTestId("module-crash-agents")).toBeInTheDocument();
    expect(screen.getAllByText(/kaboom/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /recargar módulo/i }),
    ).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it("recovers after Reload module is clicked when the failing prop changes", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Harness() {
      const [crash, setCrash] = useState(true);
      return (
        <>
          <button data-testid="fix" onClick={() => setCrash(false)}>fix</button>
          <ModuleErrorBoundary moduleId="agents">
            <Bomb shouldThrow={crash} />
          </ModuleErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId("module-crash-agents")).toBeInTheDocument();
    // Fix the failing prop, then ask the boundary to retry.
    fireEvent.click(screen.getByTestId("fix"));
    fireEvent.click(screen.getByRole("button", { name: /recargar módulo/i }));
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    errSpy.mockRestore();
  });
});
