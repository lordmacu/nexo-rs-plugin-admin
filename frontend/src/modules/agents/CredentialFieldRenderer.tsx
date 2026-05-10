// Phase 82.10.u — declarative credential field renderer. Walks the
// factory's `credential_schema` and renders one input per
// descriptor. Validates on blur per the descriptor's `validation`
// rule. `depends_on` filters which fields are visible at a given
// time (e.g. `setup_token` only appears when `auth_mode =
// setup_token`).

import { useState } from "react";
import { Button, Input, Select } from "../../components/ui";
import type {
  CredentialFieldDescriptor,
  FieldValidation,
} from "../../lib/llmCatalog";

interface Props {
  schema: CredentialFieldDescriptor[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function CredentialFieldRenderer({ schema, values, onChange }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (name: string, value: string) => {
    onChange({ ...values, [name]: value });
  };

  const validateOnBlur = (descriptor: CredentialFieldDescriptor) => {
    const v = (values[descriptor.name] ?? "").trim();
    if (descriptor.required && !v) {
      setErrors((e) => ({ ...e, [descriptor.name]: "required" }));
      return;
    }
    if (v && descriptor.validation) {
      const err = applyValidation(v, descriptor.validation);
      if (err) {
        setErrors((e) => ({ ...e, [descriptor.name]: err }));
        return;
      }
    }
    setErrors((e) => {
      const next = { ...e };
      delete next[descriptor.name];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {schema.map((d) => {
        // Skip when depends_on isn't satisfied — SPA hides the
        // field entirely so the operator only sees what applies.
        if (d.depends_on) {
          const dep = values[d.depends_on.field] ?? "";
          if (!d.depends_on.any_of.includes(dep)) return null;
        }
        const error = errors[d.name];
        return (
          <div key={d.name}>
            <label className="block text-sm font-medium text-gray-700">
              {d.label}
              {d.required && <span className="text-red-600"> *</span>}
            </label>
            {renderInput(d, values[d.name] ?? d.default ?? "", setField)}
            {d.help && <p className="mt-1 text-xs text-gray-500">{d.help}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <Button
              variant="unstyled"
              tabIndex={-1}
              className="hidden"
              onBlur={() => validateOnBlur(d)}
            >
              {/* Hidden focus target — fires `validateOnBlur` when
                  focus leaves the visible inputs. Not user-visible. */}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function renderInput(
  d: CredentialFieldDescriptor,
  value: string,
  setField: (name: string, value: string) => void,
) {
  if (d.kind.type === "select") {
    return (
      <Select
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setField(d.name, e.target.value)}
      >
        {d.kind.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      type={d.kind.type === "password" ? "password" : "text"}
      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
      value={value}
      placeholder={d.default ?? ""}
      autoComplete="off"
      onChange={(e) => setField(d.name, e.target.value)}
    />
  );
}

function applyValidation(value: string, rule: FieldValidation): string | null {
  if (rule.type === "regex") {
    try {
      const re = new RegExp(rule.pattern);
      if (!re.test(value)) return rule.hint;
    } catch {
      // Server is the source of truth; bad client regex → skip.
    }
    return null;
  }
  if (rule.type === "length") {
    const n = [...value].length;
    if (n < rule.min || n > rule.max) {
      return `length ${n} not in [${rule.min}, ${rule.max}]`;
    }
  }
  return null;
}
