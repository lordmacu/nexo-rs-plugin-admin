// Phase 90.3.14 — skills store. List + select + delete. Body
// fetched lazily on selection (skip cost on a daemon hosting
// hundreds of skills).

import { create } from "zustand";

import {
  deleteSkill,
  getSkill,
  listSkills,
  type SkillRecord,
  type SkillSummary,
} from "../api/skills";

interface SkillsState {
  skills: SkillSummary[];
  selected: SkillRecord | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  reload: () => Promise<void>;
  select: (name: string) => Promise<void>;
  clearSelection: () => void;
  remove: (name: string) => Promise<void>;
}

export const useSkills = create<SkillsState>((set, get) => ({
  skills: [],
  selected: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await listSkills();
      set({ skills: r.skills, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },

  select: async (name) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const r = await getSkill(name);
      set({ selected: r.skill, isLoadingDetail: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoadingDetail: false,
      });
    }
  },

  clearSelection: () => set({ selected: null }),

  remove: async (name) => {
    try {
      await deleteSkill(name);
      const skills = get().skills.filter((s) => s.name !== name);
      const selected =
        get().selected?.name === name ? null : get().selected;
      set({ skills, selected });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },
}));
