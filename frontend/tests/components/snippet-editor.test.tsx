// `SnippetEditor` form coverage. Edits flow into onSave
// with the canonical Snippet shape; idLocked + delete
// affordance gated on the prop.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SnippetEditor from "../../src/modules/marketing/components/SnippetEditor";

const baseline = {
  id: "saludo",
  name: "Saludo cordial",
  shortcut: "/saludo",
  body: "Hola {{person.name}},",
};

describe("SnippetEditor", () => {
  it("renders fields populated from initial", () => {
    render(
      <SnippetEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("snippet-id")).toHaveValue("saludo");
    expect(screen.getByLabelText("snippet-name")).toHaveValue(
      "Saludo cordial",
    );
    expect(screen.getByLabelText("snippet-shortcut")).toHaveValue(
      "/saludo",
    );
    expect(screen.getByLabelText("snippet-body")).toHaveValue(
      "Hola {{person.name}},",
    );
  });

  it("disables id input when idLocked", () => {
    render(
      <SnippetEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("snippet-id")).toBeDisabled();
  });

  it("Save fires onSave with edited fields", () => {
    const onSave = vi.fn();
    render(
      <SnippetEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("snippet-name"), {
      target: { value: "Saludo nuevo" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith({
      ...baseline,
      name: "Saludo nuevo",
    });
  });

  it("clears shortcut when input goes empty (drops field)", () => {
    const onSave = vi.fn();
    render(
      <SnippetEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("snippet-shortcut"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0];
    expect(arg).not.toHaveProperty("shortcut");
  });

  it("Save disabled when name or body empty", () => {
    render(
      <SnippetEditor
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
      <SnippetEditor
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
      <SnippetEditor
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
