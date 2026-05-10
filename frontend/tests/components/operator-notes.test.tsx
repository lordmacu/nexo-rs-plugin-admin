// M15.21.notes — coverage for the OperatorNotes scratch-pad
// component embedded in the lead drawer. Validates the
// Save / Cancel / Clear flow + the empty-string-to-null
// normalisation contract.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/api/marketing")
  >("../../src/api/marketing");
  return {
    ...actual,
    updateLeadNotes: vi.fn(),
  };
});

import OperatorNotes from "../../src/modules/marketing/components/OperatorNotes";
import { updateLeadNotes } from "../../src/api/marketing";

const updateLeadNotesMock = vi.mocked(updateLeadNotes);

beforeEach(() => {
  vi.clearAllMocks();
  updateLeadNotesMock.mockResolvedValue({ lead: {} as never });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("OperatorNotes — M15.21.notes", () => {
  it("renders empty state with the placeholder hint when no notes exist", () => {
    render(<OperatorNotes leadId="l-1" initialNotes={null} />);
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("");
    // Save + Cancel start disabled (no draft).
    expect(
      (screen.getByTestId("operator-notes-save") as HTMLButtonElement).disabled,
    ).toBe(true);
    // Clear button is hidden when there's nothing to clear.
    expect(screen.queryByTestId("operator-notes-clear")).toBeNull();
  });

  it("treats undefined initialNotes as empty (back-compat with omit-on-wire)", () => {
    render(<OperatorNotes leadId="l-1" initialNotes={undefined} />);
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("");
  });

  it("renders the persisted markdown verbatim", () => {
    render(
      <OperatorNotes leadId="l-1" initialNotes="**WIN** — called pedro" />,
    );
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("**WIN** — called pedro");
  });

  it("typing enables Save + Cancel and stamps onSaved on success", async () => {
    const onSaved = vi.fn();
    render(
      <OperatorNotes leadId="l-1" initialNotes={null} onSaved={onSaved} />,
    );
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "called PA" } });
    const save = screen.getByTestId("operator-notes-save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => {
      expect(updateLeadNotesMock).toHaveBeenCalledWith("l-1", "called PA");
    });
    expect(onSaved).toHaveBeenCalledWith("called PA");
  });

  it("Save with an empty draft sends null on the wire (not empty string)", async () => {
    const onSaved = vi.fn();
    render(
      <OperatorNotes
        leadId="l-1"
        initialNotes="prior content"
        onSaved={onSaved}
      />,
    );
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("operator-notes-save"));
    await waitFor(() => {
      expect(updateLeadNotesMock).toHaveBeenCalledWith("l-1", null);
    });
    expect(onSaved).toHaveBeenCalledWith(null);
  });

  it("Cancel restores the persisted draft and disables the buttons", () => {
    render(<OperatorNotes leadId="l-1" initialNotes="seed" />);
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "draft change" } });
    fireEvent.click(screen.getByTestId("operator-notes-cancel"));
    expect(ta.value).toBe("seed");
    expect(
      (screen.getByTestId("operator-notes-save") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("Clear hits the wire with null and resets the editor", async () => {
    const onSaved = vi.fn();
    render(
      <OperatorNotes
        leadId="l-1"
        initialNotes="something"
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByTestId("operator-notes-clear"));
    await waitFor(() => {
      expect(updateLeadNotesMock).toHaveBeenCalledWith("l-1", null);
    });
    expect(onSaved).toHaveBeenCalledWith(null);
  });

  it("surfaces the API error message", async () => {
    updateLeadNotesMock.mockRejectedValueOnce(new Error("404 lead_not_found"));
    render(<OperatorNotes leadId="l-1" initialNotes={null} />);
    fireEvent.change(screen.getByTestId("operator-notes-textarea"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByTestId("operator-notes-save"));
    await waitFor(() => {
      expect(screen.getByTestId("operator-notes-error").textContent).toContain(
        "404 lead_not_found",
      );
    });
  });

  it("switching the lead id resets the draft to the new initialNotes", () => {
    const { rerender } = render(
      <OperatorNotes leadId="l-1" initialNotes="A" />,
    );
    const ta = screen.getByTestId(
      "operator-notes-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "in-flight edit" } });
    rerender(<OperatorNotes leadId="l-2" initialNotes="B" />);
    expect(ta.value).toBe("B");
  });
});
