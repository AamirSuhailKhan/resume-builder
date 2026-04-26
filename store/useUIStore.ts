import { create } from "zustand";

/**
 * useUIStore — Separate store for all transient UI state.
 *
 * WHY THIS EXISTS:
 * If builder UI state (isImproving, isHistoryOpen, etc.) lived in useResumeStore,
 * every button click would cause ALL data-subscribed components (ModernTemplate,
 * ExperienceArray, etc.) to re-render. By splitting it into its own store, only
 * components that explicitly subscribe to UI state will re-render.
 *
 * Data components (templates) are completely isolated from UI flicker.
 */

interface UIStore {
  // Builder page UI
  isImproving: boolean;
  isHistoryOpen: boolean;
  isGeneratingPDF: boolean;
  currentTemplate: "modern" | "minimal" | "professional";

  setIsImproving: (v: boolean) => void;
  setIsHistoryOpen: (v: boolean) => void;
  setIsGeneratingPDF: (v: boolean) => void;
  setCurrentTemplate: (t: "modern" | "minimal" | "professional") => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  isImproving: false,
  isHistoryOpen: false,
  isGeneratingPDF: false,
  currentTemplate: "modern",

  setIsImproving: (v) => set({ isImproving: v }),
  setIsHistoryOpen: (v) => set({ isHistoryOpen: v }),
  setIsGeneratingPDF: (v) => set({ isGeneratingPDF: v }),
  setCurrentTemplate: (t) => set({ currentTemplate: t }),
}));

// Granular selectors — each component subscribes only to its slice
export const selectIsImproving      = (s: UIStore) => s.isImproving;
export const selectIsHistoryOpen    = (s: UIStore) => s.isHistoryOpen;
export const selectIsGeneratingPDF  = (s: UIStore) => s.isGeneratingPDF;
export const selectCurrentTemplate  = (s: UIStore) => s.currentTemplate;
export const selectSetIsImproving   = (s: UIStore) => s.setIsImproving;
export const selectSetIsHistoryOpen = (s: UIStore) => s.setIsHistoryOpen;
export const selectSetIsGeneratingPDF = (s: UIStore) => s.setIsGeneratingPDF;
export const selectSetCurrentTemplate = (s: UIStore) => s.setCurrentTemplate;
