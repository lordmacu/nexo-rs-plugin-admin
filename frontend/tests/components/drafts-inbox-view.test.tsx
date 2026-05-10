// `DraftsInboxView` render + interaction coverage. The
// inbox stubs `listDraftsInbox` + `approveDraft` +
// `rejectDraft` at the api/marketing import boundary.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    listDraftsInbox: vi.fn(),
    approveDraft: vi.fn(),
    rejectDraft: vi.fn(),
  };
});

import DraftsInboxView, {
  filterRows,
} from "../../src/modules/marketing/DraftsInboxView";
import {
  approveDraft,
  listDraftsInbox,
  rejectDraft,
  type PendingDraftRow,
} from "../../src/api/marketing";

const listMock = listDraftsInbox as unknown as ReturnType<typeof vi.fn>;
const approveMock = approveDraft as unknown as ReturnType<typeof vi.fn>;
const rejectMock = rejectDraft as unknown as ReturnType<typeof vi.fn>;

const fixtureRow: PendingDraftRow = {
  lead_id: "l-1",
  message_id: "d-1",
  from_label: "AI",
  body: "Hola Juan, te paso la propuesta…",
  at_ms: 1_700_000_000_000,
  lead_subject: "Cotización planes Pro",
  lead_seller_id: "pedro",
  lead_person_id: "juan@acme.com",
  lead_state: "engaged",
};

beforeEach(() => {
  listMock.mockReset();
  approveMock.mockReset();
  rejectMock.mockReset();
});

afterEach(() => {
  listMock.mockReset();
  approveMock.mockReset();
  rejectMock.mockReset();
});

function renderView() {
  return render(
    <MemoryRouter>
      <DraftsInboxView />
    </MemoryRouter>,
  );
}

describe("DraftsInboxView", () => {
  it("shows loading state before the first response", () => {
    listMock.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByText(/Cargando…/i)).toBeInTheDocument();
  });

  it("renders empty-state when no pending rows return", async () => {
    listMock.mockResolvedValue({ drafts: [], count: 0, limit: 50 });
    renderView();
    await waitFor(() => {
      expect(
        screen.getByText(/Sin drafts pendientes/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the list with lead context per row", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow],
      count: 1,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-inbox-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Cotización planes Pro")).toBeInTheDocument();
    expect(screen.getByText("juan@acme.com")).toBeInTheDocument();
    expect(screen.getByText("pedro")).toBeInTheDocument();
    expect(screen.getByText(/engaged/i)).toBeInTheDocument();
    expect(screen.getByText(/te paso la propuesta/i)).toBeInTheDocument();
  });

  it("singular vs plural counter label", async () => {
    listMock.mockResolvedValueOnce({
      drafts: [fixtureRow],
      count: 1,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByText(/1 aprobacion esperando/i)).toBeInTheDocument();
    });
  });

  it("Aprobar fires approveDraft and refreshes the list", async () => {
    listMock
      .mockResolvedValueOnce({
        drafts: [fixtureRow],
        count: 1,
        limit: 50,
      })
      .mockResolvedValueOnce({ drafts: [], count: 0, limit: 50 });
    approveMock.mockResolvedValue({
      draft_id: "d-1",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Aprobar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Aprobar"));
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith("l-1", "d-1");
    });
    await waitFor(() => {
      expect(listMock).toHaveBeenCalledTimes(2);
    });
  });

  it("Descartar fires rejectDraft and refreshes the list", async () => {
    listMock
      .mockResolvedValueOnce({
        drafts: [fixtureRow],
        count: 1,
        limit: 50,
      })
      .mockResolvedValueOnce({ drafts: [], count: 0, limit: 50 });
    rejectMock.mockResolvedValue({
      draft_id: "d-1",
      status: "rejected",
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Descartar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Descartar"));
    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalledWith("l-1", "d-1");
    });
  });

  it("surfaces error code inline without removing the row", async () => {
    listMock.mockResolvedValueOnce({
      drafts: [fixtureRow],
      count: 1,
      limit: 50,
    });
    const { HttpError } = await import("../../src/api/client");
    approveMock.mockRejectedValue(
      new HttpError(412, { code: "outbound_blocked" }),
    );
    renderView();
    await waitFor(() => {
      expect(screen.getByText("Aprobar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Aprobar"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/outbound_blocked/i);
    });
    // Row still visible.
    expect(screen.getByText("Cotización planes Pro")).toBeInTheDocument();
  });

  it("surfaces inbox-level error when the GET fails", async () => {
    listMock.mockRejectedValue(new Error("network blip"));
    renderView();
    await waitFor(() => {
      expect(
        screen.getByText(/Inbox no disponible · network blip/i),
      ).toBeInTheDocument();
    });
  });
});

// ── Filter logic ─────────────────────────────────────────────

describe("filterRows", () => {
  const r1 = { ...fixtureRow };
  const r2 = {
    ...fixtureRow,
    message_id: "d-2",
    lead_seller_id: "ana",
    lead_state: "qualified",
  };
  const r3 = {
    ...fixtureRow,
    message_id: "d-3",
    lead_seller_id: "pedro",
    lead_state: "cold",
  };
  it("returns all when filter empty", () => {
    expect(
      filterRows([r1, r2, r3], { seller: null, state: null }),
    ).toHaveLength(3);
  });
  it("filters by seller alone", () => {
    const out = filterRows([r1, r2, r3], {
      seller: "pedro",
      state: null,
    });
    expect(out.map((r) => r.message_id)).toEqual(["d-1", "d-3"]);
  });
  it("filters by state alone", () => {
    const out = filterRows([r1, r2, r3], {
      seller: null,
      state: "engaged",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.message_id).toBe("d-1");
  });
  it("AND-combines both axes", () => {
    const out = filterRows([r1, r2, r3], {
      seller: "pedro",
      state: "cold",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.message_id).toBe("d-3");
  });
});

// ── Bulk actions ─────────────────────────────────────────────

const fixtureRow2: PendingDraftRow = {
  ...fixtureRow,
  message_id: "d-2",
  body: "Otro draft pendiente",
  lead_subject: "Cot pricing 2",
};

describe("DraftsInboxView bulk", () => {
  it("renders the bulk bar when rows present", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRow2],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-bulk-bar")).toBeInTheDocument();
    });
    expect(screen.getByText(/Selección vacía/i)).toBeInTheDocument();
    // Bulk buttons disabled when nothing selected.
    expect(screen.getByLabelText("bulk-approve")).toBeDisabled();
    expect(screen.getByLabelText("bulk-reject")).toBeDisabled();
  });

  it("select-all enables bulk buttons + shows count", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRow2],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("select-all"));
    expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();
    expect(screen.getByLabelText("bulk-approve")).not.toBeDisabled();
    expect(screen.getByLabelText("bulk-reject")).not.toBeDisabled();
  });

  it("bulk approve confirms then iterates approveDraft per selected row", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    listMock
      .mockResolvedValueOnce({
        drafts: [fixtureRow, fixtureRow2],
        count: 2,
        limit: 50,
      })
      .mockResolvedValueOnce({ drafts: [], count: 0, limit: 50 });
    approveMock.mockResolvedValue({
      draft_id: "d",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("select-all"));
    fireEvent.click(screen.getByLabelText("bulk-approve"));
    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledTimes(2);
    });
    expect(approveMock).toHaveBeenNthCalledWith(1, "l-1", "d-1");
    expect(approveMock).toHaveBeenNthCalledWith(2, "l-1", "d-2");
    await waitFor(() => {
      expect(screen.getByTestId("drafts-bulk-summary")).toHaveTextContent(
        /2 OK/,
      );
    });
    confirmSpy.mockRestore();
  });

  it("bulk approve aborts when window.confirm is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    listMock.mockResolvedValue({
      drafts: [fixtureRow],
      count: 1,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("select-all"));
    fireEvent.click(screen.getByLabelText("bulk-approve"));
    expect(approveMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("bulk reject does not prompt for confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    listMock
      .mockResolvedValueOnce({
        drafts: [fixtureRow],
        count: 1,
        limit: 50,
      })
      .mockResolvedValueOnce({ drafts: [], count: 0, limit: 50 });
    rejectMock.mockResolvedValue({
      draft_id: "d-1",
      status: "rejected",
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("select-all"));
    fireEvent.click(screen.getByLabelText("bulk-reject"));
    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalledWith("l-1", "d-1");
    });
    confirmSpy.mockRestore();
  });

  it("bulk approve aggregates failures into the summary", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRow2],
      count: 2,
      limit: 50,
    });
    approveMock
      .mockResolvedValueOnce({
        draft_id: "d-1",
        status: "approved",
        topic: "t",
        outbound_message_id: "o",
        tracking_msg_id: null,
      })
      .mockRejectedValueOnce(
        new (await import("../../src/api/client")).HttpError(412, {
          code: "outbound_blocked",
        }),
      );
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("select-all"));
    fireEvent.click(screen.getByLabelText("bulk-approve"));
    await waitFor(() => {
      expect(screen.getByTestId("drafts-bulk-summary")).toHaveTextContent(
        /1 OK/,
      );
    });
    expect(screen.getByTestId("drafts-bulk-summary")).toHaveTextContent(
      /1 fallaron/,
    );
    expect(screen.getByTestId("drafts-bulk-summary")).toHaveTextContent(
      /outbound_blocked/,
    );
    confirmSpy.mockRestore();
  });
});

// ── Filter chips render ──────────────────────────────────────

const fixtureRowAna: PendingDraftRow = {
  ...fixtureRow,
  message_id: "d-2",
  lead_seller_id: "ana",
  lead_subject: "Cot por Ana",
  lead_state: "qualified",
};

describe("DraftsInboxView filters", () => {
  it("hides filter bar when only one seller + one state", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow],
      count: 1,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-bulk-bar")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("drafts-filter-bar")).toBeNull();
  });

  it("renders filter bar when multiple sellers / states present", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRowAna],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-filter-bar")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("filter-seller-pedro")).toBeInTheDocument();
    expect(screen.getByLabelText("filter-seller-ana")).toBeInTheDocument();
    expect(screen.getByLabelText("filter-estado-engaged")).toBeInTheDocument();
    expect(screen.getByLabelText("filter-estado-qualified")).toBeInTheDocument();
  });

  it("clicking a seller chip narrows the visible list", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRowAna],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-filter-bar")).toBeInTheDocument();
    });
    expect(screen.getByText("Cotización planes Pro")).toBeInTheDocument();
    expect(screen.getByText("Cot por Ana")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("filter-seller-pedro"));
    expect(screen.getByText("Cotización planes Pro")).toBeInTheDocument();
    expect(screen.queryByText("Cot por Ana")).toBeNull();
    // Visible-count chip surfaces.
    expect(screen.getByText(/1 de 2 visibles/)).toBeInTheDocument();
  });

  it("clicking the same chip again clears the filter", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRowAna],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-filter-bar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("filter-seller-pedro"));
    fireEvent.click(screen.getByLabelText("filter-seller-pedro"));
    expect(screen.getByText("Cot por Ana")).toBeInTheDocument();
    expect(screen.queryByText(/de 2 visibles/)).toBeNull();
  });

  it("bulk approve only fires for visible+selected rows", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    listMock
      .mockResolvedValueOnce({
        drafts: [fixtureRow, fixtureRowAna],
        count: 2,
        limit: 50,
      })
      .mockResolvedValueOnce({ drafts: [], count: 0, limit: 50 });
    approveMock.mockResolvedValue({
      draft_id: "d",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByLabelText("select-all")).toBeInTheDocument();
    });
    // Select all (both rows) THEN narrow filter to ana.
    fireEvent.click(screen.getByLabelText("select-all"));
    fireEvent.click(screen.getByLabelText("filter-seller-ana"));
    fireEvent.click(screen.getByLabelText("bulk-approve"));
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledTimes(1);
    });
    expect(approveMock).toHaveBeenCalledWith("l-1", "d-2");
    confirmSpy.mockRestore();
  });

  it("empty-state surfaces when filter excludes every row", async () => {
    listMock.mockResolvedValue({
      drafts: [fixtureRow, fixtureRowAna],
      count: 2,
      limit: 50,
    });
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId("drafts-filter-bar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("filter-seller-pedro"));
    fireEvent.click(screen.getByLabelText("filter-estado-qualified"));
    expect(
      screen.getByText(/Ningún draft coincide con el filtro activo/i),
    ).toBeInTheDocument();
  });
});
