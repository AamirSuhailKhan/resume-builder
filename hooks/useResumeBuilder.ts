import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  useResumeStore,
  selectIsHydrated,
  selectHydrate,
  selectUpsertResume,
} from "@/store/useResumeStore";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";

const AUTOSAVE_DELAY_MS = 1000;

export function useResumeBuilder(resumeId: string | null) {
  const isHydrated  = useResumeStore(selectIsHydrated);
  const hydrate     = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  
  // Only subscribe to the specific resume to avoid array scanning
  const resumeRaw = useResumeStore(state => resumeId ? state.resumesById[resumeId] : null);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resume: ResumeData | null = useMemo(() => {
    return resumeRaw ? normalizeResume(resumeRaw) : null;
  }, [resumeRaw]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setResume = useCallback(
    (updated: ResumeData | ((prev: ResumeData) => ResumeData)) => {
      if (!resumeId) return;
      const current = useResumeStore.getState().resumesById[resumeId];
      const next =
        typeof updated === "function"
          ? updated(current ? normalizeResume(current) : normalizeResume({}))
          : updated;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        upsertResume(next);
      }, AUTOSAVE_DELAY_MS);

      useResumeStore.setState((state) => ({
        resumesById: {
          ...state.resumesById,
          [next.id]: next,
        }
      }));
    },
    [resumeId, upsertResume]
  );

  const saveNow = useCallback(() => {
    if (!resumeId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const current = useResumeStore.getState().resumesById[resumeId];
    if (current) upsertResume(current);
  }, [resumeId, upsertResume]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { resume, setResume, saveNow, isHydrated };
}
