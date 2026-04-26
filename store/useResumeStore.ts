import { create } from "zustand";
import setLodash from "lodash.set";
import getLodash from "lodash.get";
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
  
  // Inline editing helpers (applies to activeResumeId)
  updateField: (path: string, value: any) => void;
  addItem: (section: "experience" | "education" | "projects", customPayload?: any) => void;
  removeItem: (section: string, index: number) => void;
  reorderItem: (section: string, from: number, to: number) => void;
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

  // ── Inline Editing Helpers ───────────────────────────────────────────────
  // IMPORTANT: We do NOT call state.upsertResume() here — that's a stale closure.
  // Instead we call get().upsertResume() at call-time to get the live function.
  
  updateField: (path, value) => {
    const { activeResumeId, resumes } = get();
    if (!activeResumeId) {
      console.warn("[updateField] No activeResumeId set. Did you call setActiveResumeId?");
      return;
    }
    
    const activeResume = resumes.find(r => r.id === activeResumeId);
    if (!activeResume) return;
    
    const updated = JSON.parse(JSON.stringify(activeResume));
    setLodash(updated, path, value);
    
    // Call via get() at invocation time — not captured closure
    get().upsertResume(updated);
  },

  addItem: (section, customPayload) => {
    const { activeResumeId, resumes } = get();
    if (!activeResumeId) return;
    
    const activeResume = resumes.find(r => r.id === activeResumeId);
    if (!activeResume) return;
    
    const updated = JSON.parse(JSON.stringify(activeResume));
    const currentArray = getLodash(updated, section) || [];
    
    let payload = customPayload;
    if (!payload) {
      if (section === "experience") {
        payload = { id: crypto.randomUUID(), role: "", company: "", startDate: "", endDate: "", points: "" };
      } else if (section === "education") {
        payload = { id: crypto.randomUUID(), degree: "", school: "", startDate: "", endDate: "" };
      } else if (section === "projects") {
        payload = { id: crypto.randomUUID(), name: "", description: "", link: "" };
      }
    }
    
    setLodash(updated, section, [...currentArray, payload]);
    get().upsertResume(updated);
  },

  removeItem: (section, index) => {
    const { activeResumeId, resumes } = get();
    if (!activeResumeId) return;
    
    const activeResume = resumes.find(r => r.id === activeResumeId);
    if (!activeResume) return;
    
    const updated = JSON.parse(JSON.stringify(activeResume));
    const currentArray: any[] = getLodash(updated, section) || [];
    
    if (Array.isArray(currentArray)) {
      currentArray.splice(index, 1);
      setLodash(updated, section, currentArray);
      get().upsertResume(updated);
    }
  },

  reorderItem: (section, from, to) => {
    const { activeResumeId, resumes } = get();
    if (!activeResumeId) return;
    
    const activeResume = resumes.find(r => r.id === activeResumeId);
    if (!activeResume) return;
    
    const updated = JSON.parse(JSON.stringify(activeResume));
    const currentArray: any[] = getLodash(updated, section) || [];
    
    if (Array.isArray(currentArray)) {
      const newArray = [...currentArray];
      const [movedItem] = newArray.splice(from, 1);
      newArray.splice(to, 0, movedItem);
      
      setLodash(updated, section, newArray);
      get().upsertResume(updated);
    }
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
export const selectUpdateField     = (s: ResumeStore) => s.updateField;
export const selectAddItem         = (s: ResumeStore) => s.addItem;
export const selectRemoveItem      = (s: ResumeStore) => s.removeItem;
export const selectReorderItem     = (s: ResumeStore) => s.reorderItem;
