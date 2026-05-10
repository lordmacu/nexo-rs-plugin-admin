// Coverage for `parseInterval` / `formatInterval` /
// `cadencePreview` (pure helpers) + `FollowupProfileEditor`
// render + interaction.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FollowupProfileEditor, {
  cadencePreview,
  formatInterval,
  parseInterval,
} from "../../src/modules/marketing/components/FollowupProfileEditor";

describe("parseInterval / formatInterval", () => {
  it("round-trips canonical strings", () => {
    expect(formatInterval(parseInterval("24h"))).toBe("24h");
    expect(formatInterval(parseInterval("3d"))).toBe("3d");
    expect(formatInterval(parseInterval("12h"))).toBe("12h");
  });

  it("trims whitespace and lowercases the unit", () => {
    expect(parseInterval("  3D ")).toEqual({ value: 3, unit: "d" });
    expect(parseInterval("12 H")).toEqual({ value: 12, unit: "h" });
  });

  it("falls back to 1d on malformed strings", () => {
    expect(parseInterval("garbage")).toEqual({ value: 1, unit: "d" });
    expect(parseInterval("")).toEqual({ value: 1, unit: "d" });
  });

  it("clamps zero or negative to 1", () => {
    expect(parseInterval("0d")).toEqual({ value: 1, unit: "d" });
  });
});

describe("cadencePreview", () => {
  it("rolls over interval sums into absolute timestamps", () => {
    const out = cadencePreview([
      { value: 1, unit: "d" },
      { value: 3, unit: "d" },
      { value: 7, unit: "d" },
    ]);
    expect(out.map((s) => s.label)).toEqual([
      "Día +1",
      "Día +4",
      "Día +11",
    ]);
  });

  it("renders hour labels when sub-day intervals don't align", () => {
    const out = cadencePreview([
      { value: 12, unit: "h" },
      { value: 24, unit: "h" },
    ]);
    expect(out[0]?.label).toBe("Hora +12");
    expect(out[1]?.absHours).toBe(36);
    expect(out[1]?.label).toBe("Hora +36");
  });
});

describe("FollowupProfileEditor render", () => {
  const initial = {
    id: "default",
    cadence: ["1d", "3d", "7d"],
    max_attempts: 3,
    stop_on_reply: true,
  };

  it("renders fields populated from initial profile", () => {
    render(
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("profile-id")).toHaveValue("default");
    expect(screen.getByLabelText("max-attempts")).toHaveValue(3);
    expect(screen.getByLabelText("stop-on-reply")).toBeChecked();
    expect(screen.getByLabelText("cadence-value-0")).toHaveValue(1);
  });

  it("renders timeline preview", () => {
    render(
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("cadence-timeline")).toBeInTheDocument();
    expect(screen.getByText(/Día \+1 → followup #1/)).toBeInTheDocument();
    expect(screen.getByText(/Día \+4 → followup #2/)).toBeInTheDocument();
    expect(screen.getByText(/Día \+11 → followup #3/)).toBeInTheDocument();
  });

  it("disables id input when idLocked", () => {
    render(
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("profile-id")).toBeDisabled();
  });

  it("enables id input when creating a new profile", () => {
    render(
      <FollowupProfileEditor
        initial={{ id: "new", cadence: ["1d"], max_attempts: 1 }}
        idLocked={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("profile-id")).not.toBeDisabled();
  });

  it("Save fires onSave with edited cadence", () => {
    const onSave = vi.fn();
    render(
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("cadence-value-0"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith({
      id: "default",
      cadence: ["2d", "3d", "7d"],
      max_attempts: 3,
      stop_on_reply: true,
    });
  });

  it("Add interval extends the cadence list", () => {
    const onSave = vi.fn();
    render(
      <FollowupProfileEditor
        initial={{ id: "x", cadence: ["1d"], max_attempts: 1 }}
        idLocked={false}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("cadence-add"));
    expect(screen.getByLabelText("cadence-value-1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      cadence: ["1d", "1d"],
    });
  });

  it("Remove interval drops the row", () => {
    const onSave = vi.fn();
    render(
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("cadence-remove-0"));
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      cadence: ["3d", "7d"],
    });
  });

  it("Save disabled when cadence empty", () => {
    render(
      <FollowupProfileEditor
        initial={{ id: "x", cadence: [], max_attempts: 1 }}
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
      <FollowupProfileEditor
        initial={initial}
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
      <FollowupProfileEditor
        initial={initial}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText(/Eliminar profile/i));
    expect(onDelete).toHaveBeenCalled();
  });
});
