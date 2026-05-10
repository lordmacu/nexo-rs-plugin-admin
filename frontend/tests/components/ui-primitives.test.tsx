// Coverage for the shared `components/ui/` primitives.
// One test per primitive covers the public surface (props →
// rendered shape) without touching module-specific concerns.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Inbox, Sparkles } from "lucide-react";

import {
  Avatar,
  Badge,
  Banner,
  Bubble,
  Button,
  Card,
  Checkbox,
  Code,
  ConfirmDialog,
  EmptyState,
  Field,
  Header,
  Heading,
  Input,
  KeyValue,
  Modal,
  RadioGroup,
  SearchInput,
  Section,
  Select,
  SidebarList,
  SidebarListItem,
  Spinner,
  Stat,
  StatusDot,
  Stepper,
  Tabs,
  Text,
  Textarea,
} from "../../src/components/ui";

describe("Field", () => {
  it("renders label, child, and optional hint", () => {
    render(
      <Field label="Email" hint="Validated server-side">
        <input data-testid="email-input" />
      </Field>,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Validated server-side")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
  });

  it("required mark is shown as a red asterisk", () => {
    render(
      <Field label="Name" required>
        <input />
      </Field>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});

describe("Section", () => {
  it("renders title + body and the optional trailing slot", () => {
    render(
      <Section
        title="Profile"
        icon={<Sparkles size={11} />}
        trailing={<button>Edit</button>}
      >
        <p>body</p>
      </Section>,
    );
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});

describe("Stat", () => {
  it("renders count + label", () => {
    render(<Stat icon={<Inbox size={14} />} n={42} label="Leads" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
  });

  it("renders em-dash when count is null (loading state)", () => {
    render(<Stat icon={<Inbox size={14} />} n={null} label="Leads" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("Modal", () => {
  it("renders the close button by default and fires onClose on click", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} title="Hello">
        <div>body</div>
      </Modal>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape key fires onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <div>body</div>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("hideClose hides the close button", () => {
    render(
      <Modal onClose={() => {}} hideClose>
        <div>body</div>
      </Modal>,
    );
    expect(screen.queryByTestId("modal-close")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("renders title, body, and optional actions row", () => {
    render(
      <EmptyState
        icon={<Inbox size={32} />}
        title="No leads"
        body="Connect a mailbox to start receiving."
        actions={<button>Connect</button>}
      />,
    );
    expect(screen.getByText("No leads")).toBeInTheDocument();
    expect(
      screen.getByText("Connect a mailbox to start receiving."),
    ).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });
});

describe("Stepper", () => {
  it("highlights the active step and marks earlier ones done", () => {
    render(
      <Stepper
        steps={[
          { id: "a", label: "Welcome" },
          { id: "b", label: "Setup" },
          { id: "c", label: "Done" },
        ]}
        activeId="b"
      />,
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Setup")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("derives initials from a 2-word name", () => {
    render(<Avatar name="Pedro García" />);
    expect(screen.getByText("PG")).toBeInTheDocument();
  });

  it("derives initial from a 1-word name", () => {
    render(<Avatar name="Pedro" />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("falls back to ? when name is empty", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("same seed picks the same color across renders (deterministic)", () => {
    const a = render(<Avatar name="Pedro" seed="lead-1" />).container
      .firstChild as HTMLElement;
    const b = render(<Avatar name="Otro" seed="lead-1" />).container
      .firstChild as HTMLElement;
    // Different names but same seed → same bg class.
    const aBg = Array.from(a.classList).find((c) => c.startsWith("bg-"));
    const bBg = Array.from(b.classList).find((c) => c.startsWith("bg-"));
    expect(aBg).toBe(bBg);
  });
});

describe("Bubble", () => {
  it("aligns out-direction to the right", () => {
    render(<Bubble direction="out">hi</Bubble>);
    const wrap = screen.getByTestId("bubble-out");
    expect(wrap.className).toContain("justify-end");
  });

  it("aligns in-direction to the left", () => {
    render(<Bubble direction="in">hi</Bubble>);
    const wrap = screen.getByTestId("bubble-in");
    expect(wrap.className).toContain("justify-start");
  });

  it("renders sender label + footer slots", () => {
    render(
      <Bubble direction="in" senderLabel="Pedro" footer="2 min ago">
        Body
      </Bubble>,
    );
    expect(screen.getByText("Pedro")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("2 min ago")).toBeInTheDocument();
  });
});

describe("SidebarList + SidebarListItem", () => {
  it("renders list rows + invokes onSelect", () => {
    const onSelect = vi.fn();
    render(
      <SidebarList header={<input placeholder="Buscar" />}>
        <SidebarListItem
          seed="lead-1"
          title="Juan García"
          subtitle="Cotización planes Pro"
          trailing="2m"
          onSelect={onSelect}
        />
      </SidebarList>,
    );
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("Cotización planes Pro")).toBeInTheDocument();
    expect(screen.getByText("2m")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Juan García"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("active row carries the data-active marker", () => {
    render(
      <SidebarList>
        <SidebarListItem seed="x" title="Item" active />
      </SidebarList>,
    );
    const row = screen.getByTestId("sidebar-list-item");
    expect(row.getAttribute("data-active")).toBe("true");
  });
});

describe("Header", () => {
  it("renders title + subtitle + actions", () => {
    render(
      <Header
        title="Pedro García"
        subtitle="pedro@acme.com"
        actions={<button>Mute</button>}
      />,
    );
    expect(screen.getByText("Pedro García")).toBeInTheDocument();
    expect(screen.getByText("pedro@acme.com")).toBeInTheDocument();
    expect(screen.getByText("Mute")).toBeInTheDocument();
  });

  it("avatarSeed renders the avatar slot", () => {
    render(<Header title="Pedro" avatarSeed="seller-1" />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("renders children + fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByText("Save"));
    expect(onClick).toHaveBeenCalled();
  });

  it("primary variant carries the accent class", () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain(
      "bg-accent",
    );
  });

  it("danger variant carries the danger class", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "bg-danger",
    );
  });

  it("busy disables the click + swaps the icon for a spinner", () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Saving
      </Button>,
    );
    fireEvent.click(screen.getByText("Saving"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Input", () => {
  it("renders the value + invokes onChange", () => {
    const onChange = vi.fn();
    render(
      <Input
        data-testid="i"
        value="hello"
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId("i") as HTMLInputElement;
    expect(input.value).toBe("hello");
    fireEvent.change(input, { target: { value: "world" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("invalid paints the danger border", () => {
    render(<Input invalid data-testid="i" />);
    expect(screen.getByTestId("i").className).toContain("border-danger");
  });
});

describe("Select", () => {
  it("renders options + invokes onChange", () => {
    const onChange = vi.fn();
    render(
      <Select data-testid="s" value="a" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    const sel = screen.getByTestId("s") as HTMLSelectElement;
    expect(sel.value).toBe("a");
    fireEvent.change(sel, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Textarea", () => {
  it("renders the rows + invokes onChange", () => {
    const onChange = vi.fn();
    render(<Textarea data-testid="t" rows={6} onChange={onChange} />);
    const ta = screen.getByTestId("t") as HTMLTextAreaElement;
    expect(ta.rows).toBe(6);
    fireEvent.change(ta, { target: { value: "x" } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Badge", () => {
  it("renders content with the tone-driven class", () => {
    render(<Badge tone="success">live</Badge>);
    const el = screen.getByText("live");
    expect(el.className).toContain("bg-success-soft");
    expect(el.className).toContain("text-success");
  });

  it("default tone is neutral", () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText("x").className).toContain("bg-panel-alt");
  });
});

describe("Banner", () => {
  it("renders body + tone-driven background", () => {
    render(<Banner tone="warning">Stale data</Banner>);
    const wrap = screen.getByText("Stale data").parentElement!;
    expect(wrap.className).toContain("bg-warning-soft");
  });
});

describe("Card", () => {
  it("renders content with the default border", () => {
    render(
      <Card>
        <p>body</p>
      </Card>,
    );
    expect(screen.getByText("body").parentElement?.className).toContain(
      "bg-panel",
    );
  });

  it("subtle variant uses panel-alt", () => {
    render(
      <Card variant="subtle">
        <p>body</p>
      </Card>,
    );
    expect(screen.getByText("body").parentElement?.className).toContain(
      "bg-panel-alt",
    );
  });
});

describe("Heading", () => {
  it("renders the matching tag for the level", () => {
    const { container } = render(<Heading level={1}>Title</Heading>);
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("size override applies the matching class", () => {
    render(
      <Heading level={3} size="xl">
        Big
      </Heading>,
    );
    expect(screen.getByText("Big").className).toContain("text-2xl");
  });
});

describe("Text", () => {
  it("default tone is primary", () => {
    render(<Text>hello</Text>);
    expect(screen.getByText("hello").className).toContain("text-text-primary");
  });

  it("meta tone + xs size + truncate compose", () => {
    render(
      <Text tone="meta" size="xs" truncate>
        hi
      </Text>,
    );
    const el = screen.getByText("hi");
    expect(el.className).toContain("text-text-meta");
    expect(el.className).toContain("text-[11px]");
    expect(el.className).toContain("truncate");
  });

  it("custom `as` renders the matching tag", () => {
    const { container } = render(<Text as="p">para</Text>);
    expect(container.querySelector("p")).not.toBeNull();
  });
});

describe("Spinner", () => {
  it("renders an accessible Cargando label", () => {
    render(<Spinner />);
    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
  });

  it("tone=accent applies the accent class", () => {
    const { container } = render(<Spinner tone="accent" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-accent");
  });
});

describe("Checkbox", () => {
  it("renders a native checkbox + invokes onChange", () => {
    const onChange = vi.fn();
    render(
      <Checkbox data-testid="cb" checked onChange={onChange}>
        I agree
      </Checkbox>,
    );
    expect(screen.getByText("I agree")).toBeInTheDocument();
    const cb = screen.getByTestId("cb") as HTMLInputElement;
    expect(cb.checked).toBe(true);
    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalled();
  });

  it("renders the optional hint slot", () => {
    render(
      <Checkbox hint="Operator override only" data-testid="cb">
        Force
      </Checkbox>,
    );
    expect(screen.getByText("Operator override only")).toBeInTheDocument();
  });

  it("invalid paints the danger border", () => {
    render(<Checkbox invalid data-testid="cb" />);
    expect(screen.getByTestId("cb").className).toContain("border-danger");
  });
});

describe("Code", () => {
  it("inline variant renders an inline `<code>` with mono font", () => {
    const { container } = render(<Code>MARKETING_HTTP_PORT</Code>);
    const el = container.querySelector("code");
    expect(el).not.toBeNull();
    expect(el?.className).toContain("font-mono");
  });

  it("block variant renders a `<pre>` wrapping a `<code>`", () => {
    const { container } = render(<Code variant="block">{`{"a":1}`}</Code>);
    expect(container.querySelector("pre")).not.toBeNull();
    expect(container.querySelector("pre code")).not.toBeNull();
  });
});

describe("Tabs", () => {
  it("renders the strip and highlights the active tab", () => {
    const onSelect = vi.fn();
    render(
      <Tabs
        items={[
          { id: "a", label: "Mailbox" },
          { id: "b", label: "Sellers" },
          { id: "c", label: "Rules" },
        ]}
        activeId="b"
        onSelect={onSelect}
      />,
    );
    const active = screen.getByRole("tab", { name: "Sellers" });
    expect(active.getAttribute("aria-selected")).toBe("true");
    expect(active.className).toContain("border-accent");
    fireEvent.click(screen.getByRole("tab", { name: "Rules" }));
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("disabled tabs cannot fire onSelect", () => {
    const onSelect = vi.fn();
    render(
      <Tabs
        items={[
          { id: "a", label: "Active" },
          { id: "b", label: "Soon", disabled: true },
        ]}
        activeId="a"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Soon" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("trailing slot renders adjacent to the label", () => {
    render(
      <Tabs
        items={[
          {
            id: "a",
            label: "Drafts",
            trailing: <span data-testid="tab-badge">3</span>,
          },
        ]}
        activeId="a"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("tab-badge")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("renders title + body and fires onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Eliminar agente"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        Esta acción no se puede deshacer.
      </ConfirmDialog>,
    );
    expect(screen.getByText("Eliminar agente")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("Esc fires onCancel", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Hello"
        onConfirm={() => {}}
        onCancel={onCancel}
      >
        body
      </ConfirmDialog>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("info tone renders the primary confirm button", () => {
    render(
      <ConfirmDialog
        title="Apply changes"
        tone="info"
        onConfirm={() => {}}
        onCancel={() => {}}
      >
        body
      </ConfirmDialog>,
    );
    expect(
      screen.getByTestId("confirm-dialog-confirm").className,
    ).toContain("bg-accent");
  });

  it("busy disables both CTAs", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="x"
        busy
        onConfirm={onConfirm}
        onCancel={() => {}}
      >
        body
      </ConfirmDialog>,
    );
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("error slot renders the message", () => {
    render(
      <ConfirmDialog
        title="x"
        error="Server failed"
        onConfirm={() => {}}
        onCancel={() => {}}
      >
        body
      </ConfirmDialog>,
    );
    expect(screen.getByTestId("confirm-dialog-error").textContent).toBe(
      "Server failed",
    );
  });
});

describe("StatusDot", () => {
  it("default tone is neutral", () => {
    const { container } = render(<StatusDot />);
    expect(container.firstChild).toHaveClass("bg-text-meta");
  });

  it("tone=success applies the success class", () => {
    const { container } = render(<StatusDot tone="success" />);
    expect(container.firstChild).toHaveClass("bg-success");
  });

  it("pulse adds the animate-pulse class", () => {
    const { container } = render(<StatusDot tone="success" pulse />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("label renders as title + aria-label", () => {
    render(<StatusDot tone="info" label="Live" />);
    const dot = screen.getByLabelText("Live");
    expect(dot.getAttribute("title")).toBe("Live");
  });
});

describe("KeyValue", () => {
  it("default pill layout renders label + value", () => {
    render(<KeyValue label="Industria" value="Software" />);
    expect(screen.getByText("Industria")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
  });

  it("row layout puts label and value on the same line", () => {
    const { container } = render(
      <KeyValue label="Score" value="73" layout="row" />,
    );
    const wrap = container.firstChild as HTMLElement;
    expect(wrap.className).toContain("flex");
    expect(wrap.className).toContain("justify-between");
  });

  it("inline layout renders as a span", () => {
    const { container } = render(
      <KeyValue label="Tipo" value="email" layout="inline" />,
    );
    expect(container.querySelector("span")).not.toBeNull();
  });
});

describe("SearchInput", () => {
  it("renders the value + invokes onChange", () => {
    const onChange = vi.fn();
    render(
      <SearchInput
        data-testid="search"
        value="hi"
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId("search") as HTMLInputElement;
    expect(input.value).toBe("hi");
    fireEvent.change(input, { target: { value: "hola" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("clearable + non-empty value shows the clear button", () => {
    const onClear = vi.fn();
    render(
      <SearchInput
        data-testid="search"
        value="abc"
        clearable
        onClear={onClear}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("Limpiar búsqueda"));
    expect(onClear).toHaveBeenCalled();
  });

  it("clearable but empty value hides the clear button", () => {
    render(
      <SearchInput data-testid="search" value="" clearable onChange={() => {}} />,
    );
    expect(screen.queryByLabelText("Limpiar búsqueda")).toBeNull();
  });
});

describe("RadioGroup", () => {
  it("renders options + invokes onChange with the selected value", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        name="mode"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
      />,
    );
    expect(screen.getByText("Option A")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Option B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("disabled option cannot fire onChange", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        name="mode"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B", disabled: true },
        ]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Option B"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hint slot renders supporting copy", () => {
    render(
      <RadioGroup
        name="mode"
        value="a"
        onChange={() => {}}
        options={[
          { value: "a", label: "IDLE", hint: "Push, ~1-3s" },
        ]}
      />,
    );
    expect(screen.getByText("Push, ~1-3s")).toBeInTheDocument();
  });
});
