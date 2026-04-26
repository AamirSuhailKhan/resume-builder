"use client";

import { useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useResumeStore,
  selectResumesById,
  selectResumeIds,
  selectIsHydrated,
  selectHydrate,
  selectDeleteResume,
  selectCreateResume,
} from "@/store/useResumeStore";

export default function DashboardPage() {
  const router = useRouter();

  // ── Fine-grained selectors — component only re-renders when its slice changes
  const resumesById  = useResumeStore(selectResumesById);
  const resumeIds    = useResumeStore(selectResumeIds);
  const isHydrated   = useResumeStore(selectIsHydrated);
  const hydrate      = useResumeStore(selectHydrate);
  const deleteResume = useResumeStore(selectDeleteResume);
  const createResume = useResumeStore(selectCreateResume);

  // ── ONE-SHOT hydration — useRef guard prevents any possible double-call ───
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ordered list via resumeIds: no Object.values, stable between renders when
  // nothing is added/deleted. Sort by updatedAt only when ids/dict change.
  const sorted = useMemo(
    () =>
      resumeIds
        .map((id) => resumesById[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [resumeIds, resumesById]
  );

  // ── Stable callbacks ───────────────────────────────────────────────────────
  const handleCreateNew = useCallback(() => {
    const newResume = createResume();
    router.push(`/builder?id=${newResume.id}`);
  }, [createResume, router]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteResume(id);
    },
    [deleteResume]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Resumes</h1>
          <p className="text-gray-500 mt-1">Manage and edit your professional resumes.</p>
        </div>
        <Button onClick={handleCreateNew} className="shadow-sm shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Create New Resume
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((resume) => (
          <div
            key={resume.id}
            className="group relative h-[240px] rounded-2xl border border-gray-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center border-b border-gray-100">
              <FileText className="h-8 w-8 text-indigo-300 mb-3" />
              <h3 className="font-bold text-gray-900 text-lg truncate w-full text-center">
                {resume.title || "Untitled Resume"}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Last updated:{" "}
                {resume.updatedAt
                  ? new Date(resume.updatedAt).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
            <div className="p-4 flex items-center justify-between bg-white">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(resume.id)}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link href={`/builder?id=${resume.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4 text-lg font-medium">
              You don&apos;t have any resumes yet.
            </p>
            <Button onClick={handleCreateNew} variant="outline">
              Create your first resume
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
