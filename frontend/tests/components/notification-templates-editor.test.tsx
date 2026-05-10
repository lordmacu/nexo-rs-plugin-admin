// Coverage for `readField` / `buildPayload` helpers +
// `NotificationTemplatesEditor` render path.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import NotificationTemplatesEditor, {
  buildPayload,
  readField,
} from "../../src/modules/marketing/components/NotificationTemplatesEditor";

describe("readField", () => {
  it("returns empty string when block missing", () => {
    expect(readField({}, "lead_created", "es")).toBe("");
  });
  it("returns empty string when locale missing", () => {
    expect(
      readField({ lead_created: { es: "Hola" } }, "lead_created", "en"),
    ).toBe("");
  });
  it("returns the persisted string", () => {
    expect(
      readField({ lead_created: { es: "Hola" } }, "lead_created", "es"),
    ).toBe("Hola");
  });
  it("treats non-object kind block as empty", () => {
    expect(
      readField(
        { lead_created: "weird" } as never,
        "lead_created",
        "es",
      ),
    ).toBe("");
  });
});

describe("buildPayload", () => {
  it("drops empty locale fields + empty kind blocks", () => {
    const payload = buildPayload({
      lead_created: { es: "Hola", en: "" },
      lead_replied: { es: "", en: "" },
      lead_transitioned: { es: "", en: "" },
      meeting_intent: { es: "", en: "" },
      draft_pending: { es: " ", en: "Draft awaits" },
    });
    expect(payload).toEqual({
      lead_created: { es: "Hola" },
      draft_pending: { en: "Draft awaits" },
    });
  });

  it("preserves whitespace inside non-empty fields", () => {
    const payload = buildPayload({
      lead_created: { es: "Hola\n{{from}}", en: "Hi {{from}}" },
      lead_replied: { es: "", en: "" },
      lead_transitioned: { es: "", en: "" },
      meeting_intent: { es: "", en: "" },
      draft_pending: { es: "", en: "" },
    });
    expect(payload.lead_created).toEqual({
      es: "Hola\n{{from}}",
      en: "Hi {{from}}",
    });
  });
});

describe("NotificationTemplatesEditor render", () => {
  it("renders a card per kind with locale textareas", () => {
    render(<NotificationTemplatesEditor initial={{}} onSave={async () => ({ kind: "ok" })} />);
    for (const k of [
      "lead_created",
      "lead_replied",
      "lead_transitioned",
      "meeting_intent",
      "draft_pending",
    ]) {
      expect(screen.getByTestId(`notif-kind-${k}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`notif-${k}-es`)).toBeInTheDocument();
      expect(screen.getByLabelText(`notif-${k}-en`)).toBeInTheDocument();
    }
  });

  it("populates fields from initial doc", () => {
    render(
      <NotificationTemplatesEditor
        initial={{
          lead_created: { es: "Hola", en: "Hi" },
          draft_pending: { en: "Draft awaits" },
        }}
        onSave={async () => ({ kind: "ok" })}
      />,
    );
    expect(screen.getByLabelText("notif-lead_created-es")).toHaveValue(
      "Hola",
    );
    expect(screen.getByLabelText("notif-lead_created-en")).toHaveValue("Hi");
    expect(screen.getByLabelText("notif-draft_pending-es")).toHaveValue("");
    expect(screen.getByLabelText("notif-draft_pending-en")).toHaveValue(
      "Draft awaits",
    );
  });

  it("Save fires onSave with the canonical payload", async () => {
    const onSave = vi.fn().mockResolvedValue({ kind: "ok" });
    render(
      <NotificationTemplatesEditor initial={{}} onSave={onSave} />,
    );
    fireEvent.change(screen.getByLabelText("notif-lead_created-es"), {
      target: { value: "Hola Juan" },
    });
    fireEvent.click(screen.getByText("Guardar templates"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        lead_created: { es: "Hola Juan" },
      });
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Guardado/);
    });
  });

  it("surfaces error from onSave inline", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ kind: "error", message: "store: nope" });
    render(
      <NotificationTemplatesEditor initial={{}} onSave={onSave} />,
    );
    fireEvent.change(screen.getByLabelText("notif-lead_created-es"), {
      target: { value: "Hola" },
    });
    fireEvent.click(screen.getByText("Guardar templates"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/store: nope/);
    });
  });

  it("renders restart-required note when onSave returns ok_restart_required", async () => {
    const onSave = vi.fn().mockResolvedValue({
      kind: "ok_restart_required",
      note: "Restart needed",
    });
    render(
      <NotificationTemplatesEditor initial={{}} onSave={onSave} />,
    );
    fireEvent.change(screen.getByLabelText("notif-lead_created-es"), {
      target: { value: "Hola" },
    });
    fireEvent.click(screen.getByText("Guardar templates"));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Restart needed/);
    });
  });
});
