import { create } from "zustand";
import { ResumeData } from "@/lib/storage";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";
import { getInsights as apiGetInsights, saveInsights as apiSaveInsights } from "@/lib/jobInsightsSupabase";
import { computeResumeHash } from "@/lib/jobInsightsHash"; // we will create this helper

/** TTL for cached insights (ms) */
const INSIGHTS_TTL = 10 * 60 * 1000; // 10 minutes

/** Debounce map to avoid duplicate in‑flight requests per resume */
const fetchTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface JobInsightsState {
  insightsByResumeId: Record<string, JobIntelligenceOutput>;
  resumeHashById: Record<string, string>; // stored hash for validation
  loadingById: Record<string, boolean>;
  errorById: Record<string, string | null>;
  lastFetched: Record<string, number>; // epoch ms

  /**
   * Fetch insights for a resume. Handles cache validation, TTL, and hash checks.
   * Returns the latest insights (or null on error).
   */
  fetchInsights: (
    resumeId: string,
    resume: ResumeData,
    jobDescriptions: string[]
  ) => Promise<JobIntelligenceOutput | null>;

  /** Get cached insights (may be stale) */
  getInsights: (resumeId: string) => JobIntelligenceOutput | undefined;

  /** Invalidate cached data for a resume */
  invalidate: (resumeId: string) => void;
}

export const useJobInsightsStore = create<JobInsightsState>()((set, get) => ({
  insightsByResumeId: {},
  resumeHashById: {},
  loadingById: {},
  errorById: {},
  lastFetched: {},

  fetchInsights: async (resumeId, resume, jobDescriptions) => {
    // Compute current hash
    const currentHash = computeResumeHash(resume);
    const now = Date.now();
    const cachedHash = get().resumeHashById[resumeId];
    const cachedAt = get().lastFetched[resumeId] ?? 0;
    const isFresh = now - cachedAt < INSIGHTS_TTL;

    // If we have fresh cached data with matching hash, return it
    if (
      get().insightsByResumeId[resumeId] &&
      cachedHash === currentHash &&
      isFresh
    ) {
      return get().insightsByResumeId[resumeId] ?? null;
    }

    // Debounce duplicate fetches
    if (fetchTimers.has(resumeId)) {
      // A fetch is already scheduled – return a promise that resolves when it completes
      return new Promise<JobIntelligenceOutput | null>((resolve) => {
        const check = () => {
          if (!fetchTimers.has(resumeId)) {
            resolve(get().insightsByResumeId[resumeId] ?? null);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }

    // Mark loading state
    set((s) => ({ loadingById: { ...s.loadingById, [resumeId]: true }, errorById: { ...s.errorById, [resumeId]: null } }));

    // Define async fetch operation
    const performFetch = async () => {
      try {
        // Call API – POST to generate insights
        const response = await fetch("/api/job/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescriptions }),
        });
        if (!response.ok) throw new Error(`API error ${response.status}`);
        const data = await response.json();
        const insights: JobIntelligenceOutput = data.insights;
        // Update store with fresh data
        set((s) => ({
          insightsByResumeId: { ...s.insightsByResumeId, [resumeId]: insights },
          resumeHashById: { ...s.resumeHashById, [resumeId]: currentHash },
          lastFetched: { ...s.lastFetched, [resumeId]: Date.now() },
          loadingById: { ...s.loadingById, [resumeId]: false },
          errorById: { ...s.errorById, [resumeId]: null },
        }));
        return insights;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch job insights";
        console.error("Failed to fetch job insights:", err);
        set((s) => ({ loadingById: { ...s.loadingById, [resumeId]: false }, errorById: { ...s.errorById, [resumeId]: message } }));
        return null;
      } finally {
        fetchTimers.delete(resumeId);
      }
    };

    // Schedule with debounce (400ms)
    const timer = setTimeout(() => {
      void performFetch();
    }, 400);
    fetchTimers.set(resumeId, timer);
    // Return a promise that resolves after the fetch finishes
    return new Promise<JobIntelligenceOutput | null>((resolve) => {
      const poll = () => {
        const state = get();
        if (!state.loadingById[resumeId]) {
          resolve(state.insightsByResumeId[resumeId] ?? null);
        } else {
          setTimeout(poll, 100);
        }
      };
      poll();
    });
  },

  getInsights: (resumeId) => get().insightsByResumeId[resumeId],

  invalidate: (resumeId) => {
    set((s) => {
      const { [resumeId]: _, ...restInsights } = s.insightsByResumeId;
      const { [resumeId]: __, ...restHash } = s.resumeHashById;
      const { [resumeId]: ___, ...restFetched } = s.lastFetched;
      const { [resumeId]: ____, ...restLoading } = s.loadingById;
      const { [resumeId]: _____, ...restError } = s.errorById;
      return {
        insightsByResumeId: restInsights,
        resumeHashById: restHash,
        lastFetched: restFetched,
        loadingById: restLoading,
        errorById: restError,
      };
    });
  },
}));
