import type { Config } from "tailwindcss";

// Phase 83.13.theme — design tokens migrated to the lib package
// `@lordmacu/nexo-microapp-ui-react/styles.css` (CSS vars under
// `--nexo-microapp-*`) + the lib's Tailwind preset (mapping each
// utility-class token onto the var). Override any single token
// in `src/styles/index.css` with:
//
//   :root { --nexo-microapp-accent: #25D366; }
//
// Switch to dark mode at runtime:
//
//   document.documentElement.dataset.theme = "dark";
//
// Token values pre-83.13.theme migration (kept here for archival
// reference; reproduced verbatim in the lib's
// `src/styles.css` default block). Do NOT re-introduce them in
// `theme.extend.colors` — the lib preset already maps each
// utility class onto `var(--nexo-microapp-*)`.
//
// Legacy `wa-*` aliases removed in Phase 3. Every consumer
// migrated to the semantic `tokens` namespace via the bulk
// sed sweep + prettier reformat. Re-introduce here only if a
// future operator-themable surface needs to opt out of the
// shared palette (and even then, prefer a per-module
// override instead of resurrecting the WhatsApp-specific
// names).

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // Phase 83.13 MVP — sibling lib `@lordmacu/nexo-microapp-ui-react`
    // is consumed via vite alias pointing at its `src/`. Tailwind's
    // JIT must scan those files so utility classes used inline
    // (`bg-accent`, `text-text-primary`, …) are not purged from the
    // compiled CSS bundle.
    "../../nexo-rs-microapp-ui-react/src/**/*.{ts,tsx}",
  ],
  // Phase 83.13.theme — colors come from the lib's preset which
  // maps utility classes (`bg-accent`, …) to `var(--nexo-microapp-*)`.
  // The local `tokens` const is no longer wired into theme.extend.colors;
  // its values are now lib defaults defined in
  // node_modules/@lordmacu/nexo-microapp-ui-react/src/styles.css.
  // Override individual tokens by re-declaring them in
  // src/styles/index.css after the lib import.
  presets: [require("@lordmacu/nexo-microapp-ui-react/tailwind.preset")],
  theme: {
    extend: {
      borderColor: {
        // Default border on every `.border` class lands on the
        // semantic token without callers needing the prefix.
        DEFAULT: "var(--nexo-microapp-border)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
