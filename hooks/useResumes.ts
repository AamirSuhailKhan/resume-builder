/**
 * ⚠️ DEPRECATED — DO NOT USE
 *
 * This file is intentionally replaced by the Zustand store.
 * Use useResumeStore from @/store/useResumeStore instead.
 *
 * All imports of useResumes() will throw at module-load time to
 * surface any accidental usage immediately during development.
 */

export function useResumes(): never {
  throw new Error(
    "[useResumes] DEPRECATED: Use `useResumeStore` from `@/store/useResumeStore` instead.\n" +
    "Replace: const { resumes } = useResumes()\n" +
    "With:    const resumes = useResumeStore(s => s.resumes)"
  );
}
