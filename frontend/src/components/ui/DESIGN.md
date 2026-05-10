# Design system — nexo-rs admin plugin

Single source of truth for visual styling across every
module (chats / marketing / agents / pollers / future).
Every colour, typography choice, and reusable widget lives
in one of two places:

1. **`tailwind.config.ts`** — palette tokens
2. **`src/components/ui/`** — composed primitives

If you reach for an inline `bg-slate-200` or
`text-emerald-600` outside this directory, ask yourself
whether it should map to a token here instead. The answer
is almost always yes.

---

## Where colours live

`tailwind.config.ts` carries every visual token under one
`tokens` constant. Editing a hex there flips the look of
the entire platform — no per-module overrides needed.

```ts
// tailwind.config.ts
const tokens = {
  // Surfaces — flat backgrounds, ordered light → emphasis.
  surface: "#f8fafc",          // root canvas
  panel: "#ffffff",            // cards, conversation pane
  panelAlt: "#f1f5f9",         // sidebar
  panelHover: "#f8fafc",       // list-item hover

  // Borders / separators.
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  // Brand accent.
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentSoft: "#e0e7ff",

  // Text — three-tier contrast for hierarchy.
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMeta: "#94a3b8",

  // Conversation bubbles.
  bubbleIn: "#ffffff",
  bubbleOut: "#e0f2fe",

  // Status semantics.
  success: "#10b981",
  successSoft: "#d1fae5",
  warning: "#f59e0b",
  warningSoft: "#fef3c7",
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  info: "#0ea5e9",
  infoSoft: "#e0f2fe",
};
```

Tailwind class form:

| Token | Background | Text | Border | Ring |
|-------|------------|------|--------|------|
| surface | `bg-surface` | — | — | — |
| panel | `bg-panel` | — | — | — |
| panel-alt | `bg-panel-alt` | — | — | — |
| panel-hover | `bg-panel-hover` | — | — | — |
| border | — | — | `border` | `ring-border` |
| border-strong | — | — | `border-border-strong` | — |
| accent | `bg-accent` | `text-accent` | `border-accent` | `ring-accent` |
| accent-soft | `bg-accent-soft` | — | — | — |
| text-primary | — | `text-text-primary` | — | — |
| text-secondary | — | `text-text-secondary` | — | — |
| text-meta | — | `text-text-meta` | — | — |
| bubble-in | `bg-bubble-in` | — | — | — |
| bubble-out | `bg-bubble-out` | — | — | — |
| success | `bg-success` | `text-success` | — | — |
| success-soft | `bg-success-soft` | — | — | — |
| warning / warning-soft | identical pattern | | | |
| danger / danger-soft | identical pattern | | | |
| info / info-soft | identical pattern | | | |

The font family lives in the same config — `Inter` with
`system-ui` fallback.

### How to retheme

Want every button to be teal instead of indigo? Change
two hex values:

```ts
accent: "#14b8a6",      // teal-500
accentHover: "#0f766e", // teal-700
accentSoft: "#ccfbf1",  // teal-100
```

That's it. Every button, link, focus ring, and accent halo
across the platform flips.

---

## Component primitives

Every primitive is module-agnostic. None import from
`modules/*`. None know about leads, sellers, drafts, or
chats — the domain shape lives in `components/` of the
consuming module.

### Layout

| Component | Purpose |
|-----------|---------|
| `<Card>` | Content container — border + bg + pad. Three variants (default / raised / subtle), three padding presets. |
| `<EmptyState>` | Hero shell for empty surfaces — icon halo + title + body + actions. |
| `<Header>` | Conversation / panel header — avatar + title + subtitle + actions row. |
| `<Modal>` | Overlay — Esc closes, three size presets, optional title bar. |
| `<Section>` | Title + icon + trailing slot + body — the standard panel grouping. |
| `<SidebarList>` | Scrollable left rail — header / scroll body / footer slots. |
| `<SidebarListItem>` | Single row inside a `SidebarList` — avatar + title + subtitle + active state. |
| `<Stepper>` | Multi-step indicator — completed (check) / active / pending. |

### Form controls

| Component | Purpose |
|-----------|---------|
| `<Field>` | Label + hint shell. Wrap any input. Optional required asterisk. |
| `<Input>` | Native `<input>` with token styling. `size`, `invalid`, `mono`. |
| `<Select>` | Native `<select>` with token styling. `size`, `invalid`. |
| `<Textarea>` | Native `<textarea>` with token styling. `invalid`, `mono`. |
| `<Checkbox>` | Native `<input type="checkbox">` + label slot + optional hint. `invalid`. |
| `<Button>` | 4 variants (primary / secondary / ghost / danger), 3 sizes, `busy` spinner, `leadingIcon`, `trailingIcon`. |

### Navigation

| Component | Purpose |
|-----------|---------|
| `<Tabs>` | Horizontal tab strip + content slot. Caller owns active state; supports `disabled` per item + trailing slots (counts / badges). |

### Display

| Component | Purpose |
|-----------|---------|
| `<Avatar>` | Initials disc — djb2 colour hash on a stable seed. Three sizes. |
| `<Badge>` | Inline pill — 6 tones (neutral / accent / success / warning / danger / info). |
| `<Banner>` | Full-width status row — 4 tones, optional icon + actions. |
| `<Bubble>` | Conversation message — `direction` (in/out), optional `senderLabel`, `footer`, `accentTone`. |
| `<Code>` | Inline / block monospace pill — env-var names, IDs, JSON snippets. |
| `<Heading>` | Typography. `level` (1-6) + `size` (xs/sm/md/lg/xl) decoupled. |
| `<Spinner>` | Loading indicator — three sizes, four tones (current / accent / meta / danger). |
| `<Stat>` | Dashboard tile — icon + count + label + tone. |
| `<Text>` | Inline / paragraph text — `tone`, `size`, `mono`, `truncate`, `strong`. |

### Conventions

- **Sizes**: `sm` / `md` / `lg`. `md` is always the default.
- **Tones**: `neutral` / `accent` / `success` / `warning` / `danger` / `info`.
  Some primitives only accept a subset — see each file's
  prop interface.
- **Slots**: when a component carries multiple insertion
  points, name them by purpose (`actions`, `trailing`,
  `icon`) — never by position.
- **Refs**: form controls (`<Button>`, `<Input>`,
  `<Select>`, `<Textarea>`) forward refs so callers can
  focus / measure them. Layout primitives don't.

---

## Adding a new primitive

1. **Need check.** Is this one consumer's specific need or
   a pattern repeated across modules? If only one consumer,
   keep it in that module's `components/`.
2. **Token check.** Every colour MUST resolve to a token
   in `tailwind.config.ts`. Don't introduce raw shade
   tokens (`bg-slate-100`) — extend the token map first.
3. **Slot vs prop.** Prefer slots for multi-purpose
   sections (`actions`, `trailing`); props for visual
   variants (`tone`, `size`).
4. **Test.** Add specs to
   `frontend/tests/components/ui-primitives.test.tsx`
   covering the public surface (props → rendered shape).
5. **Doc.** Add a row to the table above + a one-liner
   in the file's leading doc comment.

---

## What NOT to do

- ❌ Inline `bg-slate-X`, `text-emerald-Y`, `ring-indigo-Z`
  in module code. Use a token.
- ❌ Re-define `Section`, `Field`, `Stat`, `Stepper`, …
  inside a module. Import from `ui/`.
- ❌ Author new modal frames from `<div className="fixed
  inset-0 z-50 ...">`. Use `<Modal>`.
- ❌ Custom button spans with hand-rolled hover states.
  Use `<Button>`.
- ❌ `<Loader2 className="animate-spin">` for a loading
  indicator. Use `<Spinner>`.
- ❌ Bare `<input type="checkbox">` for an inline toggle.
  Use `<Checkbox>` (it owns the label slot too).
- ❌ Reach into `tailwind.config.ts` from runtime code.
  The config is build-time only; runtime reads tokens by
  class name.

---

## Migration recipe (Phase 6 backlog)

When you find an inline element that should adopt a
primitive, follow this template.

| Old | New |
|-----|-----|
| `<Loader2 className="animate-spin" size={N} />` | `<Spinner size="sm \| md \| lg" />` |
| `<button type="button" className="... bg-accent ... text-white ...">` | `<Button variant="primary">` |
| `<button type="button" className="... border ... bg-panel ...">` | `<Button variant="secondary">` |
| `<button type="button" className="... text-text-secondary hover:bg-panel-alt ...">` | `<Button variant="ghost">` |
| `<input type="text" className="...">` | `<Input>` |
| `<select className="...">` | `<Select>` |
| `<textarea className="...">` | `<Textarea>` |
| `<input type="checkbox" />` | `<Checkbox>` |
| `<code>X</code>` (single-token) | `<Code>X</Code>` |
| `<pre><code>...</code></pre>` (block) | `<Code variant="block">...</Code>` |
| `<span className="...rounded-full bg-X-soft...">tag</span>` | `<Badge tone="X">tag</Badge>` |
| `<div className="...rounded bg-warning-soft border-warning/30...">message</div>` | `<Banner tone="warning">message</Banner>` |
| `<div className="...rounded-lg border bg-panel p-3">body</div>` | `<Card>body</Card>` |
| `<h2 className="text-lg font-semibold tracking-tight">Title</h2>` | `<Heading level={2} size="lg">Title</Heading>` |

Adoption status as of this writing:

- **Adopted** (poster-child files): `OperatorNotes.tsx`,
  `FollowupOverride.tsx`, `MarketingWizard.tsx`. Visual
  identical to pre-migration; tests still green.
- **Phase 6 partial — Spinner**: bulk-migrated across 7
  files (KnowledgeUploader, PairingModal,
  LlmInstanceCreateModal, Agents, PersonaEditor,
  StepPairing, StepAgent). Zero `Loader2` imports remain
  outside `ui/Spinner.tsx` and `ui/Button.tsx` (where the
  primitives use it internally).
- **Backlog (~218 sites)**: native `<button>` migration to
  `<Button>` — top offenders are `SettingsView` (27),
  `Agents.tsx` (18), `ChatListItem.tsx` (17). Each site
  has a unique className that needs per-call analysis to
  pick the correct variant. Best done incrementally as
  files are touched for other reasons.
- **Backlog (~25 sites)**: native `<input type="checkbox">`
  → `<Checkbox>`. Similar pattern.
- **Backlog (~36 sites)**: inline `<code>` → `<Code>`.
  Cosmetic only — visual already consistent because all
  inline `<code>` styles share tokens.
