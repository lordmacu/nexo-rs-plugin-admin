// M15.24 — `HealthView` render coverage.
// `getTelemetry` mocked at the api/marketing import
// boundary so the test never touches fetch / setInterval.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    getTelemetry: vi.fn(),
  };
});

import HealthView from "../../src/modules/marketing/HealthView";
import { getTelemetry } from "../../src/api/marketing";

const getTelemetryMock = getTelemetry as unknown as ReturnType<typeof vi.fn>;

const fixture = {
  tenant_id: "acme",
  now_ms: 1_700_000_000_000,
  window_hours: 24,
  since_ms: 1_699_913_600_000,
  leads_by_state: {
    cold: 4,
    engaged: 2,
    meeting_scheduled: 1,
    qualified: 0,
    lost: 0,
  },
  drafts_pending: 3,
  inbound_messages: 7,
  outbound_messages: 5,
};

beforeEach(() => {
  getTelemetryMock.mockReset();
});

afterEach(() => {
  getTelemetryMock.mockReset();
});

describe("HealthView", () => {
  it("shows loading state before the first response", () => {
    getTelemetryMock.mockReturnValue(new Promise(() => {}));
    render(<HealthView />);
    expect(screen.getByText(/Cargando snapshot/i)).toBeInTheDocument();
  });

  it("renders the leads-by-state grid", async () => {
    getTelemetryMock.mockResolvedValue(fixture);
    render(<HealthView />);
    await waitFor(() => {
      expect(screen.getByTestId("leads-by-state-grid")).toBeInTheDocument();
    });
    expect(screen.getByText("Cold")).toBeInTheDocument();
    expect(screen.getByText("Engaged")).toBeInTheDocument();
    expect(screen.getByText("Meeting")).toBeInTheDocument();
    expect(screen.getByText("Qualified")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    // Numbers from the fixture flow through.
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the headline cards", async () => {
    getTelemetryMock.mockResolvedValue(fixture);
    render(<HealthView />);
    await waitFor(() => {
      expect(screen.getByText("Drafts pendientes")).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("re-fires getTelemetry when the window select changes", async () => {
    getTelemetryMock.mockResolvedValue(fixture);
    render(<HealthView />);
    await waitFor(() => {
      expect(getTelemetryMock).toHaveBeenCalledWith({ window_hours: 24 });
    });
    const select = screen.getByLabelText(/Ventana/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "168" } });
    await waitFor(() => {
      expect(getTelemetryMock).toHaveBeenCalledWith({ window_hours: 168 });
    });
  });

  it("Refrescar button re-fires the request", async () => {
    getTelemetryMock.mockResolvedValue(fixture);
    render(<HealthView />);
    await waitFor(() => {
      expect(getTelemetryMock).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByText("Refrescar"));
    await waitFor(() => {
      expect(getTelemetryMock).toHaveBeenCalledTimes(2);
    });
  });

  it("surfaces error banner when the request rejects", async () => {
    getTelemetryMock.mockRejectedValue(new Error("network blip"));
    render(<HealthView />);
    await waitFor(() => {
      expect(
        screen.getByText(/Telemetría no disponible · network blip/i),
      ).toBeInTheDocument();
    });
  });
});
