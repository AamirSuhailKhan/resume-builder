"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { isValidResumeId, safeFetch } from "@/lib/utils/safeFetch";
import { useResumeStore } from "@/store/useResumeStore";

const DEFAULT_DEBOUNCE_MS = 800;
const RETRIES = 2;

type ResumeApiRecord = {
  id?: string;
  data?: Record<string, unknown>;
};

function snapshotResume(resume: ResumeData) {
  return JSON.stringify(normalizeResume(resume));
}

type AutosaveOptions = {
  enabled: boolean;
  debounceMs?: number;
};

export function useResumeAutosave(resumeId: string | null, options: AutosaveOptions) {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const enabled = options.enabled && isValidResumeId(resumeId);
  const resume = useResumeStore((state) => (isValidResumeId(resumeId) ? state.resumesById[resumeId] : null));
  const isDirty = useResumeStore((state) => (isValidResumeId(resumeId) ? Boolean(state.dirtyResumeIds[resumeId]) : false));
  const version = resume?.updatedAt ?? "";

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSavedSnapshotRef = useRef<string>("");
  const inFlightSnapshotRef = useRef<string>("");

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const persist = useCallback(
    async (candidate: ResumeData | null) => {
      if (!enabled || !isValidResumeId(resumeId) || !candidate) return false;

      const normalized = normalizeResume({ ...candidate, id: resumeId });
      const snapshot = snapshotResume(normalized);
      if (snapshot === lastSavedSnapshotRef.current || snapshot === inFlightSnapshotRef.current) {
        return true;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      inFlightSnapshotRef.current = snapshot;
      useResumeStore.getState().markSaving(resumeId);

      const result = await safeFetch<ResumeApiRecord>(`/api/v1/resumes/${resumeId}`, {
        method: "PUT",
        body: snapshot,
        signal: controller.signal,
        retries: RETRIES,
        retryDelayMs: 500,
        skip: !isValidResumeId(resumeId),
        invalidMessage: "Cannot save until the resume is ready.",
      });

      if (controller.signal.aborted) return false;
      inFlightSnapshotRef.current = "";

      if (result.error) {
        useResumeStore.getState().markSaveError(resumeId, "Autosave could not reach the server. Your changes are still saved locally.");
        return false;
      }

      lastSavedSnapshotRef.current = snapshot;
      const saved = result.data?.data ?? result.data ?? normalized;
      useResumeStore.getState().markSaved(resumeId, normalizeResume({ ...saved, id: resumeId }));
      return true;
    },
    [enabled, resumeId]
  );

  const saveNow = useCallback(async () => {
    clearTimer();
    return persist(useResumeStore.getState().resumesById[resumeId ?? ""] ?? null);
  }, [clearTimer, persist, resumeId]);

  useEffect(() => {
    if (!enabled || !resume || !isDirty) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      void persist(resume);
    }, debounceMs);

    return clearTimer;
  }, [clearTimer, debounceMs, enabled, isDirty, persist, resume, version]);

  useEffect(() => {
    return () => {
      clearTimer();
      abortRef.current?.abort();
    };
  }, [clearTimer]);

  return useMemo(
    () => ({
      saveNow,
      canSave: enabled && Boolean(resume),
      isDirty,
    }),
    [enabled, isDirty, resume, saveNow]
  );
}
