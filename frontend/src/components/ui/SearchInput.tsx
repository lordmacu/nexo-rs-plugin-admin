// SearchInput — search-bar pill with leading magnifier icon
// + transparent inner input + optional clear button. The
// container draws the border + focus ring; the input itself
// is bare so the chrome feels like a single pill.
//
// Same aesthetic as the marketing sidebar's inline search;
// any future search affordance (chats, agents, leads,
// rules, …) renders identically.

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

import { useT } from "../../i18n";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: "sm" | "md";
  /** When `true` AND the value is non-empty, render a clear
   *  button on the right that fires `onClear`. */
  clearable?: boolean;
  onClear?: () => void;
}

const SIZE_CLASS: Record<NonNullable<SearchInputProps["size"]>, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3 py-2 text-xs",
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      size = "md",
      clearable,
      onClear,
      value,
      className = "",
      placeholder,
      ...rest
    },
    ref,
  ) {
    const t = useT();
    const showClear =
      clearable && typeof value === "string" && value.length > 0;
    const iconSize = size === "sm" ? 12 : 14;
    return (
      <div
        className={[
          "group flex items-center gap-2 rounded-lg border bg-panel transition-colors",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft",
          SIZE_CLASS[size],
          className,
        ].join(" ")}
      >
        <Search size={iconSize} className="text-text-meta" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value ?? ""}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-meta"
          {...rest}
        />
        {showClear && (
          <button
            type="button"
            aria-label={t("ui.search.clear_aria")}
            onClick={onClear}
            className="rounded p-0.5 text-text-meta transition-colors hover:bg-panel-alt hover:text-text-primary"
          >
            <X size={iconSize} />
          </button>
        )}
      </div>
    );
  },
);

export default SearchInput;
