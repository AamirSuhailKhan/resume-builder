import { create } from "zustand";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { storage } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeStore {
  resumes: ResumeData[];
  activeResumeId: string | null;
  isHydrated: boolean;

  // Actions — all stable (same reference every render)
  hydrate: () => void;
  setActiveResumeId: (id: string | null) => void;
  upsertResume: (resume: ResumeData) => void;
  deleteResume: (id: string) => void;
  createResume: () => ResumeData;
}

// ─── Store ────────────────────────────────────────────────────────────────────
// NOTE: We intentionally do NOT use the `persist` middleware here.
// Zustand persist conflicts with our custom localStorage utility (storage.ts)
// and causes double-writes, hydration mismatches, and infinite re-render loops.
// All persistence is handled explicitly inside store actions via storage.ts.

export const useResumeStore = create<ResumeStore>()((set, get) => ({
  resumes: [],
  activeResumeId: null,
  isHydrated: false,

  // ── hydrate: call ONCE on mount — reads from localStorage into store ─────
  hydrate: () => {
    // Guard: never run twice
    if (get().isHydrated) return;
    const loaded = storage.getResumes(); // already normalizes each item
    set({ resumes: loaded, isHydrated: true });
  },

  setActiveResumeId: (id) => set({ activeResumeId: id }),

  // ── upsertResume: normalise → persist → update store ────────────────────
  upsertResume: (resume) => {
    const normalized = normalizeResume(resume);
    normalized.updatedAt = new Date().toISOString();

    // Write to localStorage (source of truth on disk)
    storage.saveResume(normalized);
    storage.saveVersion(normalized);

    // Update in-memory store (single functional update to avoid stale state)
    set((state) => {
      const idx = state.resumes.findIndex((r) => r.id === normalized.id);
      if (idx >= 0) {
        const next = [...state.resumes];
        next[idx] = normalized;
        return { resumes: next };
      }
      return { resumes: [...state.resumes, normalized] };
    });
  },

  // ── deleteResume ─────────────────────────────────────────────────────────
  deleteResume: (id) => {
    storage.deleteResume(id);
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
      activeResumeId: state.activeResumeId === id ? null : state.activeResumeId,
    }));
  },

  // ── createResume ─────────────────────────────────────────────────────────
  createResume: () => {
    const newResume = storage.createEmptyResume();
    storage.saveResume(newResume);
    set((state) => ({
      resumes: [...state.resumes, newResume],
      activeResumeId: newResume.id,
    }));
    return newResume;
  },
}));

// ─── Selector helpers (use these in components to prevent extra re-renders) ──
export const selectResumes         = (s: ResumeStore) => s.resumes;
export const selectIsHydrated      = (s: ResumeStore) => s.isHydrated;
export const selectActiveResumeId  = (s: ResumeStore) => s.activeResumeId;
export const selectHydrate         = (s: ResumeStore) => s.hydrate;
export const selectUpsertResume    = (s: ResumeStore) => s.upsertResume;
export const selectDeleteResume    = (s: ResumeStore) => s.deleteResume;
export const selectCreateResume    = (s: ResumeStore) => s.createResume;
export const selectSetActiveId     = (s: ResumeStore) => s.setActiveResumeId;
