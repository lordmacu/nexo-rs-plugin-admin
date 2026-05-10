// M15.23.g — coverage for the SellerForm vacation toggle
// + vacation_until date picker. Validates the round-trip
// (load persisted RFC 3339 → YYYY-MM-DD form value →
// save as end-of-day RFC 3339).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn().mockResolvedValue({ agents: [] }),
}));
vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    saveSellers: vi.fn(),
  };
});

import SellerForm from "../../src/modules/marketing/components/SellerForm";

const baseline = {
  id: "pedro",
  tenant_id: "acme",
  name: "Pedro García",
  primary_email: "pedro@acme.com",
  alt_emails: [],
  signature_text: "—\nPedro",
  on_vacation: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("SellerForm vacation surface", () => {
  it("renders the vacation toggle off by default", () => {
    render(
      <SellerForm
        initial={null}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    const toggle = screen.getByLabelText(
      "seller-on-vacation",
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    // Date picker hidden until toggle on.
    expect(screen.queryByLabelText("seller-vacation-until")).toBeNull();
  });

  it("hydrates from persisted on_vacation + vacation_until", () => {
    render(
      <SellerForm
        initial={{
          ...baseline,
          on_vacation: true,
          vacation_until: "2026-08-15T23:59:59Z",
        }}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    const toggle = screen.getByLabelText(
      "seller-on-vacation",
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    const date = screen.getByLabelText(
      "seller-vacation-until",
    ) as HTMLInputElement;
    expect(date.value).toBe("2026-08-15");
  });

  it("date picker reveals when toggle flips on", () => {
    render(
      <SellerForm
        initial={baseline}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("seller-on-vacation"));
    expect(
      screen.getByLabelText("seller-vacation-until"),
    ).toBeInTheDocument();
  });

  it("clear button drops the date back to empty", () => {
    render(
      <SellerForm
        initial={{
          ...baseline,
          on_vacation: true,
          vacation_until: "2026-08-15T23:59:59Z",
        }}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("seller-vacation-until-clear"));
    const date = screen.getByLabelText(
      "seller-vacation-until",
    ) as HTMLInputElement;
    expect(date.value).toBe("");
  });

  it("save persists vacation fields when enabled", async () => {
    const onSave = vi.fn().mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={baseline}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("seller-on-vacation"));
    const date = screen.getByLabelText(
      "seller-vacation-until",
    ) as HTMLInputElement;
    fireEvent.change(date, { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByText(/Guardar cambios|Crear seller/));
    // Drain the async save handler.
    await new Promise((r) => setTimeout(r, 0));
    expect(onSave).toHaveBeenCalled();
    const arg = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.on_vacation).toBe(true);
    expect(arg.vacation_until).toBe("2026-09-01T23:59:59Z");
  });

  it("save omits vacation_until when toggle is off", async () => {
    const onSave = vi.fn().mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={baseline}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(/Guardar cambios|Crear seller/));
    await new Promise((r) => setTimeout(r, 0));
    const arg = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.on_vacation).toBe(false);
    expect(arg.vacation_until).toBeUndefined();
  });

  it("save with toggle on but no date yields on_vacation=true and no vacation_until", async () => {
    const onSave = vi.fn().mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={baseline}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("seller-on-vacation"));
    fireEvent.click(screen.getByText(/Guardar cambios|Crear seller/));
    await new Promise((r) => setTimeout(r, 0));
    const arg = onSave.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.on_vacation).toBe(true);
    expect(arg.vacation_until).toBeUndefined();
  });
});
