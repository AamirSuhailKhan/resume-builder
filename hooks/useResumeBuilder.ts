import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  useResumeStore,
  selectIsHydrated,
  selectHydrate,
  selectUpsertResume,
  selectResumes,
} from "@/store/useResumeStore";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";

const AUTOSAVE_DELAY_MS = 1000;

/**
 * useResumeBuilder — encapsulates all builder logic with zero infinite loops.
 *
 * Pattern:
 * - Uses fine-grained Zustand selectors → minimal re-renders
 * - hydrate() is guarded by the store's own isHydrated flag AND a useRef
 * - upsertResume is called once per change (not twice)
 * - setResume reads fresh state via getState() — no stale closures
 *
 * Usage:
 *   const { resume, setResume, saveNow } = useResumeBuilder(resumeId);
 */
export function useResumeBuilder(resumeId: string | null) {
  // ── Fine-grained selectors — each one only re-renders when its slice changes
  const isHydrated  = useResumeStore(selectIsHydrated);
  const hydrate     = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  const resumes     = useResumeStore(selectResumes);

  // ── Hydrate once — the store itself guards against double hydration ────────
  // Empty dep array [] means this runs exactly ONCE per mount, period.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate(); // no-op if already hydrated (store-level guard)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive active resume — memoized, only recomputes when resumes/id change
  const resume: ResumeData | null = useMemo(() => {
    const found = resumes.find((r) => r.id === resumeId);
    return found ? normalizeResume(found) : null;
  }, [resumes, resumeId]);

  // ── Debounce timer ref (not state — doesn't trigger re-renders) ───────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── setResume: optimistic update + debounced persist ─────────────────────
  // upsertResume is a stable Zustand action — safe in useCallback deps
  const setResume = useCallback(
    (updated: ResumeData | ((prev: ResumeData) => ResumeData)) => {
      // Read fresh from store to avoid stale closures
      const current = useResumeStore.getState().resumes.find((r) => r.id === resumeId);
      const next =
        typeof updated === "function"
          ? updated(current ? normalizeResume(current) : normalizeResume({}))
          : updated;

      // Clear previous debounce timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Debounce: wait before persisting to avoid thrashing on every keystroke
      timerRef.current = setTimeout(() => {
        upsertResume(next);
      }, AUTOSAVE_DELAY_MS);

      // Optimistic in-memory update for instant UI feedback (no localStorage write)
      // We do this by calling upsertResume via getState so we bypass the closure
      useResumeStore.setState((state) => {
        const idx = state.resumes.findIndex((r) => r.id === next.id);
        if (idx >= 0) {
          const arr = [...state.resumes];
          arr[idx] = next;
          return { resumes: arr };
        }
        return { resumes: [...state.resumes, next] };
      });
    },
    [resumeId, upsertResume]
  );

  // ── saveNow: force immediate persist (manual save button) ─────────────────
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const current = useResumeStore.getState().resumes.find((r) => r.id === resumeId);
    if (current) upsertResume(current);
  }, [resumeId, upsertResume]);

  // ── Cleanup debounce timer on unmount ────────────────────────────────────
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { resume, setResume, saveNow, isHydrated };
}
