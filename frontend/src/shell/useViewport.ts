// Reactive viewport breakpoint hook. The shell switches its
// layout between desktop (rail + 3-pane) and narrow
// (bottom-nav + sheets) at the `MOBILE` breakpoint.
//
// Lives in the shell so module authors can read the same
// breakpoint without re-implementing matchMedia plumbing.

import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  /** ≤ this is the narrow / mobile layout. Matches Tailwind's
   *  `md` breakpoint so utility classes line up with the JS
   *  branches in the shell. */
  MOBILE: 768,
} as const;

export interface Viewport {
  readonly width: number;
  readonly isNarrow: boolean;
}

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(() => snapshot());

  useEffect(() => {
    function onResize() {
      setVp(snapshot());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return vp;
}

function snapshot(): Viewport {
  // Guard for SSR / vitest jsdom where window.innerWidth
  // exists but might be 0 before the first layout pass.
  const width = typeof window !== "undefined" ? window.innerWidth : 1280;
  return { width, isNarrow: width <= BREAKPOINTS.MOBILE };
}
