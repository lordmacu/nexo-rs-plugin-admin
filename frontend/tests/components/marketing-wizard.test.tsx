// Coverage for the marketing first-run wizard. Validates
// the visibility hook (auto-show when empty, hide when
// configured, hide when dismissed) and the basic step
// navigation contract.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/api/marketing")
  >("../../src/api/marketing");
  return {
    ...actual,
    saveMailboxes: vi.fn(),
    saveSellers: vi.fn(),
    saveCredential: vi.fn(),
  };
});
vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn(),
}));
vi.mock("../../src/api/agents", () => ({
  listAgents: vi.fn(),
}));

import MarketingWizard, {
  isConfigured,
  useMarketingWizardVisibility,
} from "../../src/modules/marketing/MarketingWizard";
import {
  saveCredential,
  saveMailboxes,
  saveSellers,
} from "../../src/api/marketing";
import { adminCall } from "../../src/api/admin";
import { listAgents } from "../../src/api/agents";
import { useMarketingConfig } from "../../src/store/marketingConfig";
import { useTenantStore } from "../../src/store/tenant";

const saveMailboxesMock = vi.mocked(saveMailboxes);
const saveSellersMock = vi.mocked(saveSellers);
const saveCredentialMock = vi.mocked(saveCredential);
const adminCallMock = vi.mocked(adminCall);
const listAgentsMock = vi.mocked(listAgents);

function setConfig(opts: {
  mailboxes: number;
  sellers: number;
  source?: "api" | "loading" | "error" | "mock";
}) {
  const src = opts.source ?? "api";
  useMarketingConfig.setState({
    mailboxes: {
      data: Array(opts.mailboxes).fill({}) as never,
      source: src,
      error: null,
    } as never,
    sellers: {
      data: Array(opts.sellers).fill({}) as never,
      source: src,
      error: null,
    } as never,
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  saveMailboxesMock.mockResolvedValue({ mailboxes: [], count: 0 } as never);
  saveSellersMock.mockResolvedValue({ sellers: [], count: 0 } as never);
  saveCredentialMock.mockResolvedValue({
    env_name: "MARKETING_TEST_PASSWORD_X",
    path: "/tmp/x",
    overwrote_env: false,
  } as never);
  adminCallMock.mockResolvedValue({} as never);
  // Single-agent fixture so the wizard auto-selects on mount and
  // the existing happy-path tests don't have to interact with the
  // dropdown explicitly.
  listAgentsMock.mockResolvedValue([
    {
      id: "ana",
      active: true,
      model_provider: "deepseek",
      bindings_count: 0,
    },
  ] as never);
  useTenantStore.setState({ activeTenantId: "acme" } as never);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("isConfigured", () => {
  it("requires both mailbox AND seller to be non-empty", () => {
    expect(isConfigured(0, 0)).toBe(false);
    expect(isConfigured(1, 0)).toBe(false);
    expect(isConfigured(0, 1)).toBe(false);
    expect(isConfigured(1, 1)).toBe(true);
    expect(isConfigured(3, 5)).toBe(true);
  });
});

describe("useMarketingWizardVisibility", () => {
  it("returns visible=true when config is empty + nothing dismissed", () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    const { result } = renderHook(() => useMarketingWizardVisibility());
    expect(result.current.visible).toBe(true);
  });

  it("returns visible=false when both slices are still loading", () => {
    setConfig({ mailboxes: 0, sellers: 0, source: "loading" });
    const { result } = renderHook(() => useMarketingWizardVisibility());
    expect(result.current.visible).toBe(false);
  });

  it("returns visible=false when config is non-empty (already configured)", () => {
    setConfig({ mailboxes: 1, sellers: 1 });
    const { result } = renderHook(() => useMarketingWizardVisibility());
    expect(result.current.visible).toBe(false);
  });

  it("dismiss() flips visibility off for the current mount only", () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    const { result, rerender } = renderHook(() =>
      useMarketingWizardVisibility(),
    );
    expect(result.current.visible).toBe(true);
    result.current.dismiss();
    rerender();
    expect(result.current.visible).toBe(false);
    // The dismiss flag is intentionally NOT persisted to
    // localStorage — operators who skip on accident need to
    // see the wizard again on the next reload.
    expect(localStorage.getItem("marketing-wizard-dismissed:acme:v1")).toBe(
      null,
    );
  });

  it("tenant switch resets the in-memory dismissed flag", () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    const { result, rerender } = renderHook(() =>
      useMarketingWizardVisibility(),
    );
    // Dismiss inside tenant `acme`.
    result.current.dismiss();
    rerender();
    expect(result.current.visible).toBe(false);
    // Switch tenant — the in-memory flag clears so the new
    // tenant gets a fresh wizard.
    useTenantStore.setState({ activeTenantId: "beta" } as never);
    rerender();
    expect(result.current.visible).toBe(true);
  });

  it("dismiss is forgotten on a fresh hook mount (page reload simulator)", () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    // First mount — operator skips.
    const first = renderHook(() => useMarketingWizardVisibility());
    first.result.current.dismiss();
    first.rerender();
    expect(first.result.current.visible).toBe(false);
    first.unmount();
    // Second mount — wizard returns because the dismiss
    // never reached localStorage.
    const second = renderHook(() => useMarketingWizardVisibility());
    expect(second.result.current.visible).toBe(true);
  });
});

describe("MarketingWizard component", () => {
  it("renders the welcome step with start + skip buttons", () => {
    render(<MarketingWizard onClose={() => {}} />);
    expect(screen.getByTestId("marketing-wizard-start")).toBeInTheDocument();
    expect(screen.getByTestId("marketing-wizard-skip")).toBeInTheDocument();
  });

  it("Saltar fires onClose without saving", () => {
    const onClose = vi.fn();
    render(<MarketingWizard onClose={onClose} />);
    fireEvent.click(screen.getByTestId("marketing-wizard-skip"));
    expect(onClose).toHaveBeenCalled();
    expect(saveMailboxesMock).not.toHaveBeenCalled();
  });

  it("advances welcome → mailbox on Empezar", () => {
    render(<MarketingWizard onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("marketing-wizard-start"));
    expect(screen.getByTestId("wiz-mb-address")).toBeInTheDocument();
  });

  it("validates mailbox address shape before saving", async () => {
    render(<MarketingWizard onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("marketing-wizard-start"));
    fireEvent.click(screen.getByTestId("marketing-wizard-mailbox-save"));
    await waitFor(() => {
      expect(
        screen.getByTestId("marketing-wizard-error").textContent,
      ).toMatch(/email válido/i);
    });
    expect(saveMailboxesMock).not.toHaveBeenCalled();
  });

  it("happy path: mailbox save then seller save reaches done step", async () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    render(<MarketingWizard onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("marketing-wizard-start"));
    // Mailbox step.
    fireEvent.change(screen.getByTestId("wiz-mb-address"), {
      target: { value: "ventas@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-imap-host"), {
      target: { value: "imap.gmail.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-username"), {
      target: { value: "ventas@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-password"), {
      target: { value: "imap-secret" },
    });
    fireEvent.click(screen.getByTestId("marketing-wizard-mailbox-save"));
    await waitFor(() => {
      expect(saveMailboxesMock).toHaveBeenCalledTimes(1);
    });
    // Now on seller step — primary_email is pre-filled from
    // the mailbox address.
    await waitFor(() => {
      const email = screen.getByTestId(
        "wiz-seller-email",
      ) as HTMLInputElement;
      expect(email.value).toBe("ventas@acme.com");
    });
    fireEvent.change(screen.getByTestId("wiz-seller-name"), {
      target: { value: "Pedro García" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-host"), {
      target: { value: "smtp.gmail.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-username"), {
      target: { value: "ventas@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-password"), {
      target: { value: "smtp-secret" },
    });
    fireEvent.click(screen.getByTestId("marketing-wizard-seller-save"));
    await waitFor(() => {
      expect(saveSellersMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("marketing-wizard-done")).toBeInTheDocument();
    });
  });

  it("seller step pre-fills with default signature when blank", async () => {
    setConfig({ mailboxes: 0, sellers: 0 });
    render(<MarketingWizard onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("marketing-wizard-start"));
    fireEvent.change(screen.getByTestId("wiz-mb-address"), {
      target: { value: "ventas@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-imap-host"), {
      target: { value: "imap.gmail.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-username"), {
      target: { value: "ventas@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-mb-password"), {
      target: { value: "imap-secret" },
    });
    fireEvent.click(screen.getByTestId("marketing-wizard-mailbox-save"));
    await waitFor(() => {
      expect(screen.getByTestId("wiz-seller-name")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("wiz-seller-name"), {
      target: { value: "Pedro García" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-host"), {
      target: { value: "smtp.gmail.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-username"), {
      target: { value: "pedro@acme.com" },
    });
    fireEvent.change(screen.getByTestId("wiz-seller-smtp-password"), {
      target: { value: "smtp-secret" },
    });
    fireEvent.click(screen.getByTestId("marketing-wizard-seller-save"));
    await waitFor(() => {
      expect(saveSellersMock).toHaveBeenCalled();
    });
    const sentSellers = saveSellersMock.mock.calls[0][0] as readonly Record<
      string,
      unknown
    >[];
    expect(sentSellers[0].signature_text).toBe("—\nPedro García");
  });
});
