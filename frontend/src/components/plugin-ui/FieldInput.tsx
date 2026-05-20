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

export function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const id = `fld-${field.key}`;
  return (
    <div className="plugin-field" data-field={field.key}>
      <label htmlFor={id}>
        {field.label}
        {field.required ? <span aria-hidden> *</span> : null}
      </label>
      {renderControl(id, field, value, onChange)}
      {field.help ? <p className="plugin-field__help">{field.help}</p> : null}
      {error ? (
        <p className="plugin-field__error" role="alert">
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
          placeholder={ph}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "secret":
      return (
        <div className="plugin-field__secret">
          <input
            id={id}
            type="password"
            placeholder={field.secret === "set" ? "•••••• (set)" : "not set"}
            autoComplete="new-password"
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="plugin-field__badge" data-status={field.secret}>
            {field.secret === "set" ? "set" : "unset"}
          </span>
        </div>
      );
    case "toggle":
      return (
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          id={id}
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
          placeholder={ph}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "json":
      return (
        <textarea
          id={id}
          className="plugin-field__json"
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
        >
          {asString(value) || field.label}
        </a>
      );
    default:
      return (
        <p className="plugin-field__unsupported" data-unsupported>
          Unsupported field type: <code>{String(field.field_type)}</code>
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
