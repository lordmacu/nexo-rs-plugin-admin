// M15.21 slice 3 — `AiDraftCard` render + interaction
// coverage. Focuses on the three terminal states (pending /
// approved / rejected) and the network paths the operator
// triggers via the action buttons. Network is stubbed at the
// `api/marketing` import boundary so the test never touches
// `fetch`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    approveDraft: vi.fn(),
    rejectDraft: vi.fn(),
    updateDraft: vi.fn(),
  };
});

import AiDraftCard from "../../src/modules/marketing/components/AiDraftCard";
import {
  approveDraft,
  rejectDraft,
  updateDraft,
  type ThreadMessage,
} from "../../src/api/marketing";
import { HttpError } from "../../src/api/client";

const approveMock = approveDraft as unknown as ReturnType<typeof vi.fn>;
const rejectMock = rejectDraft as unknown as ReturnType<typeof vi.fn>;
const updateMock = updateDraft as unknown as ReturnType<typeof vi.fn>;

const baseDraft: ThreadMessage = {
  id: "draft-1",
  direction: "draft",
  from_label: "AI",
  body: "Hola Juan, te paso la propuesta…",
  at_ms: 1700000000000,
  draft_status: "pending",
};

beforeEach(() => {
  approveMock.mockReset();
  rejectMock.mockReset();
  updateMock.mockReset();
});

afterEach(() => {
  approveMock.mockReset();
  rejectMock.mockReset();
  updateMock.mockReset();
});

describe("AiDraftCard render states", () => {
  it("renders the pending UI with action buttons", () => {
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
      />,
    );
    expect(
      screen.getByText(/IA Draft · pendiente de aprobación/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aprobar y enviar/i)).toBeInTheDocument();
    expect(screen.getByText(/Editar/i)).toBeInTheDocument();
    expect(screen.getByText(/Descartar/i)).toBeInTheDocument();
  });

  it("renders the approved banner when draft already approved", () => {
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={{ ...baseDraft, draft_status: "approved" }}
        sellerColor="#6366f1"
      />,
    );
    expect(screen.getByText(/Draft aprobado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aprobar y enviar/i)).toBeNull();
  });

  it("renders the rejected banner when draft already rejected", () => {
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={{ ...baseDraft, draft_status: "rejected" }}
        sellerColor="#6366f1"
      />,
    );
    expect(screen.getByText(/Draft descartado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aprobar y enviar/i)).toBeNull();
  });
});

describe("AiDraftCard interactions", () => {
  it("approve flips to approved on success and calls onChanged", async () => {
    approveMock.mockResolvedValue({
      draft_id: "draft-1",
      status: "approved",
      topic: "plugin.outbound.email.acme",
      outbound_message_id: "out-1",
      tracking_msg_id: null,
    });
    const onChanged = vi.fn();
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByText(/Aprobar y enviar/i));
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith("lead-1", "draft-1");
    });
    await waitFor(() => {
      expect(screen.getByText(/Draft aprobado/i)).toBeInTheDocument();
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("reject flips to rejected on success and calls onChanged", async () => {
    rejectMock.mockResolvedValue({
      draft_id: "draft-1",
      status: "rejected",
    });
    const onChanged = vi.fn();
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByText(/Descartar/i));
    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalledWith("lead-1", "draft-1");
    });
    await waitFor(() => {
      expect(screen.getByText(/Draft descartado/i)).toBeInTheDocument();
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("surfaces server error code in an inline alert without flipping state", async () => {
    approveMock.mockRejectedValue(
      new HttpError(412, { code: "compliance_blocked", message: "anti-loop" }),
    );
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
      />,
    );
    fireEvent.click(screen.getByText(/Aprobar y enviar/i));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /compliance_blocked/i,
      );
    });
    // Still pending — buttons remain.
    expect(screen.getByText(/Aprobar y enviar/i)).toBeInTheDocument();
  });

  it("editing → save & send PUTs body then approves", async () => {
    updateMock.mockResolvedValue({ draft_id: "draft-1" });
    approveMock.mockResolvedValue({
      draft_id: "draft-1",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
      />,
    );
    fireEvent.click(screen.getByText(/Editar/i));
    // Subject input + body textarea both register as
    // textboxes — pick the body via the textarea tag.
    const ta = screen
      .getAllByRole("textbox")
      .find((el): el is HTMLTextAreaElement => el.tagName === "TEXTAREA")!;
    fireEvent.change(ta, { target: { value: "Texto editado por operador" } });
    fireEvent.click(screen.getByText(/Guardar y enviar/i));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "lead-1",
        "draft-1",
        "Texto editado por operador",
        undefined,
      );
      expect(approveMock).toHaveBeenCalledWith("lead-1", "draft-1");
    });
    await waitFor(() => {
      expect(screen.getByText(/Draft aprobado/i)).toBeInTheDocument();
    });
  });

  it("editing → subject change forwards subject in PUT", async () => {
    updateMock.mockResolvedValue({ draft_id: "draft-1" });
    approveMock.mockResolvedValue({
      draft_id: "draft-1",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
      />,
    );
    fireEvent.click(screen.getByText(/Editar/i));
    const subjectInput = screen.getByLabelText(
      "draft-subject",
    ) as HTMLInputElement;
    fireEvent.change(subjectInput, { target: { value: "Promo de mayo" } });
    fireEvent.click(screen.getByText(/Guardar y enviar/i));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "lead-1",
        "draft-1",
        baseDraft.body,
        "Promo de mayo",
      );
    });
  });

  it("renders existing subject above body when not editing", async () => {
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={{ ...baseDraft, subject: "Re: Cot pricing custom" }}
        sellerColor="#6366f1"
      />,
    );
    expect(
      screen.getByText(/Re: Cot pricing custom/i),
    ).toBeInTheDocument();
  });

  it("editing → save & send skips PUT when body unchanged", async () => {
    approveMock.mockResolvedValue({
      draft_id: "draft-1",
      status: "approved",
      topic: "t",
      outbound_message_id: "o",
      tracking_msg_id: null,
    });
    render(
      <AiDraftCard
        leadId="lead-1"
        draft={baseDraft}
        sellerColor="#6366f1"
      />,
    );
    fireEvent.click(screen.getByText(/Editar/i));
    fireEvent.click(screen.getByText(/Guardar y enviar/i));
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalled();
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
