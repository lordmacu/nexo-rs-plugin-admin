// Phase 99.8 — GenericScreen render + save + secret + visible_when.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminCall = vi.fn();
vi.mock("../../src/api/admin", () => ({
  adminCall: (...a: unknown[]) => adminCall(...a),
}));

import { GenericScreen } from "../../src/components/plugin-ui/GenericScreen";

const descriptor = {
  plugin: "google",
  screen_id: "smtp",
  title: "SMTP",
  fields: [
    {
      key: "host",
      field_type: "text",
      label: "SMTP Host",
      required: true,
      value: "smtp.gmail.com",
    },
    {
      key: "password",
      field_type: "secret",
      label: "Password",
      required: true,
      secret: "set",
    },
    {
      key: "cert",
      field_type: "text",
      label: "TLS Cert",
      required: false,
      visible_when: "config.use_tls",
    },
  ],
  actions: [],
};

beforeEach(() => {
  adminCall.mockReset();
  adminCall.mockImplementation((method: string) => {
    if (method === "nexo/admin/plugin_ui/describe") {
      return Promise.resolve(descriptor);
    }
    if (method === "nexo/admin/plugin_ui/config_set") {
      return Promise.resolve({ ok: true, errors: [] });
    }
    return Promise.resolve(null);
  });
});

describe("GenericScreen", () => {
  it("renders fields from the descriptor", async () => {
    render(<GenericScreen plugin="google" screen="smtp" />);
    expect(await screen.findByText("SMTP")).toBeInTheDocument();
    expect(screen.getByText("SMTP Host")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("hides a field whose visible_when is false", async () => {
    render(<GenericScreen plugin="google" screen="smtp" />);
    await screen.findByText("SMTP");
    // `cert` is gated on config.use_tls which is unset → hidden.
    expect(screen.queryByText("TLS Cert")).not.toBeInTheDocument();
  });

  it("secret field is write-only with a status badge", async () => {
    render(<GenericScreen plugin="google" screen="smtp" />);
    await screen.findByText("SMTP");
    const badge = screen.getByText("set");
    expect(badge).toBeInTheDocument();
  });

  it("save dispatches config_set with current values", async () => {
    render(<GenericScreen plugin="google" screen="smtp" />);
    await screen.findByText("SMTP");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(adminCall).toHaveBeenCalledWith("nexo/admin/plugin_ui/config_set", {
        plugin: "google",
        screen: "smtp",
        values: { host: "smtp.gmail.com" },
      }),
    );
  });

  it("surfaces per-field validation errors", async () => {
    adminCall.mockImplementation((method: string) => {
      if (method === "nexo/admin/plugin_ui/describe") {
        return Promise.resolve(descriptor);
      }
      return Promise.resolve({
        ok: false,
        errors: [{ pointer: "/host", message: "host required" }],
      });
    });
    render(<GenericScreen plugin="google" screen="smtp" />);
    await screen.findByText("SMTP");
    fireEvent.click(screen.getByText("Save"));
    expect(await screen.findByText("host required")).toBeInTheDocument();
  });
});
