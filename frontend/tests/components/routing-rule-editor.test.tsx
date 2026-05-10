// Coverage for RoutingRuleEditor + AssignTargetPicker +
// blankPredicate helper.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import RoutingRuleEditor, {
  AssignTargetPicker,
  blankPredicate,
  type AssignTarget,
  type RoutingRule,
} from "../../src/modules/marketing/components/RoutingRuleEditor";

const baseline: RoutingRule = {
  id: "warm-corp",
  name: "Warm corporate leads",
  conditions: [
    { kind: "sender_domain_kind", value: "corporate" },
    { kind: "score_gte", score: 60 },
  ],
  assigns_to: { kind: "seller", id: "pedro" },
  followup_profile: "default",
  active: true,
};

describe("blankPredicate", () => {
  it("returns sane defaults per kind", () => {
    expect(blankPredicate("sender_domain_kind")).toEqual({
      kind: "sender_domain_kind",
      value: "corporate",
    });
    expect(blankPredicate("score_gte")).toEqual({
      kind: "score_gte",
      score: 50,
    });
    expect(blankPredicate("subject_contains")).toEqual({
      kind: "subject_contains",
      needle: "",
    });
  });
});

describe("RoutingRuleEditor", () => {
  it("populates fields from initial rule", () => {
    render(
      <RoutingRuleEditor
        initial={baseline}
        idLocked={true}
        availableSellerIds={["pedro", "ana"]}
        availableFollowupProfiles={["default", "vip"]}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("rule-id")).toHaveValue("warm-corp");
    expect(screen.getByLabelText("rule-name")).toHaveValue(
      "Warm corporate leads",
    );
    expect(screen.getByLabelText("rule-active")).toBeChecked();
    expect(screen.getByLabelText("rule-followup")).toHaveValue("default");
    expect(screen.getByLabelText("predicate-kind-0")).toHaveValue(
      "sender_domain_kind",
    );
    expect(screen.getByLabelText("predicate-kind-1")).toHaveValue(
      "score_gte",
    );
    expect(screen.getByLabelText("predicate-value-1")).toHaveValue(60);
  });

  it("disables id input when idLocked", () => {
    render(
      <RoutingRuleEditor
        initial={baseline}
        idLocked={true}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("rule-id")).toBeDisabled();
  });

  it("changing predicate kind resets value to blank default", () => {
    const onSave = vi.fn();
    render(
      <RoutingRuleEditor
        initial={baseline}
        idLocked={true}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("predicate-kind-0"), {
      target: { value: "subject_contains" },
    });
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0] as RoutingRule;
    expect(arg.conditions[0]).toEqual({
      kind: "subject_contains",
      needle: "",
    });
  });

  it("Add condition appends a new row", () => {
    const onSave = vi.fn();
    render(
      <RoutingRuleEditor
        initial={{ ...baseline, conditions: [] }}
        idLocked={true}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("predicate-add"));
    expect(screen.getByLabelText("predicate-kind-0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Guardar"));
    expect(onSave.mock.calls[0]![0].conditions).toHaveLength(1);
  });

  it("Remove condition drops the row", () => {
    const onSave = vi.fn();
    render(
      <RoutingRuleEditor
        initial={baseline}
        idLocked={true}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("predicate-remove-0"));
    fireEvent.click(screen.getByText("Guardar"));
    const arg = onSave.mock.calls[0]![0] as RoutingRule;
    expect(arg.conditions).toHaveLength(1);
    expect(arg.conditions[0]?.kind).toBe("score_gte");
  });

  it("Save disabled when id or name empty", () => {
    render(
      <RoutingRuleEditor
        initial={{ ...baseline, name: "" }}
        idLocked={false}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Guardar")).toBeDisabled();
  });

  it("Eliminar fires onDelete when provided", () => {
    const onDelete = vi.fn();
    render(
      <RoutingRuleEditor
        initial={baseline}
        idLocked={true}
        availableSellerIds={[]}
        availableFollowupProfiles={[]}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText(/Eliminar regla/i));
    expect(onDelete).toHaveBeenCalled();
  });
});

describe("AssignTargetPicker", () => {
  it("seller kind exposes id input", () => {
    const onChange = vi.fn();
    render(
      <AssignTargetPicker
        value={{ kind: "seller", id: "pedro" }}
        onChange={onChange}
        availableSellerIds={["pedro", "ana"]}
        testidPrefix="t"
      />,
    );
    expect(screen.getByLabelText("t-seller-id")).toHaveValue("pedro");
  });

  it("changing kind to round_robin emits empty pool", () => {
    const onChange = vi.fn();
    render(
      <AssignTargetPicker
        value={{ kind: "drop" }}
        onChange={onChange}
        availableSellerIds={["pedro", "ana"]}
        testidPrefix="t"
      />,
    );
    fireEvent.change(screen.getByLabelText("t-kind"), {
      target: { value: "round_robin" },
    });
    expect(onChange).toHaveBeenCalledWith({ kind: "round_robin", pool: [] });
  });

  it("round_robin pool input parses comma-separated ids", () => {
    const onChange = vi.fn();
    render(
      <AssignTargetPicker
        value={{ kind: "round_robin", pool: [] }}
        onChange={onChange}
        availableSellerIds={["pedro", "ana"]}
        testidPrefix="t"
      />,
    );
    fireEvent.change(screen.getByLabelText("t-pool"), {
      target: { value: "pedro, ana, luis" },
    });
    expect(onChange).toHaveBeenCalledWith({
      kind: "round_robin",
      pool: ["pedro", "ana", "luis"],
    });
  });

  it("drop kind shows the silent inbound hint", () => {
    render(
      <AssignTargetPicker
        value={{ kind: "drop" }}
        onChange={() => {}}
        availableSellerIds={[]}
        testidPrefix="t"
      />,
    );
    expect(screen.getByText(/Inbound silencioso/)).toBeInTheDocument();
  });

  it("changing kind to seller picks first available id", () => {
    const onChange = vi.fn();
    render(
      <AssignTargetPicker
        value={{ kind: "drop" }}
        onChange={onChange}
        availableSellerIds={["pedro", "ana"]}
        testidPrefix="t"
      />,
    );
    fireEvent.change(screen.getByLabelText("t-kind"), {
      target: { value: "seller" },
    });
    expect(onChange).toHaveBeenCalledWith({ kind: "seller", id: "pedro" });
  });
});
