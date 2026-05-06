import { useCallback, useEffect, useMemo, useRef } from "react";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { isValidResumeId } from "@/lib/utils/safeFetch";
import {
  useResumeStore,
  selectHydrate,
  selectIsHydrated,
  selectUpsertResume,
} from "@/store/useResumeStore";
import { useResumeAutosave } from "@/hooks/useResumeAutosave";

export function useResumeBuilder(resumeId: string | null) {
  const isHydrated = useResumeStore(selectIsHydrated);
  const hydrate = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  const resumeRaw = useResumeStore((state) => (isValidResumeId(resumeId) ? state.resumesById[resumeId] : null));
  const autosave = useResumeAutosave(resumeId, { enabled: isHydrated && isValidResumeId(resumeId) });

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void hydrate();
  }, [hydrate]);

  const resume: ResumeData | null = useMemo(() => (resumeRaw ? normalizeResume(resumeRaw) : null), [resumeRaw]);

  const setResume = useCallback(
    (updated: ResumeData | ((prev: ResumeData) => ResumeData)) => {
      if (!isValidResumeId(resumeId)) return;
      const current = useResumeStore.getState().resumesById[resumeId];
      if (!current) return;

      const next = typeof updated === "function" ? updated(normalizeResume(current)) : updated;
      upsertResume({ ...normalizeResume(next), id: resumeId });
    },
    [resumeId, upsertResume]
  );

  return {
    resume,
    setResume,
    saveNow: autosave.saveNow,
    isHydrated,
    isDirty: autosave.isDirty,
  };
}
