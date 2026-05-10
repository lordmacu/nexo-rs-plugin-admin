// M15.21.seller-template — coverage for the per-seller
// draft template override field in SellerForm. Validates the
// round-trip + the inherit-on-empty save semantic (drop the
// key entirely when the operator left the field blank).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn().mockResolvedValue({ agents: [] }),
}));
vi.mock("../../src/api/marketing", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/api/marketing")
  >("../../src/api/marketing");
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

describe("SellerForm draft_template override — M15.21", () => {
  it("renders empty by default with the inherit hint visible", () => {
    render(
      <SellerForm
        initial={null}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    const ta = screen.getByTestId(
      "seller-draft-template",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("");
    expect(
      screen.getByText(/usa la plantilla del tenant/i),
    ).toBeInTheDocument();
  });

  it("hydrates from a persisted override", () => {
    render(
      <SellerForm
        initial={{
          ...baseline,
          draft_template: "Hola {{person.name}}, soy {{seller.name}}.",
        }}
        onSave={async () => ({ kind: "ok" })}
        onClose={() => {}}
      />,
    );
    const ta = screen.getByTestId(
      "seller-draft-template",
    ) as HTMLTextAreaElement;
    expect(ta.value).toBe("Hola {{person.name}}, soy {{seller.name}}.");
    // Hint hidden when override is set.
    expect(
      screen.queryByText(/usa la plantilla del tenant/i),
    ).toBeNull();
  });

  it("save with a non-empty override emits draft_template on the wire", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={baseline}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-draft-template"), {
      target: { value: "Override body" },
    });
    fireEvent.click(screen.getByText(/Guardar/i));
    // Wait for the async dispatch.
    await new Promise((r) => setTimeout(r, 0));
    expect(onSave).toHaveBeenCalled();
    const sent = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.draft_template).toBe("Override body");
  });

  it("save with empty override drops the key entirely (inherit semantics)", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={{ ...baseline, draft_template: "old" }}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    // Clear the field — operator wants to fall back to tenant.
    fireEvent.change(screen.getByTestId("seller-draft-template"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText(/Guardar/i));
    await new Promise((r) => setTimeout(r, 0));
    expect(onSave).toHaveBeenCalled();
    const sent = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect("draft_template" in sent).toBe(false);
  });

  it("whitespace-only override is treated as empty (drops key on save)", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ kind: "ok" });
    render(
      <SellerForm
        initial={baseline}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-draft-template"), {
      target: { value: "   \n   " },
    });
    fireEvent.click(screen.getByText(/Guardar/i));
    await new Promise((r) => setTimeout(r, 0));
    expect(onSave).toHaveBeenCalled();
    const sent = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect("draft_template" in sent).toBe(false);
  });
});
