// Coverage for MailboxFormEditor — field population +
// validation gates + save round-trip.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import MailboxFormEditor, {
  HHMM_RE,
  validHoursRange,
} from "../../src/modules/marketing/components/MailboxFormEditor";

const baseline = {
  id: "ventas",
  address: "ventas@acme.com",
  provider: "imap",
  mode: "idle",
  poll_interval_seconds: 60,
  active: true,
  draft_mode: true,
  email_plugin_instance: "default",
};

describe("MailboxFormEditor", () => {
  it("renders fields populated from initial", () => {
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    // ID is internal — derived server-side, hidden in UI.
    expect(screen.getByLabelText("mailbox-address")).toHaveValue(
      "ventas@acme.com",
    );
    expect(
      screen.getByLabelText("IDLE (push, recommended)"),
    ).toBeChecked();
    expect(screen.getByLabelText("mailbox-poll-interval")).toHaveValue(60);
    expect(screen.getByLabelText("mailbox-active")).toBeChecked();
    expect(screen.getByLabelText("mailbox-draft-mode")).toBeChecked();
    expect(screen.getByLabelText("mailbox-instance")).toHaveValue("default");
  });

  it("clamps poll_interval below 15 to 15", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("mailbox-poll-interval"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      poll_interval_seconds: 15,
    });
  });

  it("clamps poll_interval above 3600 to 3600", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("mailbox-poll-interval"), {
      target: { value: "9999" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      poll_interval_seconds: 3600,
    });
  });

  it("Save fires onSave with edited fields", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("mailbox-address"), {
      target: { value: "soporte@acme.com" },
    });
    fireEvent.click(screen.getByLabelText("Poll only"));
    fireEvent.click(screen.getByLabelText("mailbox-draft-mode"));
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith({
      ...baseline,
      address: "soporte@acme.com",
      mode: "poll",
      draft_mode: false,
    });
  });

  it("Save disabled when address invalid", () => {
    render(
      <MailboxFormEditor
        initial={{ ...baseline, address: "no-at-symbol" }}
        idLocked={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Guardar")).toBeDisabled();
  });

  it("Save disabled when id empty", () => {
    render(
      <MailboxFormEditor
        initial={{ ...baseline, id: "" }}
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
      <MailboxFormEditor
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
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Eliminar mailbox"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("toCanonical-style save preserves all fields", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith(baseline);
  });
});

// ── Active hours window (M15.18.b) ───────────────────────

describe("HHMM_RE", () => {
  it("accepts valid HH:MM strings", () => {
    expect(HHMM_RE.test("00:00")).toBe(true);
    expect(HHMM_RE.test("09:30")).toBe(true);
    expect(HHMM_RE.test("23:59")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(HHMM_RE.test("24:00")).toBe(false);
    expect(HHMM_RE.test("9:30")).toBe(false);
    expect(HHMM_RE.test("09:60")).toBe(false);
    expect(HHMM_RE.test("garbage")).toBe(false);
  });
});

describe("validHoursRange", () => {
  it("requires start < end", () => {
    expect(validHoursRange("09:00", "18:00")).toBe(true);
    expect(validHoursRange("18:00", "09:00")).toBe(false);
    expect(validHoursRange("09:00", "09:00")).toBe(false);
  });
  it("rejects malformed inputs", () => {
    expect(validHoursRange("9:00", "18:00")).toBe(false);
    expect(validHoursRange("09:00", "25:00")).toBe(false);
  });
});

describe("MailboxFormEditor active_hours", () => {
  it("section hidden when hours_enabled is off (default)", () => {
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByTestId("mailbox-active-hours")).toBeNull();
    // Save button enabled (no active_hours block to validate).
    expect(screen.getByText("Guardar")).not.toBeDisabled();
  });

  it("toggling enabled reveals the editor", () => {
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("mailbox-hours-enabled"));
    expect(screen.getByTestId("mailbox-active-hours")).toBeInTheDocument();
    expect(
      screen.getByLabelText("mailbox-day-mon_fri-enabled"),
    ).toBeChecked();
  });

  it("save persists active_hours payload when enabled", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("mailbox-hours-enabled"));
    fireEvent.change(screen.getByLabelText("mailbox-day-mon_fri-start"), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText("mailbox-day-mon_fri-end"), {
      target: { value: "19:00" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.active_hours).toMatchObject({
      timezone: "America/Bogota",
      mon_fri: { start: "08:00", end: "19:00" },
      saturday: null,
      sunday: null,
      off_hours_poll_seconds: 300,
    });
  });

  it("save omits active_hours block when disabled", () => {
    const onSave = vi.fn();
    render(
      <MailboxFormEditor
        initial={{
          ...baseline,
          active_hours: {
            timezone: "America/Bogota",
            mon_fri: { start: "07:00", end: "20:00" },
            saturday: null,
            sunday: null,
            off_hours_poll_seconds: 300,
          },
        }}
        idLocked={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    // Initial form state respects the persisted block
    // (hours_enabled inferred from presence).
    fireEvent.click(screen.getByLabelText("mailbox-hours-enabled"));
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.active_hours).toBeUndefined();
  });

  it("save disabled when no day window enabled in active_hours", () => {
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("mailbox-hours-enabled"));
    // mon_fri is on by default; turn it off so no day enabled.
    fireEvent.click(screen.getByLabelText("mailbox-day-mon_fri-enabled"));
    expect(screen.getByText("Guardar")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/al menos un día/i);
  });

  it("save disabled when start >= end", () => {
    render(
      <MailboxFormEditor
        initial={baseline}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("mailbox-hours-enabled"));
    fireEvent.change(screen.getByLabelText("mailbox-day-mon_fri-start"), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByLabelText("mailbox-day-mon_fri-end"), {
      target: { value: "07:00" },
    });
    expect(screen.getByText("Guardar")).toBeDisabled();
  });

  it("hydrates form from persisted active_hours block", () => {
    render(
      <MailboxFormEditor
        initial={{
          ...baseline,
          active_hours: {
            timezone: "Europe/Madrid",
            mon_fri: { start: "06:00", end: "21:00" },
            saturday: { start: "10:00", end: "14:00" },
            sunday: null,
            off_hours_poll_seconds: 600,
          },
        }}
        idLocked={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("mailbox-hours-enabled")).toBeChecked();
    expect(screen.getByLabelText("mailbox-hours-tz")).toHaveValue(
      "Europe/Madrid",
    );
    expect(screen.getByLabelText("mailbox-hours-off")).toHaveValue(600);
    expect(
      screen.getByLabelText("mailbox-day-mon_fri-start"),
    ).toHaveValue("06:00");
    expect(
      screen.getByLabelText("mailbox-day-saturday-enabled"),
    ).toBeChecked();
    expect(
      screen.getByLabelText("mailbox-day-sunday-enabled"),
    ).not.toBeChecked();
  });
});
