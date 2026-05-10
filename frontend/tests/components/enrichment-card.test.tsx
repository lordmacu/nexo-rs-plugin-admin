// M15.21.b — `EnrichmentCard` render + interaction coverage.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../src/api/marketing", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/marketing")>(
      "../../src/api/marketing",
    );
  return {
    ...actual,
    getPerson: vi.fn(),
    confirmEnrichment: vi.fn(),
  };
});

import EnrichmentCard from "../../src/modules/marketing/components/EnrichmentCard";
import {
  confirmEnrichment,
  getPerson,
  type Person,
} from "../../src/api/marketing";

const getPersonMock = getPerson as unknown as ReturnType<typeof vi.fn>;
const confirmMock = confirmEnrichment as unknown as ReturnType<typeof vi.fn>;

const lowConf: Person = {
  id: "juan",
  tenant_id: "acme",
  primary_name: "Juan G",
  primary_email: "juan@acme.com",
  alt_emails: [],
  company_id: null,
  enrichment_status: "signature_parsed",
  enrichment_confidence: 0.62,
  tags: [],
  created_at_ms: 1,
  last_seen_at_ms: 1,
};

const manualPerson: Person = {
  ...lowConf,
  enrichment_status: "manual",
  enrichment_confidence: 1.0,
};

const highConf: Person = {
  ...lowConf,
  enrichment_status: "llm_extracted",
  enrichment_confidence: 0.97,
};

beforeEach(() => {
  getPersonMock.mockReset();
  confirmMock.mockReset();
});

afterEach(() => {
  getPersonMock.mockReset();
  confirmMock.mockReset();
});

describe("EnrichmentCard visibility", () => {
  it("renders nothing while loading", () => {
    getPersonMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<EnrichmentCard personId="juan" />);
    expect(container.firstChild).toBeNull();
  });

  it("hides when status is already manual", async () => {
    getPersonMock.mockResolvedValue({
      person: manualPerson,
      company: null,
    });
    const { container } = render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(getPersonMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("hides when confidence >= 0.95", async () => {
    getPersonMock.mockResolvedValue({
      person: highConf,
      company: null,
    });
    const { container } = render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(getPersonMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("hides on getPerson error", async () => {
    getPersonMock.mockRejectedValue(new Error("network blip"));
    const { container } = render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(getPersonMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders prompt when low-confidence + non-manual", async () => {
    getPersonMock.mockResolvedValue({
      person: lowConf,
      company: null,
    });
    render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(
        screen.getByText(/Enriquecimiento inferido/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/firma del email/i)).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Descartar")).toBeInTheDocument();
  });
});

describe("EnrichmentCard interactions", () => {
  it("Confirmar fires confirmEnrichment with empty body and calls onConfirmed", async () => {
    getPersonMock.mockResolvedValue({ person: lowConf, company: null });
    confirmMock.mockResolvedValue({
      person: { ...lowConf, enrichment_status: "manual", enrichment_confidence: 1.0 },
      company: null,
    });
    const onConfirmed = vi.fn();
    render(
      <EnrichmentCard personId="juan" onConfirmed={onConfirmed} />,
    );
    await waitFor(() => {
      expect(screen.getByText("Confirmar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Confirmar"));
    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith("juan", {});
    });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("Descartar hides the card without firing the API", async () => {
    getPersonMock.mockResolvedValue({ person: lowConf, company: null });
    const { container } = render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(screen.getByText("Descartar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Descartar"));
    expect(container.firstChild).toBeNull();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("Editar reveals form; Guardar y confirmar passes overrides", async () => {
    getPersonMock.mockResolvedValue({ person: lowConf, company: null });
    confirmMock.mockResolvedValue({
      person: { ...lowConf, enrichment_status: "manual", enrichment_confidence: 1.0 },
      company: null,
    });
    render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(screen.getByText("Editar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Editar"));
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0]!, { target: { value: "Juan García" } });
    fireEvent.change(inputs[1]!, { target: { value: "Acme Corp" } });
    fireEvent.click(screen.getByText(/Guardar y confirmar/i));
    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith("juan", {
        primary_name: "Juan García",
        company_name: "Acme Corp",
      });
    });
  });

  it("surfaces server error code in alert without flipping state", async () => {
    getPersonMock.mockResolvedValue({ person: lowConf, company: null });
    const { HttpError } = await import("../../src/api/client");
    confirmMock.mockRejectedValue(
      new HttpError(503, { code: "companies_not_loaded" }),
    );
    render(<EnrichmentCard personId="juan" />);
    await waitFor(() => {
      expect(screen.getByText("Confirmar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Confirmar"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /companies_not_loaded/i,
      );
    });
    // Card still visible (didn't flip to manual).
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
  });
});
