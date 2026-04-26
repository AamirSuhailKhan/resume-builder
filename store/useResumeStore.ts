import { create } from "zustand";
import { produce } from "immer";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { storage } from "@/lib/storage";
import setLodash from "lodash.set";
import getLodash from "lodash.get";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeStore {
  // Normalized shape: O(1) lookup by ID, separate array for ordered iteration.
  // resumeIds controls display order without needing Object.values() anywhere.
  resumesById: Record<string, ResumeData>;
  resumeIds: string[];
  activeResumeId: string | null;
  isHydrated: boolean;

  // Actions
  hydrate: () => void;
  setActiveResumeId: (id: string | null) => void;
  upsertResume: (resume: ResumeData) => void;
  deleteResume: (id: string) => void;
  createResume: () => ResumeData;

  // Deep Immutable Updates (Immer, applied only to the active resume)
  updateField: (path: string, value: any) => void;
  addItem: (section: "experience" | "education" | "projects", customPayload?: any) => void;
  removeItem: (section: string, index: number) => void;
  reorderItem: (section: string, from: number, to: number) => void;
}

// ─── Debounce System ─────────────────────────────────────────────────────────

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedPersist(resume: ResumeData, delay = 400) {
  if (persistTimers.has(resume.id)) {
    clearTimeout(persistTimers.get(resume.id)!);
  }
  
  // Safe deep clone before passing to side-effects/storage to prevent any mutation leakage
  const cloned = JSON.parse(JSON.stringify(resume));
  
  persistTimers.set(
    resume.id,
    setTimeout(() => {
      storage.saveResume(cloned);
      storage.saveVersion(cloned);
      persistTimers.delete(resume.id);
    }, delay)
  );
}

export function cleanupPersistTimers() {
  persistTimers.forEach(clearTimeout);
  persistTimers.clear();
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useResumeStore = create<ResumeStore>()((set, get) => ({
  resumesById: {},
  resumeIds: [],
  activeResumeId: null,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const loaded = storage.getResumes();
    const resumesById: Record<string, ResumeData> = {};
    const resumeIds: string[] = [];
    for (const r of loaded) {
      resumesById[r.id] = r;
      resumeIds.push(r.id);
    }
    set({ resumesById, resumeIds, isHydrated: true });
  },

  setActiveResumeId: (id) => set({ activeResumeId: id }),

  upsertResume: (resume) => {
    const normalized = normalizeResume(resume);
    normalized.updatedAt = new Date().toISOString();

    set((state) => {
      const isNew = !state.resumesById[normalized.id];
      return {
        resumesById: {
          ...state.resumesById,
          [normalized.id]: normalized,
        },
        // Only grow resumeIds if this is a truly new resume
        resumeIds: isNew ? [...state.resumeIds, normalized.id] : state.resumeIds,
      };
    });

    debouncedPersist(normalized);
  },

  deleteResume: (id) => {
    storage.deleteResume(id);
    set((state) => {
      const next = { ...state.resumesById };
      delete next[id];
      return {
        resumesById: next,
        resumeIds: state.resumeIds.filter((rid) => rid !== id),
        activeResumeId: state.activeResumeId === id ? null : state.activeResumeId,
      };
    });
  },

  createResume: () => {
    const newResume = storage.createEmptyResume();
    storage.saveResume(newResume);
    set((state) => ({
      resumesById: {
        ...state.resumesById,
        [newResume.id]: newResume,
      },
      resumeIds: [...state.resumeIds, newResume.id],
      activeResumeId: newResume.id,
    }));
    return newResume;
  },

  // ── IMMUTABLE DEEP UPDATES (Immer, applied only to active resume) ──────────

  updateField: (path, value) => {
    const { activeResumeId } = get();
    if (!activeResumeId) return;

    set((state) => ({
      resumesById: {
        ...state.resumesById,
        [activeResumeId]: produce(state.resumesById[activeResumeId], (draft) => {
          setLodash(draft, path, value);
          draft.updatedAt = new Date().toISOString();
        }),
      },
    }));

    debouncedPersist(get().resumesById[activeResumeId]);
  },

  addItem: (section, customPayload) => {
    const { activeResumeId } = get();
    if (!activeResumeId) return;

    set((state) => ({
      resumesById: {
        ...state.resumesById,
        [activeResumeId]: produce(state.resumesById[activeResumeId], (draft) => {
          const currentArray = getLodash(draft, section) || [];
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
          setLodash(draft, section, [...currentArray, payload]);
          draft.updatedAt = new Date().toISOString();
        }),
      },
    }));

    debouncedPersist(get().resumesById[activeResumeId]);
  },

  removeItem: (section, index) => {
    const { activeResumeId } = get();
    if (!activeResumeId) return;

    set((state) => ({
      resumesById: {
        ...state.resumesById,
        [activeResumeId]: produce(state.resumesById[activeResumeId], (draft) => {
          const arr: any[] = getLodash(draft, section) || [];
          if (Array.isArray(arr)) {
            arr.splice(index, 1);
            setLodash(draft, section, arr);
          }
          draft.updatedAt = new Date().toISOString();
        }),
      },
    }));

    debouncedPersist(get().resumesById[activeResumeId]);
  },

  reorderItem: (section, from, to) => {
    const { activeResumeId } = get();
    if (!activeResumeId) return;

    set((state) => ({
      resumesById: {
        ...state.resumesById,
        [activeResumeId]: produce(state.resumesById[activeResumeId], (draft) => {
          const arr: any[] = getLodash(draft, section) || [];
          if (Array.isArray(arr)) {
            const [item] = arr.splice(from, 1);
            arr.splice(to, 0, item);
            setLodash(draft, section, arr);
          }
          draft.updatedAt = new Date().toISOString();
        }),
      },
    }));

    debouncedPersist(get().resumesById[activeResumeId]);
  },
}));

// ─── Selectors ───────────────────────────────────────────────────────────────
// All selectors return primitive values or stable references — no new objects/arrays created.

export const selectIsHydrated     = (s: ResumeStore) => s.isHydrated;
export const selectActiveResumeId = (s: ResumeStore) => s.activeResumeId;
export const selectResumesById    = (s: ResumeStore) => s.resumesById;

// resumeIds is a stable reference that only changes on create/delete — safe to subscribe to
export const selectResumeIds      = (s: ResumeStore) => s.resumeIds;

// O(1) active resume lookup — returns same reference if resume hasn't changed
export const selectActiveResume   = (s: ResumeStore) =>
  s.activeResumeId ? s.resumesById[s.activeResumeId] : null;

export const selectHydrate        = (s: ResumeStore) => s.hydrate;
export const selectUpsertResume   = (s: ResumeStore) => s.upsertResume;
export const selectDeleteResume   = (s: ResumeStore) => s.deleteResume;
export const selectCreateResume   = (s: ResumeStore) => s.createResume;
export const selectSetActiveId    = (s: ResumeStore) => s.setActiveResumeId;
export const selectUpdateField    = (s: ResumeStore) => s.updateField;
export const selectAddItem        = (s: ResumeStore) => s.addItem;
export const selectRemoveItem     = (s: ResumeStore) => s.removeItem;
export const selectReorderItem    = (s: ResumeStore) => s.reorderItem;
