"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { produce } from "immer";
import setLodash from "lodash.set";
import getLodash from "lodash.get";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { isValidResumeId, safeFetch } from "@/lib/utils/safeFetch";

type CollectionSection = "experience" | "education" | "projects";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ResumeStore {
  resumesById: Record<string, ResumeData>;
  resumeIds: string[];
  activeResumeId: string | null;
  isHydrated: boolean;
  hasRehydrated: boolean;
  loading: boolean;
  error: string | null;
  dirtyResumeIds: Record<string, true>;
  saveStatusById: Record<string, SaveStatus>;

  hydrate: () => Promise<void>;
  reset: () => void;
  setActiveResumeId: (id: string | null) => void;
  upsertResume: (resume: ResumeData, fromServer?: boolean) => void;
  deleteResume: (id: string) => Promise<void>;
  createResume: () => Promise<ResumeData | null>;
  markSaving: (id: string) => void;
  markSaved: (id: string, resume?: ResumeData) => void;
  markSaveError: (id: string, message: string) => void;

  updateField: (path: string, value: unknown) => void;
  addItem: (section: CollectionSection, customPayload?: unknown) => void;
  removeItem: (section: string, index: number) => void;
  reorderItem: (section: string, from: number, to: number) => void;
}

type ResumeApiRecord = {
  id?: string;
  title?: string;
  updated_at?: string;
  data?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeResumeRecord(record: unknown): ResumeData | null {
  if (!isRecord(record)) return null;
  const apiRecord = record as ResumeApiRecord;
  const raw = isRecord(apiRecord.data)
    ? { ...apiRecord.data, id: apiRecord.id, title: apiRecord.title ?? apiRecord.data.title, updatedAt: apiRecord.updated_at ?? apiRecord.data.updatedAt }
    : record;

  const normalized = normalizeResume(raw);
  return isValidResumeId(normalized.id) ? normalized : null;
}

function defaultItem(section: CollectionSection) {
  if (section === "experience") {
    return { id: crypto.randomUUID(), role: "", company: "", startDate: "", endDate: "", points: "" };
  }
  if (section === "education") {
    return { id: crypto.randomUUID(), degree: "", school: "", year: "" };
  }
  return { id: crypto.randomUUID(), name: "", description: "", link: "" };
}

function writeResume(state: ResumeStore, resume: ResumeData, dirty: boolean) {
  const normalized = normalizeResume(resume);
  if (!isValidResumeId(normalized.id)) return {};

  const isNew = !state.resumesById[normalized.id];
  const dirtyResumeIds = { ...state.dirtyResumeIds };
  if (dirty) dirtyResumeIds[normalized.id] = true;
  else delete dirtyResumeIds[normalized.id];

  return {
    resumesById: { ...state.resumesById, [normalized.id]: normalized },
    resumeIds: isNew ? [normalized.id, ...state.resumeIds] : state.resumeIds,
    dirtyResumeIds,
    error: null,
  };
}

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      resumesById: {},
      resumeIds: [],
      activeResumeId: null,
      isHydrated: false,
      hasRehydrated: false,
      loading: false,
      error: null,
      dirtyResumeIds: {},
      saveStatusById: {},

      reset: () => {
        set({
          resumesById: {},
          resumeIds: [],
          activeResumeId: null,
          isHydrated: false,
          loading: false,
          error: null,
          dirtyResumeIds: {},
          saveStatusById: {},
        });
      },

      hydrate: async () => {
        if (get().isHydrated || get().loading) return;
        set({ loading: true, error: null });

        try {
          const result = await safeFetch<ResumeApiRecord[]>("/api/v1/resumes?limit=20", { retries: 1 });

          if (!result) {
            set({ loading: false, isHydrated: true });
            return;
          }

          if (result.error) {
            set({ loading: false, error: result.error, isHydrated: true });
            return;
          }

          const serverResumes = result.data ?? [];
          set((state) => {
            const resumesById = { ...state.resumesById };
            const ids = new Set(state.resumeIds.filter(isValidResumeId));

            for (const record of serverResumes) {
              const resume = mergeResumeRecord(record);
              if (!resume) continue;
              const local = resumesById[resume.id];
              const localTs = local?.updatedAt ? Date.parse(local.updatedAt) : 0;
              const serverTs = resume.updatedAt ? Date.parse(resume.updatedAt) : 0;
              if (!local || serverTs >= localTs || !state.dirtyResumeIds[resume.id]) {
                resumesById[resume.id] = resume;
              }
              ids.add(resume.id);
            }

            const activeResumeId = isValidResumeId(state.activeResumeId)
              ? state.activeResumeId
              : ids.values().next().value ?? null;

            return {
              resumesById,
              resumeIds: Array.from(ids),
              activeResumeId,
              loading: false,
              isHydrated: true,
              error: null,
            };
          });
        } catch (error) {
          console.error("[HYDRATE ERROR]", {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          });
          set({ loading: false, isHydrated: true });
        }
      },

      setActiveResumeId: (id) => {
        set({ activeResumeId: isValidResumeId(id) ? id : null });
      },

      upsertResume: (resume, fromServer = false) => {
        set((state) => writeResume(state, resume, !fromServer));
      },

      deleteResume: async (id) => {
        if (!isValidResumeId(id)) {
          set({ error: "Invalid resume ID" });
          return;
        }

        const previous = get();
        set((state) => {
          const resumesById = { ...state.resumesById };
          const dirtyResumeIds = { ...state.dirtyResumeIds };
          const saveStatusById = { ...state.saveStatusById };
          delete resumesById[id];
          delete dirtyResumeIds[id];
          delete saveStatusById[id];
          return {
            resumesById,
            dirtyResumeIds,
            saveStatusById,
            resumeIds: state.resumeIds.filter((resumeId) => resumeId !== id),
            activeResumeId: state.activeResumeId === id ? null : state.activeResumeId,
            error: null,
          };
        });

        const result = await safeFetch(`/api/v1/resumes/${id}`, { method: "DELETE" });
        if (result.error) {
          set({
            resumesById: previous.resumesById,
            resumeIds: previous.resumeIds,
            activeResumeId: previous.activeResumeId,
            dirtyResumeIds: previous.dirtyResumeIds,
            saveStatusById: previous.saveStatusById,
            error: result.error,
          });
        }
      },

      createResume: async () => {
        const now = new Date().toISOString();
        const draft = normalizeResume({
          id: crypto.randomUUID(),
          title: "Untitled Resume",
          createdAt: now,
          updatedAt: now,
        });

        set({ loading: true, error: null });
        const result = await safeFetch<ResumeApiRecord>("/api/v1/resumes", {
          method: "POST",
          body: JSON.stringify(draft),
          retries: 1,
        });

        if (result.error) {
          set({ loading: false, error: result.error });
          return null;
        }

        const created = mergeResumeRecord(result.data) ?? draft;
        set((state) => ({
          ...writeResume(state, created, false),
          activeResumeId: created.id,
          loading: false,
          saveStatusById: { ...state.saveStatusById, [created.id]: "saved" },
        }));

        return created;
      },

      markSaving: (id) => {
        if (!isValidResumeId(id)) return;
        set((state) => ({ saveStatusById: { ...state.saveStatusById, [id]: "saving" } }));
      },

      markSaved: (id, resume) => {
        if (!isValidResumeId(id)) return;
        set((state) => {
          const dirtyResumeIds = { ...state.dirtyResumeIds };
          delete dirtyResumeIds[id];
          const nextResume = resume ? normalizeResume(resume) : state.resumesById[id];
          return {
            resumesById: nextResume ? { ...state.resumesById, [id]: nextResume } : state.resumesById,
            dirtyResumeIds,
            saveStatusById: { ...state.saveStatusById, [id]: "saved" },
            error: null,
          };
        });
      },

      markSaveError: (id, message) => {
        if (!isValidResumeId(id)) return;
        set((state) => ({
          error: message,
          saveStatusById: { ...state.saveStatusById, [id]: "error" },
        }));
      },

      updateField: (path, value) => {
        const activeResumeId = get().activeResumeId;
        if (!isValidResumeId(activeResumeId) || !get().resumesById[activeResumeId]) return;

        set((state) => {
          const current = state.resumesById[activeResumeId];
          if (!current) return state;
          const next = produce(current, (draft) => {
            setLodash(draft, path, value);
            draft.updatedAt = new Date().toISOString();
          });
          return writeResume(state, next, true);
        });
      },

      addItem: (section, customPayload) => {
        const activeResumeId = get().activeResumeId;
        if (!isValidResumeId(activeResumeId) || !get().resumesById[activeResumeId]) return;

        set((state) => {
          const current = state.resumesById[activeResumeId];
          if (!current) return state;
          const next = produce(current, (draft) => {
            const currentArray = getLodash(draft, section);
            const nextArray = Array.isArray(currentArray) ? currentArray : [];
            setLodash(draft, section, [...nextArray, customPayload ?? defaultItem(section)]);
            draft.updatedAt = new Date().toISOString();
          });
          return writeResume(state, next, true);
        });
      },

      removeItem: (section, index) => {
        const activeResumeId = get().activeResumeId;
        if (!isValidResumeId(activeResumeId) || !get().resumesById[activeResumeId]) return;

        set((state) => {
          const current = state.resumesById[activeResumeId];
          if (!current) return state;
          const next = produce(current, (draft) => {
            const arr = getLodash(draft, section);
            if (Array.isArray(arr) && index >= 0 && index < arr.length) {
              setLodash(draft, section, arr.filter((_, i) => i !== index));
              draft.updatedAt = new Date().toISOString();
            }
          });
          return writeResume(state, next, true);
        });
      },

      reorderItem: (section, from, to) => {
        const activeResumeId = get().activeResumeId;
        if (!isValidResumeId(activeResumeId) || !get().resumesById[activeResumeId]) return;

        set((state) => {
          const current = state.resumesById[activeResumeId];
          if (!current) return state;
          const next = produce(current, (draft) => {
            const arr = getLodash(draft, section);
            if (!Array.isArray(arr) || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
            const reordered = [...arr];
            const [item] = reordered.splice(from, 1);
            if (item === undefined) return;
            reordered.splice(to, 0, item);
            setLodash(draft, section, reordered);
            draft.updatedAt = new Date().toISOString();
          });
          return writeResume(state, next, true);
        });
      },
    }),
    {
      name: "resume-builder-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        resumesById: state.resumesById,
        resumeIds: state.resumeIds,
        activeResumeId: state.activeResumeId,
        dirtyResumeIds: state.dirtyResumeIds,
        saveStatusById: state.saveStatusById,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setActiveResumeId(state.activeResumeId);
        useResumeStore.setState({ hasRehydrated: true });
      },
    }
  )
);

export const selectIsHydrated = (s: ResumeStore) => s.isHydrated;
export const selectHasRehydrated = (s: ResumeStore) => s.hasRehydrated;
export const selectLoading = (s: ResumeStore) => s.loading;
export const selectError = (s: ResumeStore) => s.error;
export const selectActiveResumeId = (s: ResumeStore) => s.activeResumeId;
export const selectResumesById = (s: ResumeStore) => s.resumesById;
export const selectResumeIds = (s: ResumeStore) => s.resumeIds;
export const selectActiveResume = (s: ResumeStore) =>
  isValidResumeId(s.activeResumeId) ? s.resumesById[s.activeResumeId] ?? null : null;
export const selectActiveSaveStatus = (s: ResumeStore) =>
  isValidResumeId(s.activeResumeId) ? s.saveStatusById[s.activeResumeId] ?? "idle" : "idle";

export const selectHydrate = (s: ResumeStore) => s.hydrate;
export const selectReset = (s: ResumeStore) => s.reset;
export const selectUpsertResume = (s: ResumeStore) => s.upsertResume;
export const selectDeleteResume = (s: ResumeStore) => s.deleteResume;
export const selectCreateResume = (s: ResumeStore) => s.createResume;
export const selectSetActiveId = (s: ResumeStore) => s.setActiveResumeId;
export const selectUpdateField = (s: ResumeStore) => s.updateField;
export const selectAddItem = (s: ResumeStore) => s.addItem;
export const selectRemoveItem = (s: ResumeStore) => s.removeItem;
export const selectReorderItem = (s: ResumeStore) => s.reorderItem;
