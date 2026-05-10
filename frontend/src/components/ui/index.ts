// Re-export barrel for the shared `ui/` primitives.
//
// **Doctrine:** every primitive here is module-agnostic.
// It MUST NOT import from `modules/*`. If you find yourself
// reaching for a CRM concept (lead, seller, draft) from
// inside a `ui/` component, you're modeling at the wrong
// layer — keep that in the consuming module's `components/`
// directory.
//
// **Color tokens.** All visual treatments (backgrounds,
// borders, text, badges, buttons, banners, …) MUST resolve
// to a token defined in `tailwind.config.ts`. Direct Tailwind
// shade tokens (`bg-slate-50`, `text-indigo-600`, …) are
// banned in this layer — use `panel`, `accent`,
// `text-secondary`, etc. so the operator's themable surface
// (M22 follow-up) flips with one config change.
//
// See `DESIGN.md` (sibling file) for the full token map +
// component contract.

export { default as Avatar } from "./Avatar";
export { default as Badge } from "./Badge";
export { default as Banner } from "./Banner";
export { default as Bubble } from "./Bubble";
// Phase 83.13 MVP — Button + EmptyState moved to
// `@lordmacu/nexo-microapp-ui-react`. Re-export from here so
// existing barrel consumers (`import { Button } from
// "../components/ui"`) keep resolving without a code edit.
export { Button, EmptyStatePrimitive as EmptyState } from "@lordmacu/nexo-microapp-ui-react";
export { default as Card } from "./Card";
export { default as Checkbox } from "./Checkbox";
export { default as Chip } from "./Chip";
export { default as Code } from "./Code";
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as Field } from "./Field";
export { default as Header } from "./Header";
export { default as Heading } from "./Heading";
export { default as Input } from "./Input";
export { default as KeyValue } from "./KeyValue";
export { default as LocaleSwitcher } from "./LocaleSwitcher";
export { default as Menu } from "./Menu";
export type { MenuItem } from "./Menu";
export { default as Modal } from "./Modal";
export { default as ModuleHeader } from "./ModuleHeader";
export { default as RadioCard } from "./RadioCard";
export { default as RadioGroup } from "./Radio";
export type { RadioOption } from "./Radio";
export { default as SearchInput } from "./SearchInput";
export { default as Section } from "./Section";
export { default as Select } from "./Select";
export { default as SidebarList } from "./SidebarList";
export { default as SidebarListItem } from "./SidebarListItem";
export { default as Spinner } from "./Spinner";
export { default as Stat } from "./Stat";
export { default as StatusDot } from "./StatusDot";
export { default as Stepper } from "./Stepper";
export { default as Tabs } from "./Tabs";
export type { TabItem } from "./Tabs";
export { default as Text } from "./Text";
export { default as Textarea } from "./Textarea";
