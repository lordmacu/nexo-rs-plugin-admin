// Coverage for `TemplateEditor` form. Mirrors snippet
// editor specs since the shape is similar.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TemplateEditor from "../../src/modules/marketing/components/TemplateEditor";

const baseline = {
  id: "warm-intro",
  name: "Warm intro",
  description: "Outbound a leads engaged",
  body: "Hola {{person.name}}, gracias por tu interés.",
};

describe("TemplateEditor", () => {
  it("renders fields populated from initial", () => {
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("template-id")).toHaveValue("warm-intro");
    expect(screen.getByLabelText("template-name")).toHaveValue("Warm intro");
    expect(screen.getByLabelText("template-description")).toHaveValue(
      "Outbound a leads engaged",
    );
    expect(screen.getByLabelText("template-body")).toHaveValue(
      "Hola {{person.name}}, gracias por tu interés.",
    );
  });

  it("disables id input when idLocked", () => {
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("template-id")).toBeDisabled();
  });

  it("Save fires onSave with edited fields", () => {
    const onSave = vi.fn();
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("template-name"), {
      target: { value: "Warm intro v2" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith({
      ...baseline,
      name: "Warm intro v2",
    });
  });

  it("clears description when input goes empty (drops field)", () => {
    const onSave = vi.fn();
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("template-description"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0];
    expect(arg).not.toHaveProperty("description");
  });

  it("Save disabled when name or body empty", () => {
    render(
      <TemplateEditor
        initial={{ id: "x", name: "", body: "" }}
        idLocked={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Guardar")).toBeDisabled();
  });

  it("Cancel fires onCancel without onSave", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Eliminar fires onDelete when provided", () => {
    const onDelete = vi.fn();
    render(
      <TemplateEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Eliminar"));
    expect(onDelete).toHaveBeenCalled();
  });
});
