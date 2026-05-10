// F20 — `EngagementBadge` render coverage. The component
// stays silent for fresh sends (zero opens + zero clicks),
// renders a singular vs plural label correctly, expands
// the per-link breakdown on click, and stays silent on
// 404 / network failures so the lead drawer doesn't
// surface tracking-disabled noise.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    getEngagement: vi.fn(),
  };
});

import EngagementBadge from "../../src/modules/marketing/components/EngagementBadge";
import { getEngagement } from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

const getEngagementMock = getEngagement as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getEngagementMock.mockReset();
});

afterEach(() => {
  getEngagementMock.mockReset();
});

describe("EngagementBadge", () => {
  it("renders nothing while loading", () => {
    getEngagementMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<EngagementBadge msgId="m1" />);
    expect(container.firstChild).toBeNull();
  });

  it("stays silent when both opens and clicks are zero", async () => {
    getEngagementMock.mockResolvedValue({
      msg_id: "m1",
      tenant_id: "acme",
      opens: 0,
      clicks_by_link: [],
    });
    const { container } = render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(getEngagementMock).toHaveBeenCalledWith("m1");
    });
    // After resolution the component renders null so the
    // first child stays null.
    expect(container.firstChild).toBeNull();
  });

  it("renders singular labels when opens === 1 and clicks === 1", async () => {
    getEngagementMock.mockResolvedValue({
      msg_id: "m1",
      tenant_id: "acme",
      opens: 1,
      clicks_by_link: [{ link_id: "L0", count: 1 }],
    });
    render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(screen.getByLabelText("engagement-badge")).toBeInTheDocument();
    });
    expect(screen.getByText(/1 lectura/i)).toBeInTheDocument();
    expect(screen.getByText(/1 click/i)).toBeInTheDocument();
  });

  it("renders plural labels when opens > 1 and clicks > 1", async () => {
    getEngagementMock.mockResolvedValue({
      msg_id: "m1",
      tenant_id: "acme",
      opens: 3,
      clicks_by_link: [
        { link_id: "L0", count: 2 },
        { link_id: "L1", count: 1 },
      ],
    });
    render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(screen.getByText(/3 lecturas/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/3 clicks/i)).toBeInTheDocument();
  });

  it("expands the per-link breakdown on click when clicks > 0", async () => {
    getEngagementMock.mockResolvedValue({
      msg_id: "m1",
      tenant_id: "acme",
      opens: 0,
      clicks_by_link: [
        { link_id: "L0", count: 5 },
        { link_id: "L1", count: 2 },
      ],
    });
    render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(screen.getByLabelText("engagement-badge")).toBeInTheDocument();
    });
    // List entries hidden by default.
    expect(screen.queryByText("L0")).toBeNull();
    fireEvent.click(screen.getByLabelText("engagement-badge"));
    expect(screen.getByText("L0")).toBeInTheDocument();
    expect(screen.getByText("L1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("stays silent on 404 tracking_disabled", async () => {
    getEngagementMock.mockRejectedValue(
      new HttpError(404, { error: { code: "tracking_disabled" } }),
    );
    const { container } = render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(getEngagementMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("stays silent on transient network error", async () => {
    getEngagementMock.mockRejectedValue(new Error("network blip"));
    const { container } = render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(getEngagementMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("refetches when msgId prop changes", async () => {
    getEngagementMock.mockResolvedValueOnce({
      msg_id: "m1",
      tenant_id: "acme",
      opens: 1,
      clicks_by_link: [],
    });
    const { rerender } = render(<EngagementBadge msgId="m1" />);
    await waitFor(() => {
      expect(getEngagementMock).toHaveBeenCalledWith("m1");
    });
    getEngagementMock.mockResolvedValueOnce({
      msg_id: "m2",
      tenant_id: "acme",
      opens: 4,
      clicks_by_link: [],
    });
    rerender(<EngagementBadge msgId="m2" />);
    await waitFor(() => {
      expect(getEngagementMock).toHaveBeenCalledWith("m2");
    });
    await waitFor(() => {
      expect(screen.getByText(/4 lecturas/i)).toBeInTheDocument();
    });
  });
});
