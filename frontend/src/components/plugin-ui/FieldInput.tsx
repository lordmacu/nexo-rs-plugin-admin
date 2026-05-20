// Phase 99.8 — generic field renderer for plugin admin-UI screens.
//
// One component switches on `FieldDescriptor.field_type` to render
// each of the 10 declared field kinds (+ an `unsupported` fallback
// so an unknown/future type degrades gracefully instead of
// crashing the screen). Secret fields are WRITE-ONLY: the value is
// never echoed (the descriptor never carries it); a status badge
// shows whether a credential is already stored.

import type { FieldDescriptor } from "../../api/types.gen";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export interface FieldInputProps {
  field: FieldDescriptor;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  error?: string;
}

// Shared control styling — mirrors the admin's form inputs
// (`w-full rounded border border-border-DEFAULT …`).
const INPUT_CLS =
  "mt-1 w-full rounded border border-border-DEFAULT bg-panel px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none";

export function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const id = `fld-${field.key}`;
  return (
    <div className="space-y-1" data-field={field.key}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {field.label}
        {field.required ? <span aria-hidden className="text-red-600"> *</span> : null}
      </label>
      {renderControl(id, field, value, onChange)}
      {field.help ? (
        <p className="text-xs text-text-meta">{field.help}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function renderControl(
  id: string,
  field: FieldDescriptor,
  value: JsonValue | undefined,
  onChange: (v: JsonValue) => void,
) {
  const ph = field.placeholder ?? "";
  switch (field.field_type) {
    case "text":
      return (
        <input
          id={id}
          type="text"
          className={INPUT_CLS}
          placeholder={ph}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          className={INPUT_CLS}
          placeholder={ph}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "secret":
      return (
        <div className="mt-1 flex items-center gap-2">
          <input
            id={id}
            type="password"
            className="w-full rounded border border-border-DEFAULT bg-panel px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            placeholder={field.secret === "set" ? "•••••• (set)" : "not set"}
            autoComplete="new-password"
            onChange={(e) => onChange(e.target.value)}
          />
          <span
            data-status={field.secret}
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              field.secret === "set"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-text-meta"
            }`}
          >
            {field.secret === "set" ? "set" : "unset"}
          </span>
        </div>
      );
    case "toggle":
      return (
        <div className="mt-1">
          <input
            id={id}
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
    case "select":
      return (
        <select
          id={id}
          className={INPUT_CLS}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      return (
        <select
          id={id}
          multiple
          className={INPUT_CLS}
          value={asStringArray(value)}
          onChange={(e) =>
            onChange(
              Array.from(e.target.selectedOptions).map((o) => o.value),
            )
          }
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "list":
      // One item per line ↔ string[].
      return (
        <textarea
          id={id}
          rows={4}
          className={INPUT_CLS}
          placeholder={ph}
          value={asStringArray(value).join("\n")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            )
          }
        />
      );
    case "textarea":
      return (
        <textarea
          id={id}
          rows={4}
          className={INPUT_CLS}
          placeholder={ph}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "json":
      return (
        <textarea
          id={id}
          rows={6}
          className={`${INPUT_CLS} font-mono`}
          placeholder={ph}
          value={value === undefined ? "" : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value) as JsonValue);
            } catch {
              // Keep the raw text as a string until it parses; the
              // server's config_schema validation reports the error.
              onChange(e.target.value);
            }
          }}
        />
      );
    case "link":
      return (
        <a
          id={id}
          href={asString(value) || "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="text-sm font-medium text-accent hover:underline"
        >
          {asString(value) || field.label}
        </a>
      );
    default:
      return (
        <p
          data-unsupported
          className="mt-1 text-xs text-text-meta"
        >
          Unsupported field type: <code className="font-mono">{String(field.field_type)}</code>
        </p>
      );
  }
}

function asString(v: JsonValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asStringArray(v: JsonValue | undefined): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}
