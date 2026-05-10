// M7.cmdk — open/close state for the command palette modal.
// Pure transient UI state; no persistence. Lives in its own
// store so any component can `useCmdk.getState().toggle()` (e.g.
// future help affordances in the chat header).

import { create } from "zustand";

interface CmdkState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCmdk = create<CmdkState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
